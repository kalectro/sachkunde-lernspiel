#!/usr/bin/env node
/**
 * Vamos Estudar — Blindtest für neue Prüfungen (Ersatz für grade-questions, das vamos-estudar ausschließt)
 *
 *   node vamos-estudar/test/blindtest.mjs build <examId> <out.questions.json>
 *       → Fragen OHNE Lösungen (MC-Optionen und Sort-Items gemischt) für einen Subagenten
 *   node vamos-estudar/test/blindtest.mjs grade <examId> <answers.json>
 *       → wertet {"<id>": {"answer": …, "note": "…"}} gegen die Daten aus; Typ-Antworten mit der
 *         echten answerCorrect aus index.html (kein Nachbau, der driften könnte)
 *
 * Ablauf und Subagent-Briefing: vamos-estudar/CLAUDE.md → „Fragen aktualisieren“.
 * Die questions-/answers-Dateien gehören in den Scratchpad, nicht ins Repo.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [, , cmd, examId, file] = process.argv;
if (!['build', 'grade'].includes(cmd) || !examId || !file) {
  console.error('Usage: blindtest.mjs build|grade <examId> <file>');
  process.exit(2);
}

let exam;
for (const f of readdirSync(join(root, 'data')).filter(f => f.endsWith('.json'))) {
  const e = JSON.parse(readFileSync(join(root, 'data', f), 'utf8')).exams.find(x => x.id === examId);
  if (e) exam = e;
}
if (!exam) { console.error(`exam ${examId} not found in data/*.json`); process.exit(1); }
const questions = exam.levels.flatMap(l => l.questions.map(q => ({ ...q, level: l.name })));

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

if (cmd === 'build') {
  const out = questions.map(q => {
    const b = { id: q.id, level: q.level, type: q.type, q: q.q };
    if (q.type === 'mc') b.options = shuffle(q.options);
    if (q.type === 'sort') { let s; do { s = shuffle(q.items); } while (s.join('|') === q.items.join('|')); b.items = s; }
    return b;
  });
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`${file}: ${out.length} Fragen ohne Lösungen`);
  process.exit(0);
}

// grade
const html = readFileSync(join(root, 'index.html'), 'utf8');
const extractFn = name => {
  const s = html.indexOf(`function ${name}(`);
  if (s < 0) throw new Error(`function ${name} not found in index.html`);
  let d = 0;
  for (let i = html.indexOf('{', s); i < html.length; i++) {
    if (html[i] === '{') d++;
    else if (html[i] === '}' && --d === 0) return html.slice(s, i + 1);
  }
  throw new Error(`function ${name} has unbalanced braces`);
};
const { answerCorrect } = new Function(
  ['norm', 'normN', 'answerCorrect'].map(extractFn).join('\n') + '\nreturn { answerCorrect };')();

const answers = JSON.parse(readFileSync(file, 'utf8'));
const expected = q => q.type === 'mc' ? q.options[q.correct] : q.type === 'type' ? q.accept : q.type === 'sort' ? q.items : q.correct;
const wrong = [], notes = [];
for (const q of questions) {
  const a = answers[q.id];
  if (!a) { wrong.push(`${q.id}: keine Antwort`); continue; }
  const good =
    q.type === 'mc' ? a.answer === q.options[q.correct] :
    q.type === 'tf' ? String(a.answer).toLowerCase() === String(q.correct) :
    q.type === 'type' ? answerCorrect(q.accept, String(a.answer)) :
    Array.isArray(a.answer) && a.answer.join('|') === q.items.join('|');
  const head = `${q.id} [${q.type}] ${q.q.length > 110 ? '…' + q.q.slice(-110) : q.q}`;
  if (!good) wrong.push(`${head}\n   erwartet: ${JSON.stringify(expected(q))}\n   Antwort:  ${JSON.stringify(a.answer)}${a.note ? '\n   Note: ' + a.note : ''}`);
  else if (a.note) notes.push(`${head}\n   Note: ${a.note}`);
}
console.log(`${examId}: ${questions.length - wrong.length}/${questions.length} richtig · ${wrong.length} falsch · ${notes.length} Notes bei richtigen Antworten`);
if (wrong.length) console.log('\n── FALSCH ──\n' + wrong.join('\n'));
if (notes.length) console.log('\n── NOTES ──\n' + notes.join('\n'));
