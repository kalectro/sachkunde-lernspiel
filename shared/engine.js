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
  // COMPANIONS — shared across all tests (stored at profile root)
  // ============================================================
  const CHARACTERS = {
    molly:  { name:'Molly',  emoji:'🐕',  lines:["Wuff! Super!","Pfote hoch!","Schlaukopf!","Wau, richtig!"] },
    elli:   { name:'Elli',   emoji:'🐦',  lines:["Piep, richtig!","Volltreffer!","Schnell wie ich!","Fantastisch!"] },
    okti:   { name:'Okti',   emoji:'🐙',  lines:["Blubb! Genial!","Alle 8 Arme klatschen!","Perfekt!","Du bist ein Genie!"] },
    blitzi: { name:'Blitzi', emoji:'🐴',  lines:["Hopp hopp!","Blitzschnell!","Wiehe, super!","Im Galopp richtig!"] },
    wuesti: { name:'Wüsti',  emoji:'🦊',  lines:["Jiihaa, stark!","Sand-stark!","Wüstenschlau!","Große Ohren, großes Lob!"] },
    all:    { name:'Team',   emoji:'🎉',  lines:["Alle jubeln!","Fantastisch!","Perfekt!","Bravo!"] }
  };

  const COMPANION_ORDER = ['molly', 'elli', 'okti', 'blitzi', 'wuesti'];
  const COMPANION_HINT = {
    molly:  'Startbegleiter',
    elli:   'Stufe 1 beenden',
    okti:   'Stufe 2 beenden',
    blitzi: 'Stufe 3 beenden',
    wuesti: 'Stufe 4 beenden'
  };

  function charSVG(name) {
    if(name==='molly') return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="72" rx="22" ry="18" fill="#A0522D"/><ellipse cx="28" cy="28" rx="12" ry="18" fill="#8B4513" transform="rotate(-15 28 28)"/><ellipse cx="72" cy="28" rx="12" ry="18" fill="#8B4513" transform="rotate(15 72 28)"/><circle cx="50" cy="40" r="22" fill="#C68642"/><circle cx="42" cy="36" r="4.5" fill="white"/><circle cx="58" cy="36" r="4.5" fill="white"/><circle cx="43" cy="37" r="2.5" fill="#333"/><circle cx="59" cy="37" r="2.5" fill="#333"/><ellipse cx="50" cy="45" rx="4" ry="3" fill="#333"/><path d="M44 49 Q50 54 56 49" stroke="#333" fill="none" stroke-width="1.5"/><ellipse cx="50" cy="53" rx="3" ry="4" fill="#FF8A80"/></svg>`;
    if(name==='elli') return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="58" rx="18" ry="22" fill="#1976D2"/><ellipse cx="50" cy="62" rx="12" ry="16" fill="#FF8F00"/><circle cx="50" cy="35" r="18" fill="#1565C0"/><circle cx="43" cy="32" r="3.5" fill="white"/><circle cx="57" cy="32" r="3.5" fill="white"/><circle cx="44" cy="33" r="2" fill="#333"/><circle cx="58" cy="33" r="2" fill="#333"/><polygon points="50,38 65,42 50,44" fill="#FF6F00"/><ellipse cx="32" cy="55" rx="14" ry="6" fill="#1976D2" transform="rotate(-20 32 55)"/><ellipse cx="68" cy="55" rx="14" ry="6" fill="#1976D2" transform="rotate(20 68 55)"/></svg>`;
    if(name==='okti') return `<svg viewBox="0 0 100 100"><circle cx="50" cy="35" r="25" fill="#9C27B0"/><circle cx="50" cy="35" r="20" fill="#BA68C8"/><circle cx="42" cy="30" r="5" fill="white"/><circle cx="58" cy="30" r="5" fill="white"/><circle cx="43" cy="31" r="3" fill="#333"/><circle cx="59" cy="31" r="3" fill="#333"/><path d="M44 42 Q50 47 56 42" stroke="#333" fill="none" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(i=>{const a=(i*45-90)*Math.PI/180;const sx=50+Math.cos(a)*20;const sy=55+Math.sin(a)*8;const ex=50+Math.cos(a)*38;const ey=55+Math.sin(a)*30;const mx=50+Math.cos(a+.3)*30;const my=55+Math.sin(a+.3)*20;return`<path d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" stroke="#9C27B0" fill="none" stroke-width="4" stroke-linecap="round"/>`;}).join('')}</svg>`;
    if(name==='blitzi') return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="65" rx="20" ry="25" fill="#795548"/><circle cx="50" cy="32" r="20" fill="#8D6E63"/><ellipse cx="35" cy="22" rx="5" ry="10" fill="#8D6E63" transform="rotate(-15 35 22)"/><ellipse cx="65" cy="22" rx="5" ry="10" fill="#8D6E63" transform="rotate(15 65 22)"/><circle cx="42" cy="30" r="4" fill="white"/><circle cx="58" cy="30" r="4" fill="white"/><circle cx="43" cy="31" r="2.5" fill="#333"/><circle cx="59" cy="31" r="2.5" fill="#333"/><ellipse cx="50" cy="40" rx="6" ry="4" fill="#6D4C41"/><path d="M40 18 Q50 5 60 18" stroke="#5D4037" fill="none" stroke-width="6" stroke-linecap="round"/></svg>`;
    if(name==='wuesti') return `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="75" rx="20" ry="16" fill="#E8B27A"/><polygon points="22,10 18,44 40,30" fill="#E8B27A"/><polygon points="25,16 26,36 36,28" fill="#FFD9B0"/><polygon points="78,10 82,44 60,30" fill="#E8B27A"/><polygon points="75,16 74,36 64,28" fill="#FFD9B0"/><circle cx="50" cy="48" r="22" fill="#F4C78C"/><path d="M30 48 Q35 68 50 70 Q65 68 70 48 Q60 60 50 60 Q40 60 30 48" fill="#FFF3E0"/><circle cx="40" cy="44" r="5.5" fill="white"/><circle cx="60" cy="44" r="5.5" fill="white"/><circle cx="41" cy="45" r="3.5" fill="#333"/><circle cx="61" cy="45" r="3.5" fill="#333"/><circle cx="41.8" cy="44.2" r="1" fill="white"/><circle cx="61.8" cy="44.2" r="1" fill="white"/><ellipse cx="50" cy="56" rx="3" ry="2.2" fill="#3E2723"/><path d="M45 60 Q50 64 55 60" stroke="#3E2723" fill="none" stroke-width="1.5" stroke-linecap="round"/><circle cx="33" cy="54" r="3" fill="#FFB5A7" opacity=".6"/><circle cx="67" cy="54" r="3" fill="#FFB5A7" opacity=".6"/></svg>`;
    if(name==='all') return `<svg viewBox="0 0 100 100"><text x="50" y="58" font-size="48" text-anchor="middle">🎉</text></svg>`;
    return '';
  }

  function ensureCompanions(profile) {
    if (!profile || typeof profile !== 'object') return null;
    // Migration: legacy position was profile.sachkunde.companions — lift to profile root
    if (!profile.companions && profile.sachkunde && profile.sachkunde.companions) {
      profile.companions = profile.sachkunde.companions;
      delete profile.sachkunde.companions;
    }
    if (!profile.companions || typeof profile.companions !== 'object') {
      profile.companions = { active: 'molly', unlocked: ['molly'] };
    }
    if (!Array.isArray(profile.companions.unlocked)) profile.companions.unlocked = ['molly'];
    if (!profile.companions.unlocked.includes('molly')) profile.companions.unlocked.unshift('molly');
    if (!profile.companions.active || !profile.companions.unlocked.includes(profile.companions.active)) {
      profile.companions.active = profile.companions.unlocked[0] || 'molly';
    }
    return profile.companions;
  }

  // Returns true if newly unlocked.
  function unlockCompanion(profile, id) {
    const c = ensureCompanions(profile);
    if (!c || !COMPANION_ORDER.includes(id)) return false;
    if (c.unlocked.includes(id)) return false;
    c.unlocked.push(id);
    return true;
  }

  function setActiveCompanion(profile, id) {
    const c = ensureCompanions(profile);
    if (!c || !c.unlocked.includes(id)) return false;
    if (c.active === id) return false;
    c.active = id;
    return true;
  }

  // Inject CSS once per page
  let _compStyleInjected = false;
  function _injectCompanionStyles() {
    if (_compStyleInjected) return;
    _compStyleInjected = true;
    const css = `
.companions { background:white; border-radius:14px; padding:10px 10px 12px; box-shadow:0 3px 14px rgba(0,0,0,.09); margin-bottom:14px; }
.companions-title { font-size:.78em; color:#636e72; font-weight:700; text-align:center; margin-bottom:8px; letter-spacing:.5px; text-transform:uppercase; }
.companions-row { display:flex; justify-content:space-around; align-items:flex-end; gap:6px; }
.comp-cell { flex:1; text-align:center; cursor:pointer; padding:6px 2px; border-radius:10px; transition:background .15s, transform .15s; user-select:none; position:relative; min-width:0; }
.comp-cell:hover:not(.locked) { background:#F0F4F8; transform:translateY(-2px); }
.comp-cell.active { background:linear-gradient(135deg,#FFE082,#FFD54F); box-shadow:0 2px 6px rgba(255,165,0,.3); }
.comp-cell.locked { cursor:default; opacity:.55; }
.comp-svg { width:44px; height:44px; margin:0 auto; }
.comp-svg svg { width:100%; height:100%; }
.comp-cell.locked .comp-svg { filter:grayscale(1) brightness(.9); }
.comp-name { font-size:.72em; font-weight:700; color:#2D3436; margin-top:2px; }
.comp-hint { font-size:.62em; color:#636e72; line-height:1.1; margin-top:1px; }
.comp-lock { position:absolute; top:2px; right:4px; font-size:.85em; opacity:.7; }
.comp-cell.active .comp-name { color:#5D4037; }
.comp-toast { position:fixed; bottom:-200px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#FFD54F,#FF8A65); color:#3E2723; padding:14px 22px; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,.25); font-weight:700; text-align:center; z-index:1000; transition:bottom .4s ease; display:flex; gap:12px; align-items:center; max-width:90%; }
.comp-toast.show { bottom:28px; }
.comp-toast-svg { width:52px; height:52px; flex-shrink:0; }
.comp-toast-svg svg { width:100%; height:100%; }
.comp-toast-text h4 { font-size:.95em; margin-bottom:2px; }
.comp-toast-text p { font-size:.78em; font-weight:600; opacity:.85; }
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderCompanionStrip(container, profile, opts) {
    if (!container || !profile) return;
    _injectCompanionStyles();
    const c = ensureCompanions(profile);
    const unlocked = new Set(c.unlocked);
    const active = c.active;
    const onSelect = (opts && opts.onSelect) || null;
    const cells = COMPANION_ORDER.map(id => {
      const data = CHARACTERS[id];
      const isUnlocked = unlocked.has(id);
      const isActive = id === active;
      const cls = 'comp-cell' + (isUnlocked ? '' : ' locked') + (isActive ? ' active' : '');
      const hint = isUnlocked ? (isActive ? 'Aktiv ✨' : 'Wählen') : (COMPANION_HINT[id] || '');
      const lockIcon = isUnlocked ? '' : '<span class="comp-lock">🔒</span>';
      return `<div class="${cls}" data-comp-id="${id}">
        ${lockIcon}
        <div class="comp-svg">${charSVG(id)}</div>
        <div class="comp-name">${data.name}</div>
        <div class="comp-hint">${hint}</div>
      </div>`;
    }).join('');
    container.innerHTML = `<div class="companions-title">🌟 Begleiter</div><div class="companions-row">${cells}</div>`;
    container.querySelectorAll('.comp-cell').forEach(el => {
      const id = el.getAttribute('data-comp-id');
      if (!unlocked.has(id)) return;
      el.addEventListener('click', () => {
        if (setActiveCompanion(profile, id)) {
          soundClick();
          if (onSelect) onSelect(id);
          renderCompanionStrip(container, profile, opts);
        }
      });
    });
  }

  function showCompanionUnlockToast(id) {
    _injectCompanionStyles();
    const data = CHARACTERS[id];
    if (!data) return;
    let toast = document.getElementById('comp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'comp-toast';
      toast.className = 'comp-toast';
      toast.innerHTML = `<div class="comp-toast-svg" id="comp-toast-svg"></div>
        <div class="comp-toast-text">
          <h4 id="comp-toast-title">🎉 Neuer Begleiter!</h4>
          <p id="comp-toast-name"></p>
        </div>`;
      document.body.appendChild(toast);
    }
    document.getElementById('comp-toast-svg').innerHTML = charSVG(id);
    document.getElementById('comp-toast-name').textContent = data.name + ' ist dabei!';
    document.getElementById('comp-toast-title').textContent = '🎉 Neuer Begleiter!';
    toast.classList.add('show');
    soundAchievement();
    setTimeout(() => toast.classList.remove('show'), 2000);
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
    renderMC, renderTF, renderType, renderSort, renderScramble, renderFill,
    // Companions (shared across tests, stored at profile root)
    companions: {
      CHARACTERS, ORDER: COMPANION_ORDER, HINT: COMPANION_HINT,
      charSVG, ensure: ensureCompanions, unlock: unlockCompanion,
      setActive: setActiveCompanion, renderStrip: renderCompanionStrip,
      showUnlockToast: showCompanionUnlockToast
    }
  };

}(window));
