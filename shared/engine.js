// Lernspiel Shared Engine — loaded by all school apps
(function (global) {
  'use strict';

  // ============================================================
  // AUDIO
  // ============================================================
  let _audioCtx = null;
  function _getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }

  function playTone(freq, dur, type = 'sine', vol = 0.15) {
    try {
      const ctx = _getAudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + dur);
    } catch (e) {}
  }

  function soundCorrect() {
    playTone(523, 0.15);
    setTimeout(() => playTone(659, 0.15), 100);
    setTimeout(() => playTone(784, 0.2), 200);
  }

  function soundWrong() {
    playTone(200, 0.3, 'square', 0.08);
  }

  function soundClick() {
    playTone(800, 0.05, 'sine', 0.06);
  }

  function soundAchievement() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.12), i * 120));
  }

  // ============================================================
  // ANIMATIONS
  // ============================================================
  function launchConfetti(duration = 2000) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      // Fallback: div-based confetti (used by lernspiel.html)
      const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D', '#C084FC'];
      for (let i = 0; i < 40; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + '%';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.8 + 's';
        el.style.animationDuration = (2 + Math.random() * 1.5) + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      }
      return;
    }
    // Canvas-based confetti (used by vamos-estudar/index.html)
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#FF6B35', '#4ECDC4', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#3498DB', '#FFD700'];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }
    const start = Date.now();
    function animate() {
      if (Date.now() - start > duration + 2000) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ============================================================
  // UI
  // ============================================================

  // Fixed version: clears inline display styles before removing 'active'
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.style.display = '';
      s.classList.remove('active');
    });
    const el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function buildStars(avg, size = '') {
    // 3 stars ONLY for perfect 3.0, otherwise round DOWN to nearest 0.5
    let rounded;
    if (avg >= 3.0) rounded = 3;
    else rounded = Math.floor(avg * 2) / 2; // always floor, never round up
    const full = Math.floor(rounded);
    const hasHalf = (rounded % 1) !== 0;
    const empty = 3 - full - (hasHalf ? 1 : 0);
    const s = 'display:inline-block;vertical-align:middle;line-height:1;';
    let html = `<span style="${s}">⭐</span>`.repeat(full);
    if (hasHalf) html += `<span style="${s}width:0.55em;overflow:hidden">⭐</span>`;
    html += `<span style="${s}filter:grayscale(1);opacity:0.3">⭐</span>`.repeat(Math.max(0, empty));
    return html;
  }

  function esc(s) {
    return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  // Fisher-Yates in-place shuffle, returns arr
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ============================================================
  // PROFILE MANAGEMENT
  // ============================================================

  function loadProfiles(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey) || '{}';
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed;
    } catch (e) {
      return {};
    }
  }

  function saveProfiles(storageKey, profiles) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profiles));
    } catch (e) {}
  }

  // ============================================================
  // SCORING
  // ============================================================

  /**
   * Calculate star score based on attempts and hint usage.
   * attempts=1, hintUsed=false → 3
   * attempts=1, hintUsed=true  → 2
   * attempts=2                 → 2
   * attempts=3                 → 1
   * attempts>=4                → 0
   */
  function calculateScore(attempts, hintUsed) {
    if (attempts === 1 && !hintUsed) return 3;
    if (attempts === 1) return 2; // used hint
    if (attempts === 2) return 2;
    if (attempts === 3) return 1;
    return 0;
  }

  /**
   * Prepend score to history array, keeping only the last 2 entries (newest first).
   * Mutates history in place.
   */
  function recordAttempt(history, score) {
    history.unshift(score);
    if (history.length > 2) history.length = 2;
  }

  /**
   * Returns true if history has >= 2 entries and both are perfect (3).
   */
  function isMastered(history) {
    return history.length >= 2 && history[0] === 3 && history[1] === 3;
  }

  /**
   * Average of history array, or 0 if empty.
   */
  function avgStars(history) {
    if (!history || history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  // ============================================================
  // ANSWER CHECKING
  // ============================================================

  function checkMC(chosen, correct) {
    return chosen === correct;
  }

  function checkTF(chosen, correct) {
    return chosen === correct;
  }

  /**
   * Check a text answer against an array of accepted answers.
   * normFn: optional normalization function (null = trim+lowercase only).
   * Portuguese uses norm(s) which strips diacritics; German uses plain lowercase.
   */
  function checkText(acceptArr, raw, normFn) {
    if (!raw || !raw.trim()) return false;
    const normalized = normFn
      ? raw
      : raw.trim().toLowerCase();
    if (normFn) {
      return acceptArr.some(a => normFn(a) === normFn(raw));
    }
    return acceptArr.some(a => a.trim().toLowerCase() === normalized);
  }

  function checkSort(userOrder, correctOrder) {
    return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
  }

  // ============================================================
  // QUESTION RENDERING
  // Returns HTML strings; uses window._sortState / window._scrambleState
  // ============================================================

  /**
   * Render multiple-choice options.
   * q.opts (German) or q.options (Portuguese) — caller passes q with .options normalized.
   */
  function renderMC(q, strings) {
    const options = q.opts || q.options || [];
    const correctText = Array.isArray(options) && typeof q.correct === 'number'
      ? options[q.correct]
      : q.ans;
    const shuffled = shuffle([...options]);
    const btns = shuffled.map(opt =>
      `<div class="q-option" onclick="checkMC(this,'${esc(opt)}','${esc(correctText)}')">${opt}</div>`
    ).join('');
    return `<div class="q-options">${btns}</div>`;
  }

  /**
   * Render true/false buttons.
   * Uses strings.true_label / strings.false_label for button text.
   */
  function renderTF(q, strings) {
    const trueLabel  = (strings && strings.true_label)  || '✓ Richtig';
    const falseLabel = (strings && strings.false_label) || '✗ Falsch';
    return `<div class="tf-options">` +
      `<div class="tf-option" onclick="checkTF(this,true,${q.correct})" style="border-color:var(--success)">${trueLabel}</div>` +
      `<div class="tf-option" onclick="checkTF(this,false,${q.correct})" style="border-color:var(--error)">${falseLabel}</div>` +
      `</div>`;
  }

  /**
   * Render a text-input (fill/type) question.
   * Uses strings.placeholder / strings.submit for input hint and button label.
   */
  function renderType(q, strings) {
    const placeholder = (strings && strings.placeholder) || 'Deine Antwort...';
    const submit      = (strings && strings.submit)      || 'Prüfen!';
    return `<div class="fill-container">` +
      `<input type="text" class="fill-input" id="fill-input" placeholder="${esc(placeholder)}" ` +
      `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">` +
      `<div style="margin-top:10px">` +
      `<button class="btn btn-primary btn-small" onclick="checkFill()">${submit}</button>` +
      `</div></div>`;
  }

  /**
   * Render a sort question (click-to-order).
   * Sets window._sortAnswer and window._sortCurrent.
   * Uses strings.sort_prompt / strings.reset / strings.submit.
   */
  function renderSort(q, strings) {
    const prompt  = (strings && strings.sort_prompt) || 'Klicke die Elemente in der richtigen Reihenfolge an!';
    const reset   = (strings && strings.reset)       || 'Zurücksetzen';
    const submit  = (strings && strings.submit)      || 'Prüfen!';
    const shuffled = shuffle([...q.items]);
    window._sortAnswer  = q.items;
    window._sortCurrent = [];
    const items = shuffled.map(item =>
      `<div class="sort-item" onclick="addSortItem(this,'${esc(item)}')">${item}</div>`
    ).join('');
    return `<div class="sort-slots" id="sort-slots"><span style="color:#aaa;font-size:14px;padding:8px">${prompt}</span></div>` +
      `<div class="sort-items" id="sort-items">${items}</div>` +
      `<div style="margin-top:10px;display:flex;gap:8px;justify-content:center">` +
      `<button class="btn btn-small btn-outline" onclick="resetSort()">${reset}</button>` +
      `<button class="btn btn-small btn-primary" onclick="checkSort()">${submit}</button>` +
      `</div>`;
  }

  /**
   * Render a scramble (Buchstabensalat) question.
   * Sets window._scrambleAnswer and window._scrambleCurrent.
   * Uses strings.reset.
   */
  function renderScramble(q, strings) {
    const reset = (strings && strings.reset) || 'Zurücksetzen';
    const letters = shuffle(q.word.split(''));
    window._scrambleAnswer  = q.word;
    window._scrambleCurrent = [];
    const emptySlots = q.word.split('').map(() => '<div class="scramble-empty"></div>').join('');
    const tiles = letters.map((l, i) =>
      `<div class="scramble-tile" onclick="addScrambleLetter(this,'${esc(l)}',${i})">${l}</div>`
    ).join('');
    return `<div class="scramble-display" id="scramble-display">${emptySlots}</div>` +
      `<div class="scramble-tiles" id="scramble-tiles">${tiles}</div>` +
      `<div style="margin-top:10px">` +
      `<button class="btn btn-small btn-outline" onclick="resetScramble()">${reset}</button>` +
      `</div>`;
  }

  /**
   * Render a fill-in-the-blank question.
   * The question text (q.q) should contain '___' as the blank marker.
   * Uses strings.placeholder / strings.submit.
   */
  function renderFill(q, strings) {
    const placeholder = (strings && strings.placeholder) || 'Deine Antwort...';
    const submit      = (strings && strings.submit)      || 'Prüfen!';
    const sentence = q.q.replace('___', '<span class="fill-blank" id="fill-blank"></span>');
    return `<div class="fill-container">` +
      `<div class="fill-sentence">${sentence}</div>` +
      `<input type="text" class="fill-input" id="fill-input" placeholder="${esc(placeholder)}" ` +
      `autocomplete="off" autocapitalize="off">` +
      `<div style="margin-top:10px">` +
      `<button class="btn btn-primary btn-small" onclick="checkFill()">${submit}</button>` +
      `</div></div>`;
  }

  // ============================================================
  // EXPORT
  // ============================================================
  global.LernEngine = {
    // Audio
    playTone, soundCorrect, soundWrong, soundClick, soundAchievement,
    // Animations
    launchConfetti,
    // UI
    showScreen, buildStars, esc,
    // Utilities
    shuffle,
    // Profiles
    loadProfiles, saveProfiles,
    // Scoring
    calculateScore, recordAttempt, isMastered, avgStars,
    // Answer Checking
    checkMC, checkTF, checkText, checkSort,
    // Rendering
    renderMC, renderTF, renderType, renderSort, renderScramble, renderFill
  };

}(window));
