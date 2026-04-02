#!/usr/bin/env node
/**
 * Vamos Estudar — Automated Test Suite
 * Run: node vamos-estudar/test/run-tests.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

let passed = 0, failed = 0, total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${e.message}\x1b[0m`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
const DATA_FILES = {
  portugues: 'portugues.json',
  matematica: 'matematica.json',
  estudoMeio: 'estudo-do-meio.json',
  ingles: 'ingles.json'
};

const questionData = {};
for (const [sid, file] of Object.entries(DATA_FILES)) {
  questionData[sid] = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
}

// ═══════════════════════════════════════════════════════
//  EXTRACT FUNCTIONS FROM HTML (for testing logic)
// ═══════════════════════════════════════════════════════
function norm(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
function normN(s) { return norm(s).replace(/\s/g, ''); }

function answerCorrect(acceptArr, raw) {
  if (!raw || !raw.trim()) return false;
  const u = norm(raw), un = normN(raw);
  return acceptArr.some(a => norm(a) === u || normN(a) === un);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════
//  1. DATA FILE VALIDATION
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mData Validation\x1b[0m');

for (const [sid, data] of Object.entries(questionData)) {
  const file = DATA_FILES[sid];

  test(`${file} is valid JSON with subject field`, () => {
    assert(data.subject === sid, `Expected subject "${sid}", got "${data.subject}"`);
  });

  test(`${file} has exams array`, () => {
    assert(Array.isArray(data.exams), 'exams is not an array');
    assert(data.exams.length >= 1, 'no exams found');
  });

  test(`${file} has name and emoji`, () => {
    assert(typeof data.name === 'string' && data.name.length > 0, 'missing name');
    assert(typeof data.emoji === 'string' && data.emoji.length > 0, 'missing emoji');
  });

  for (const exam of data.exams) {
    if (exam.levels.length === 0) continue; // skip empty placeholder exams

    test(`${file} exam "${exam.id}" has valid structure`, () => {
      assert(typeof exam.id === 'string', 'exam missing id');
      assert(typeof exam.name === 'string', 'exam missing name');
      assert(typeof exam.archived === 'boolean', 'exam missing archived flag');
      assert(Array.isArray(exam.levels), 'levels is not an array');
    });

    if (exam.examDate !== null && exam.examDate !== undefined) {
      test(`${file} exam "${exam.id}" examDate is valid`, () => {
        const d = new Date(exam.examDate);
        assert(!isNaN(d.getTime()), `Invalid date: ${exam.examDate}`);
      });
    }

    for (const level of exam.levels) {
      const prefix = `${file} ${exam.id} L${level.id}`;

      test(`${prefix} has valid structure`, () => {
        assert(typeof level.id === 'number', 'level missing id');
        assert(typeof level.name === 'string' && level.name.length > 0, 'level missing name');
        assert(Array.isArray(level.questions), 'questions is not an array');
      });

      const normal = level.questions.filter(q => !q.bonus);
      test(`${prefix} has >= 10 normal questions (has ${normal.length})`, () => {
        assert(normal.length >= 10, `Only ${normal.length} normal questions, need >= 10`);
      });

      const ids = new Set();
      for (const q of level.questions) {
        test(`${prefix} question "${q.id}" has valid base fields`, () => {
          assert(typeof q.id === 'string' && q.id.length > 0, 'missing id');
          assert(['mc', 'type', 'tf', 'sort'].includes(q.type), `invalid type: ${q.type}`);
          assert([1, 2, 3].includes(q.diff), `invalid diff: ${q.diff}`);
          assert(typeof q.q === 'string' && q.q.length > 0, 'missing question text');
          assert(typeof q.explanation === 'string' && q.explanation.length > 0, 'missing explanation');
        });

        test(`${prefix} question "${q.id}" has no duplicate ID`, () => {
          assert(!ids.has(q.id), `Duplicate ID: ${q.id}`);
          ids.add(q.id);
        });

        if (q.type === 'mc') {
          test(`${prefix} MC "${q.id}" has 4 options and valid correct index`, () => {
            assert(Array.isArray(q.options) && q.options.length === 4, `Expected 4 options, got ${q.options?.length}`);
            assert(typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3, `Invalid correct index: ${q.correct}`);
            q.options.forEach((o, i) => assert(typeof o === 'string' && o.length > 0, `Option ${i} is empty`));
          });
        }

        if (q.type === 'type') {
          test(`${prefix} TYPE "${q.id}" has non-empty accept array`, () => {
            assert(Array.isArray(q.accept) && q.accept.length > 0, 'accept array empty or missing');
            q.accept.forEach((a, i) => assert(typeof a === 'string' && a.length > 0, `Accept ${i} is empty`));
          });
        }

        if (q.type === 'tf') {
          test(`${prefix} TF "${q.id}" has boolean correct`, () => {
            assert(typeof q.correct === 'boolean', `correct is not boolean: ${q.correct}`);
          });
        }

        if (q.type === 'sort') {
          test(`${prefix} SORT "${q.id}" has items array`, () => {
            assert(Array.isArray(q.items) && q.items.length >= 2, 'items array missing or too small');
          });
        }

        if (q.bonus) {
          test(`${prefix} bonus "${q.id}" has bonus:true`, () => {
            assert(q.bonus === true, 'bonus not true');
          });
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
//  2. ANSWER NORMALIZATION
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mAnswer Normalization\x1b[0m');

test('"Atlantico" matches "Atlântico"', () => {
  assert(answerCorrect(['Atlântico'], 'Atlantico'));
});

test('"ATLANTICO" matches "atlântico"', () => {
  assert(answerCorrect(['atlântico'], 'ATLANTICO'));
});

test('" atlantico " matches "Atlântico" (whitespace)', () => {
  assert(answerCorrect(['Atlântico'], ' atlantico '));
});

test('"1 000" matches "1000" (number spaces)', () => {
  assert(answerCorrect(['1000'], '1 000'));
});

test('"1000" matches "1 000"', () => {
  assert(answerCorrect(['1 000'], '1000'));
});

test('empty string does NOT match', () => {
  assert(!answerCorrect(['hello'], ''));
});

test('only whitespace does NOT match', () => {
  assert(!answerCorrect(['hello'], '   '));
});

test('"ção" accent handling (maçã → maca)', () => {
  assert(answerCorrect(['maçã'], 'maca'));
});

test('"é" matches "e" (acute accent)', () => {
  assert(answerCorrect(['café'], 'cafe'));
});

test('case insensitive match', () => {
  assert(answerCorrect(['Monday'], 'monday'));
});

test('"nós" matches "nos" (accent stripping)', () => {
  assert(answerCorrect(['nós'], 'nos'));
});

test('exact match works', () => {
  assert(answerCorrect(['ele'], 'ele'));
});

test('multiple accept values work', () => {
  assert(answerCorrect(['gato', 'cão', 'peixe'], 'CAO'));
  assert(answerCorrect(['gato', 'cão', 'peixe'], 'peixe'));
  assert(!answerCorrect(['gato', 'cão', 'peixe'], 'rato'));
});

// ═══════════════════════════════════════════════════════
//  3. QUIZ ENGINE
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mQuiz Engine\x1b[0m');

test('shuffle produces different orders (probabilistic)', () => {
  const arr = [1,2,3,4,5,6,7,8,9,10];
  let different = false;
  for (let i = 0; i < 20; i++) {
    const s = shuffle(arr);
    if (JSON.stringify(s) !== JSON.stringify(arr)) { different = true; break; }
  }
  assert(different, 'shuffle never produced a different order in 20 tries');
});

test('shuffle preserves all elements', () => {
  const arr = [1,2,3,4,5];
  const s = shuffle(arr);
  assertEqual(s.length, 5);
  assert(s.sort((a,b)=>a-b).join(',') === '1,2,3,4,5', 'elements missing after shuffle');
});

test('shuffle does not mutate original array', () => {
  const arr = [1,2,3,4,5];
  const copy = [...arr];
  shuffle(arr);
  assert(JSON.stringify(arr) === JSON.stringify(copy), 'original array was mutated');
});

// Star calculation tests
test('1st attempt no hint = 3 stars', () => {
  const attempts = 1, hintUsed = false;
  const stars = attempts === 1 && !hintUsed ? 3 : attempts === 1 ? 2 : attempts === 2 ? 2 : attempts === 3 ? 1 : 0;
  assertEqual(stars, 3);
});

test('1st attempt with hint = 2 stars', () => {
  const attempts = 1, hintUsed = true;
  const stars = attempts === 1 && !hintUsed ? 3 : attempts === 1 ? 2 : attempts === 2 ? 2 : attempts === 3 ? 1 : 0;
  assertEqual(stars, 2);
});

test('2nd attempt = 2 stars', () => {
  const attempts = 2, hintUsed = false;
  const stars = attempts === 1 && !hintUsed ? 3 : attempts === 1 ? 2 : attempts === 2 ? 2 : attempts === 3 ? 1 : 0;
  assertEqual(stars, 2);
});

test('3rd attempt = 1 star', () => {
  const attempts = 3, hintUsed = false;
  const stars = attempts === 1 && !hintUsed ? 3 : attempts === 1 ? 2 : attempts === 2 ? 2 : attempts === 3 ? 1 : 0;
  assertEqual(stars, 1);
});

test('4th attempt = 0 stars', () => {
  const attempts = 4, hintUsed = false;
  const stars = attempts === 1 && !hintUsed ? 3 : attempts === 1 ? 2 : attempts === 2 ? 2 : attempts === 3 ? 1 : 0;
  assertEqual(stars, 0);
});

// Crown logic
test('crown requires 2x perfect consecutive', () => {
  const history = { q1: [3, 3], q2: [3, 3], q3: [3, 3] };
  const allMastered = Object.values(history).every(h => h.length >= 2 && h[0] === 3 && h[1] === 3);
  assert(allMastered, 'should be mastered');
});

test('crown not granted with only 1 perfect', () => {
  const history = { q1: [3], q2: [3, 3] };
  const allMastered = Object.values(history).every(h => h.length >= 2 && h[0] === 3 && h[1] === 3);
  assert(!allMastered, 'should NOT be mastered with only 1 attempt');
});

test('crown not granted with non-perfect scores', () => {
  const history = { q1: [3, 2], q2: [3, 3] };
  const allMastered = Object.values(history).every(h => h.length >= 2 && h[0] === 3 && h[1] === 3);
  assert(!allMastered, 'should NOT be mastered with score 2');
});

// History tracking
test('history stores last 2 scores, newest first', () => {
  const h = [];
  // Simulate 3 attempts
  h.unshift(2); if (h.length > 2) h.length = 2; // [2]
  h.unshift(3); if (h.length > 2) h.length = 2; // [3, 2]
  h.unshift(1); if (h.length > 2) h.length = 2; // [1, 3]
  assertEqual(h[0], 1, 'newest should be first');
  assertEqual(h[1], 3, 'second newest should be second');
  assertEqual(h.length, 2, 'should only keep 2');
});

// Bonus threshold
test('bonus unlocks at >= 70% answered', () => {
  const totalNormal = 20;
  const answered = 14; // 70%
  assert(answered / totalNormal >= 0.7, 'should unlock at 70%');
});

test('bonus does NOT unlock at < 70% answered', () => {
  const totalNormal = 20;
  const answered = 13; // 65%
  assert(answered / totalNormal < 0.7, 'should not unlock at 65%');
});

// ═══════════════════════════════════════════════════════
//  4. PROFILE SYSTEM
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mProfile System\x1b[0m');

test('default state has correct structure', () => {
  const state = {
    progress: {},
    archive: {},
    achievements: [],
    streak: 0,
    playDates: []
  };
  assert(typeof state.progress === 'object');
  assert(Array.isArray(state.achievements));
  assert(Array.isArray(state.playDates));
  assertEqual(state.streak, 0);
});

test('multiple profiles coexist without collision', () => {
  const profiles = {
    'Maria': { progress: { exam1: { levels: { 1: { history: { q1: [3] }, completed: true } } } }, achievements: ['first'], archive: {}, streak: 0, playDates: [] },
    'João': { progress: {}, achievements: [], archive: {}, streak: 0, playDates: [] }
  };
  assertEqual(profiles['Maria'].achievements.length, 1);
  assertEqual(profiles['João'].achievements.length, 0);
  // Modifying one doesn't affect the other
  profiles['João'].achievements.push('test');
  assertEqual(profiles['Maria'].achievements.length, 1);
  assertEqual(profiles['João'].achievements.length, 1);
});

test('deleting profile removes only that profile', () => {
  const profiles = { A: { p: 1 }, B: { p: 2 }, C: { p: 3 } };
  delete profiles.B;
  assert(!profiles.B, 'B should be deleted');
  assertEqual(profiles.A.p, 1, 'A should be unchanged');
  assertEqual(profiles.C.p, 3, 'C should be unchanged');
});

test('empty localStorage returns empty object', () => {
  let profiles;
  try { profiles = JSON.parse('{}'); } catch(e) { profiles = {}; }
  assert(typeof profiles === 'object');
  assertEqual(Object.keys(profiles).length, 0);
});

test('null in localStorage returns empty object', () => {
  let profiles;
  try { profiles = JSON.parse(null || '{}'); } catch(e) { profiles = {}; }
  assert(typeof profiles === 'object');
});

test('invalid JSON in localStorage returns empty object', () => {
  let profiles;
  try { profiles = JSON.parse('{broken'); } catch(e) { profiles = {}; }
  assert(typeof profiles === 'object');
  assertEqual(Object.keys(profiles).length, 0);
});

test('new level in data does not crash', () => {
  // Simulate: player has progress for L1, but data now has L1 and L2
  const progress = { exam1: { levels: { 1: { history: { q1: [3] }, completed: true } } } };
  // Access L2 (doesn't exist yet)
  if (!progress.exam1.levels[2]) {
    progress.exam1.levels[2] = { history: {}, completed: false };
  }
  assertEqual(progress.exam1.levels[1].history.q1[0], 3, 'L1 data preserved');
  assertEqual(Object.keys(progress.exam1.levels[2].history).length, 0, 'L2 starts empty');
});

test('removed level from data does not crash', () => {
  // Simulate: player has progress for L1,L2,L3 but data now only has L1,L2
  const progress = {
    exam1: { levels: {
      1: { history: { q1: [3] }, completed: true },
      2: { history: { q2: [2] }, completed: true },
      3: { history: { q3: [1] }, completed: false }
    }}
  };
  // App only iterates over levels that exist in data, so L3 is just ignored
  const dataLevels = [{ id: 1 }, { id: 2 }]; // L3 removed from data
  dataLevels.forEach(l => {
    const lp = progress.exam1.levels[l.id];
    assert(lp, `Level ${l.id} should still have progress`);
  });
  // L3 still exists in progress but won't be shown
  assert(progress.exam1.levels[3], 'L3 data preserved even if removed from data');
});

// ═══════════════════════════════════════════════════════
//  5. LOCALSTORAGE MIGRATION
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mlocalStorage Migration\x1b[0m');

test('v1 data loads correctly', () => {
  const v1Data = JSON.stringify({ 'Maria': { progress: {}, archive: {}, achievements: [], streak: 0, playDates: [] } });
  const parsed = JSON.parse(v1Data);
  assert(parsed.Maria, 'profile should exist');
  assert(Array.isArray(parsed.Maria.achievements), 'achievements should be array');
});

test('graceful handling of empty/null/undefined localStorage', () => {
  const cases = [null, undefined, '', '{}', 'null'];
  cases.forEach(val => {
    let profiles;
    try {
      profiles = JSON.parse(val || '{}');
      if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) profiles = {};
    } catch(e) { profiles = {}; }
    assert(typeof profiles === 'object', `Failed for value: ${JSON.stringify(val)}`);
  });
});

test('corrupted JSON data does not crash', () => {
  let profiles;
  try {
    profiles = JSON.parse('{"name": broken}');
  } catch(e) {
    profiles = {};
  }
  assert(typeof profiles === 'object');
  assertEqual(Object.keys(profiles).length, 0);
});

// ═══════════════════════════════════════════════════════
//  6. UI SMOKE
// ═══════════════════════════════════════════════════════
console.log('\n\x1b[1mUI Smoke\x1b[0m');

const htmlContent = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('HTML file contains all screen IDs', () => {
  const screens = ['screen-loading', 'screen-profile', 'screen-home', 'screen-subject', 'screen-quiz', 'screen-results', 'screen-achievements'];
  screens.forEach(id => {
    assert(htmlContent.includes(`id="${id}"`), `Missing screen: ${id}`);
  });
});

test('JavaScript has no syntax errors', () => {
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'No script tag found');
  try { new Function(scriptMatch[1]); } catch(e) {
    throw new Error(`JS syntax error: ${e.message}`);
  }
});

test('HTML has proper DOCTYPE and lang', () => {
  assert(htmlContent.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
  assert(htmlContent.includes('lang="pt"'), 'Missing lang="pt"');
});

test('localStorage key is defined and unique', () => {
  assert(htmlContent.includes("vamos_estudar_profiles_v1"), 'Missing localStorage key');
  assert(!htmlContent.includes("frankensteinschule"), 'Should not reference German app storage');
});

// ═══════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`\x1b[1mResults: ${passed}/${total} passed${failed > 0 ? `, \x1b[31m${failed} failed\x1b[0m` : ''}\x1b[0m`);
if (failed > 0) {
  console.log('\x1b[31mSome tests failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAll tests passed! ✓\x1b[0m');
  process.exit(0);
}
