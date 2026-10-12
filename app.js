// ===== Toán Vui Lớp 1 =====
const $ = (id) => document.getElementById(id);

const QUESTIONS_PER_ROUND = 10;
const PRAISE = ["Giỏi lắm!", "Tuyệt vời!", "Đúng rồi!", "Siêu quá!", "Bé thông minh quá!"];
const ENCOURAGE = ["Thử lại nào!", "Gần đúng rồi!", "Suy nghĩ thêm chút!", "Cố lên bé!"];
const OBJECTS = [
  { e: "🍎", n: "quả táo" },
  { e: "🐥", n: "chú gà con" },
  { e: "🌸", n: "bông hoa" },
  { e: "⚽", n: "quả bóng" },
  { e: "🐠", n: "con cá" },
  { e: "🍓", n: "quả dâu tây" },
  { e: "🦋", n: "con bướm" },
  { e: "🍊", n: "quả cam" },
  { e: "🐞", n: "con bọ rùa" },
  { e: "⭐", n: "ngôi sao" },
  { e: "🎈", n: "quả bóng bay" },
  { e: "🐢", n: "con rùa" },
];

// ---------- State ----------
let state = { mode: null, qIndex: 0, firstTryCorrect: 0, answered: false };

let store = loadStore();
let soundOn = store.soundOn !== false;

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem("toanVuiLop1")) || {};
  } catch {
    return {};
  }
}
function saveStore() {
  localStorage.setItem("toanVuiLop1", JSON.stringify(store));
}

// ---------- Audio (WebAudio, no files) ----------
let audioCtx = null;
function beep(freq, t0, dur, type = "sine", vol = 0.15) {
  if (!soundOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, audioCtx.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t0 + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(audioCtx.currentTime + t0);
  o.stop(audioCtx.currentTime + t0 + dur);
}
const sfxCorrect = () => { beep(523, 0, .12); beep(659, .1, .12); beep(784, .2, .2); };
const sfxWrong = () => { beep(220, 0, .18, "square", .08); beep(185, .15, .22, "square", .08); };
const sfxFinish = () => { [523, 587, 659, 784, 1047].forEach((f, i) => beep(f, i * .11, .18)); };

// ---------- Vietnamese speech (Web Speech API) ----------
const canSpeak = "speechSynthesis" in window;
let viVoice = null;
let voicesChecked = false;

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  if (voices.length) voicesChecked = true;
  viVoice = voices.find((v) => /^vi([-_]|$)/i.test(v.lang)) || null;
  updateVoiceUI();
}
function updateVoiceUI() {
  const ok = !!viVoice;
  $("btn-speak").classList.toggle("hidden", !ok);
  $("voice-note").classList.toggle("hidden", ok || (canSpeak && !voicesChecked));
}
if (canSpeak) {
  speechSynthesis.onvoiceschanged = pickVoice;
  pickVoice();
  setTimeout(() => { voicesChecked = true; pickVoice(); }, 1500);
}

function speak(text, force = false) {
  if (!text || !viVoice || (!soundOn && !force)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = viVoice;
  u.lang = viVoice.lang;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

// ---------- Helpers ----------
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function optionsFrom(answer, candidates, min, max, count = 4) {
  const set = new Set([answer]);
  for (const c of candidates) if (set.size < count && c >= min && c <= max) set.add(c);
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const v = answer + rnd(7) - 3;
    if (v >= min && v <= max) set.add(v);
  }
  while (set.size < count) set.add(rnd(max - min + 1) + min);
  return shuffle([...set]);
}
const makeOptions = (answer, min, max) => optionsFrom(answer, [], min, max);
const emojiRow = (emoji, n) => Array(n).fill(emoji).join("");

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
function numWords(n) {
  if (n < 10) return DIGITS[n];
  if (n === 100) return "một trăm";
  const t = Math.floor(n / 10);
  const u = n % 10;
  const head = t === 1 ? "mười" : DIGITS[t] + " mươi";
  if (u === 0) return head;
  if (u === 1) return head + (t === 1 ? " một" : " mốt");
  if (u === 5) return head + " lăm";
  return head + " " + DIGITS[u];
}
const W = numWords;
const isHard = () => state.qIndex >= 5;

// ---------- SVG builders ----------
function clockSvg(h) {
  let nums = "";
  for (let i = 1; i <= 12; i++) {
    const a = (i * Math.PI) / 6;
    const x = (50 + 37 * Math.sin(a)).toFixed(1);
    const y = (50 - 37 * Math.cos(a)).toFixed(1);
    nums += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="#2d3436">${i}</text>`;
  }
  return `<svg class="clock" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="47" fill="#fff" stroke="#ff9f43" stroke-width="4"/>
    ${nums}
    <line x1="50" y1="50" x2="50" y2="26" stroke="#2d3436" stroke-width="5" stroke-linecap="round" transform="rotate(${(h % 12) * 30} 50 50)"/>
    <line x1="50" y1="50" x2="50" y2="15" stroke="#e17055" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="3.5" fill="#2d3436"/>
  </svg>`;
}

const CM = 24;
function rulerSvg(n, color) {
  const x0 = 14;
  const maxCm = 13;
  let ticks = "";
  for (let i = 0; i <= maxCm; i++) {
    const x = x0 + i * CM;
    ticks += `<line x1="${x}" y1="50" x2="${x}" y2="64" stroke="#7c2d12" stroke-width="1.5"/>`;
    ticks += `<text x="${x}" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#7c2d12">${i}</text>`;
    if (i < maxCm) ticks += `<line x1="${x + CM / 2}" y1="50" x2="${x + CM / 2}" y2="57" stroke="#7c2d12" stroke-width="1"/>`;
  }
  const end = x0 + n * CM;
  return `<svg class="ruler-svg" viewBox="0 0 ${x0 * 2 + maxCm * CM} 96">
    <rect x="${x0}" y="12" width="${n * CM}" height="24" rx="4" fill="${color}"/>
    <line x1="${end}" y1="36" x2="${end}" y2="50" stroke="#2d3436" stroke-width="1.5" stroke-dasharray="3 2"/>
    <rect x="${x0 - 8}" y="50" width="${maxCm * CM + 16}" height="40" rx="4" fill="#fde68a" stroke="#d97706"/>
    ${ticks}
  </svg>`;
}

function barsSvg(a, b) {
  const x0 = 10;
  return `<svg class="ruler-svg" viewBox="0 0 ${x0 * 2 + 12 * CM} 100">
    <rect x="${x0}" y="14" width="${a * CM}" height="26" rx="5" fill="#54a0ff"/>
    <rect x="${x0}" y="60" width="${b * CM}" height="26" rx="5" fill="#ff6b6b"/>
  </svg>`;
}

function blocksSvg(t, u) {
  const S = 11;
  let x = 5;
  let out = "";
  for (let i = 0; i < t; i++) {
    for (let k = 0; k < 10; k++) {
      out += `<rect x="${x}" y="${5 + k * S}" width="${S}" height="${S}" fill="#54a0ff" stroke="#fff"/>`;
    }
    x += S + 6;
  }
  x += 8;
  for (let k = 0; k < u; k++) {
    out += `<rect x="${x}" y="${5 + (9 - k) * S}" width="${S}" height="${S}" fill="#ff9f43" stroke="#fff"/>`;
  }
  const w = x + (u ? S : 0) + 5;
  const h = 10 * S + 10;
  return `<svg class="blocks" viewBox="0 0 ${w} ${h}" width="${w * 1.2}" height="${h * 1.2}">${out}</svg>`;
}

// ---------- Question generators ----------
// Each returns { html, speak, visual, options, answer }
const generators = {
  count() {
    const n = 1 + rnd(10);
    const o = pick(OBJECTS);
    const text = `Bé đếm xem có bao nhiêu ${o.n}?`;
    return {
      html: text,
      speak: text,
      visual: `<div class="eq">${emojiRow(o.e, n)}</div>`,
      options: makeOptions(n, 1, 10),
      answer: n,
    };
  },

  add() {
    if (!isHard()) {
      let a, b;
      do {
        a = rnd(11);
        b = rnd(11 - a);
      } while (a === 0 && b === 0);
      const ea = pick(OBJECTS).e;
      const eb = pick(OBJECTS).e;
      return {
        html: `${a} + ${b} = ?`,
        speak: `${W(a)} cộng ${W(b)} bằng mấy?`,
        visual:
          `<div class="count-group group-a">${a > 0 ? emojiRow(ea, a) : "0"}</div>` +
          `<div class="count-group op">+</div>` +
          `<div class="count-group group-b">${b > 0 ? emojiRow(eb, b) : "0"}</div>`,
        options: makeOptions(a + b, 0, 10),
        answer: a + b,
      };
    }
    // Không nhớ trong phạm vi 100
    let a, b;
    do {
      a = 10 + rnd(89);
      b = 1 + rnd(89);
    } while ((a % 10) + (b % 10) > 9 || a + b > 99);
    return {
      html: "Tính nhẩm nào!",
      speak: `${W(a)} cộng ${W(b)} bằng mấy?`,
      visual: `<div class="eq">${a} + ${b} = <span class="blank">?</span></div>`,
      options: optionsFrom(a + b, [a + b + 10, a + b - 10], 0, 99),
      answer: a + b,
    };
  },

  sub() {
    if (!isHard()) {
      const a = 1 + rnd(10);
      const b = rnd(a + 1);
      const ea = pick(OBJECTS).e;
      return {
        html: `${a} - ${b} = ?`,
        speak: `${W(a)} trừ ${W(b)} bằng mấy?`,
        visual: `<div class="eq">${emojiRow(ea, a)}</div>` +
                `<div class="eq" style="font-size:1.2rem;color:#e17055">(bớt đi ${b})</div>`,
        options: makeOptions(a - b, 0, 10),
        answer: a - b,
      };
    }
    let a, b;
    do {
      a = 10 + rnd(90);
      b = 1 + rnd(a);
    } while (a % 10 < b % 10 || b > a);
    return {
      html: "Tính nhẩm nào!",
      speak: `${W(a)} trừ ${W(b)} bằng mấy?`,
      visual: `<div class="eq">${a} - ${b} = <span class="blank">?</span></div>`,
      options: optionsFrom(a - b, [a - b + 10, a - b - 10], 0, 99),
      answer: a - b,
    };
  },

  compare() {
    const max = isHard() ? 99 : 20;
    const a = rnd(max + 1);
    const b = rnd(max + 1);
    const ans = a > b ? ">" : a < b ? "<" : "=";
    return {
      html: "Chọn dấu đúng nào?",
      speak: `So sánh ${W(a)} và ${W(b)}. Chọn dấu lớn hơn, bé hơn, hoặc bằng.`,
      visual: `<div class="eq">${a} <span class="blank">?</span> ${b}</div>`,
      options: shuffle([">", "<", "="]),
      answer: ans,
    };
  },

  missing() {
    const kind = rnd(3);
    const blank = `<span class="blank">?</span>`;
    if (kind === 0) {
      const start = rnd(8);
      const seq = [start + 1, start + 2, start + 3, start + 4];
      const idx = 1 + rnd(2);
      const missing = seq[idx];
      return {
        html: "Số nào còn thiếu?",
        speak: `Dãy số: ${seq.map((v, i) => (i === idx ? "mấy" : W(v))).join(", ")}. Số nào còn thiếu?`,
        visual: `<div class="eq">${seq.map((v, i) => (i === idx ? blank : v)).join(", ")}</div>`,
        options: makeOptions(missing, 1, 12),
        answer: missing,
      };
    }
    const c = 2 + rnd(9);
    const a = rnd(c);
    const miss = c - a;
    if (kind === 1) {
      return {
        html: "Điền số vào chỗ trống",
        speak: `${W(a)} cộng mấy bằng ${W(c)}?`,
        visual: `<div class="eq">${a} + ${blank} = ${c}</div>`,
        options: makeOptions(miss, 0, 10),
        answer: miss,
      };
    }
    return {
      html: "Điền số vào chỗ trống",
      speak: `${W(c)} trừ mấy bằng ${W(a)}?`,
      visual: `<div class="eq">${c} - ${blank} = ${a}</div>`,
      options: makeOptions(miss, 0, 10),
      answer: miss,
    };
  },

  number100() {
    const kind = rnd(3);
    if (kind === 0) {
      const t = 1 + rnd(9);
      const u = rnd(10);
      const n = t * 10 + u;
      const swapped = u > 0 ? u * 10 + t : -1;
      return {
        html: `Số gồm ${t} chục và ${u} đơn vị là số nào?`,
        speak: `Số gồm ${W(t)} chục và ${W(u)} đơn vị là số nào?`,
        visual: blocksSvg(t, u),
        options: optionsFrom(n, [swapped, n + 10, n - 10, n + 1], 10, 99),
        answer: n,
      };
    }
    if (kind === 1) {
      const n = 11 + rnd(88);
      const after = rnd(2) === 0;
      const ans = after ? n + 1 : n - 1;
      const word = after ? "liền sau" : "liền trước";
      return {
        html: `Số ${word} của ${n} là số nào?`,
        speak: `Số ${word} của ${W(n)} là số nào?`,
        visual: `<div class="eq">${after ? `${n}, <span class="blank">?</span>` : `<span class="blank">?</span>, ${n}`}</div>`,
        options: optionsFrom(ans, [after ? n - 1 : n + 1, n, ans + 10], 10, 99),
        answer: ans,
      };
    }
    const n = 10 + rnd(90);
    const t = Math.floor(n / 10);
    const u = n % 10;
    const swapped = u > 0 ? u * 10 + t : -1;
    return {
      html: `Số «${W(n)}» viết là:`,
      speak: `Số ${W(n)} viết là số nào?`,
      visual: "",
      options: optionsFrom(n, [swapped, n + 10, n - 10, n + 1], 10, 99),
      answer: n,
    };
  },

  clock() {
    const h = 1 + rnd(12);
    const others = shuffle([...Array(12).keys()].map((i) => i + 1).filter((x) => x !== h)).slice(0, 3);
    return {
      html: "Đồng hồ chỉ mấy giờ?",
      speak: "Đồng hồ chỉ mấy giờ?",
      visual: clockSvg(h),
      options: shuffle([h, ...others]).map((x) => `${x} giờ`),
      answer: `${h} giờ`,
    };
  },

  length() {
    if (rnd(2) === 0) {
      const n = 2 + rnd(11);
      const color = pick(["#2ecc71", "#54a0ff", "#ff6b6b", "#a55eea"]);
      return {
        html: "Băng giấy dài mấy xăng-ti-mét?",
        speak: "Băng giấy dài mấy xăng-ti-mét?",
        visual: rulerSvg(n, color),
        options: optionsFrom(n, [n + 1, n - 1], 1, 13).map((x) => `${x} cm`),
        answer: `${n} cm`,
      };
    }
    let a, b;
    do {
      a = 3 + rnd(10);
      b = 3 + rnd(10);
    } while (Math.abs(a - b) < 2);
    const askLonger = rnd(2) === 0;
    const blueWins = askLonger ? a > b : a < b;
    const word = askLonger ? "dài hơn" : "ngắn hơn";
    return {
      html: `Băng giấy nào ${word}?`,
      speak: `Băng giấy nào ${word}?`,
      visual: barsSvg(a, b),
      options: ["Băng xanh", "Băng đỏ"],
      answer: blueWins ? "Băng xanh" : "Băng đỏ",
    };
  },

  shapes() {
    const shapes = [
      { name: "Hình tròn", svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#54a0ff"/></svg>` },
      { name: "Hình vuông", svg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="6" fill="#ff6b6b"/></svg>` },
      { name: "Hình tam giác", svg: `<svg viewBox="0 0 100 100"><polygon points="50,8 94,90 6,90" fill="#2ecc71"/></svg>` },
      { name: "Hình chữ nhật", svg: `<svg viewBox="0 0 100 100"><rect x="6" y="24" width="88" height="52" rx="6" fill="#f9b234"/></svg>` },
    ];
    const s = pick(shapes);
    return {
      html: "Đây là hình gì?",
      speak: "Đây là hình gì?",
      visual: `<div class="shape">${s.svg}</div>`,
      options: shuffle(shapes.map((x) => x.name)),
      answer: s.name,
    };
  },
};

const MODES = [
  { id: "count",     emoji: "🔢", name: "Đếm số",        desc: "Đếm đồ vật từ 1 đến 10" },
  { id: "add",       emoji: "➕", name: "Phép cộng",     desc: "Phạm vi 10 và 100 (không nhớ)" },
  { id: "sub",       emoji: "➖", name: "Phép trừ",      desc: "Phạm vi 10 và 100 (không nhớ)" },
  { id: "compare",   emoji: "⚖️", name: "So sánh",       desc: "Lớn hơn, bé hơn hay bằng?" },
  { id: "missing",   emoji: "🕵️", name: "Tìm số thiếu",  desc: "Số nào đang trốn?" },
  { id: "number100", emoji: "💯", name: "Số đến 100",    desc: "Chục, đơn vị, liền trước, liền sau" },
  { id: "clock",     emoji: "🕒", name: "Xem đồng hồ",   desc: "Đồng hồ chỉ mấy giờ?" },
  { id: "length",    emoji: "📏", name: "Đo độ dài",     desc: "Xăng-ti-mét, dài hơn, ngắn hơn" },
  { id: "shapes",    emoji: "🔷", name: "Hình học",      desc: "Nhận biết các hình" },
];

// ---------- Rendering ----------
function show(id) {
  ["menu", "game", "result"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
}

function renderMenu() {
  if (canSpeak) speechSynthesis.cancel();
  $("mode-grid").innerHTML = MODES.map((m) => {
    const best = (store.modes && store.modes[m.id]) || 0;
    return `<button class="mode-card" data-mode="${m.id}">
      <span class="mode-emoji">${m.emoji}</span>
      <div class="mode-name">${m.name}</div>
      <div class="mode-desc">${m.desc}</div>
      <div class="mode-stars">${"⭐".repeat(best)}${"☆".repeat(3 - best)}</div>
    </button>`;
  }).join("");
  document.querySelectorAll(".mode-card").forEach((b) =>
    b.addEventListener("click", () => startRound(b.dataset.mode))
  );
  $("total-stars").textContent = totalStars();
  show("menu");
}

function totalStars() {
  return Object.values(store.modes || {}).reduce((a, b) => a + b, 0);
}

function startRound(mode) {
  state = { mode, qIndex: 0, firstTryCorrect: 0, answered: false };
  $("round-stars").textContent = 0;
  renderProgress();
  nextQuestion();
  show("game");
}

function renderProgress() {
  $("progress").innerHTML = Array(QUESTIONS_PER_ROUND)
    .fill(0)
    .map((_, i) => `<div class="dot ${i < state.qIndex ? "done" : i === state.qIndex ? "now" : ""}"></div>`)
    .join("");
}

function nextQuestion() {
  if (state.qIndex >= QUESTIONS_PER_ROUND) return finishRound();
  state.answered = false;
  const q = generators[state.mode]();
  state.current = q;
  renderProgress();
  $("question-text").textContent = q.html;
  $("question-visual").innerHTML = q.visual;
  const opts = $("options");
  opts.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => onAnswer(btn, opt));
    opts.appendChild(btn);
  });
  speak(q.speak);
}

function onAnswer(btn, opt) {
  if (state.answered) return;
  const q = state.current;
  if (String(opt) === String(q.answer)) {
    state.firstTryCorrect += btn.dataset.retry ? 0 : 1;
    state.answered = true;
    btn.classList.add("correct");
    [...$("options").children].forEach((b) => { if (b !== btn) b.classList.add("dim"); });
    $("round-stars").textContent = state.firstTryCorrect;
    sfxCorrect();
    showFeedback(true);
    spawnStars();
    setTimeout(() => {
      hideFeedback();
      state.qIndex++;
      nextQuestion();
    }, 1500);
  } else {
    sfxWrong();
    btn.classList.add("wrong", "dim");
    btn.disabled = true;
    [...$("options").children].forEach((b) => { b.dataset.retry = "1"; });
    showFeedback(false);
    setTimeout(hideFeedback, 1100);
  }
}

function showFeedback(good) {
  const box = $("feedback-box");
  box.className = "feedback-box " + (good ? "good" : "bad");
  const text = good ? pick(PRAISE) : pick(ENCOURAGE);
  $("feedback-emoji").textContent = good ? pick(["🎉", "🌟", "🥳", "👏", "💯"]) : "🤔";
  $("feedback-text").textContent = text;
  $("feedback").classList.remove("hidden");
  speak(text);
}
function hideFeedback() { $("feedback").classList.add("hidden"); }

function spawnStars() {
  const card = $("question-card").getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const s = document.createElement("div");
    s.className = "star-fly";
    s.textContent = "⭐";
    s.style.left = card.left + card.width / 2 + (rnd(160) - 80) + "px";
    s.style.top = card.top + card.height / 2 + "px";
    s.style.animationDelay = i * 0.06 + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
}

function finishRound() {
  const score = state.firstTryCorrect;
  const stars = score >= 10 ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0;
  store.modes = store.modes || {};
  const prev = store.modes[state.mode] || 0;
  if (stars > prev) {
    store.modes[state.mode] = stars;
    saveStore();
  }
  sfxFinish();
  const msg =
    stars === 3 ? "Xuất sắc! Bé là siêu sao Toán!" :
    stars === 2 ? "Rất giỏi! Chút nữa là trọn vẹn!" :
    stars === 1 ? "Khá lắm! Luyện thêm nhé!" : "Không sao, chơi lại sẽ giỏi hơn!";
  $("result-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  $("result-text").textContent = msg;
  $("result-sub").textContent = `Bé trả lời đúng ${score}/${QUESTIONS_PER_ROUND} câu ở lần đầu.`;
  speak(msg);
  show("result");
}

// ---------- Events ----------
$("btn-back").addEventListener("click", renderMenu);
$("btn-menu").addEventListener("click", renderMenu);
$("btn-replay").addEventListener("click", () => startRound(state.mode));
$("btn-speak").addEventListener("click", () => state.current && speak(state.current.speak, true));
$("sound-toggle").addEventListener("click", () => {
  soundOn = !soundOn;
  store.soundOn = soundOn;
  saveStore();
  $("sound-toggle").textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) sfxCorrect();
  else if (canSpeak) speechSynthesis.cancel();
});
$("sound-toggle").textContent = soundOn ? "🔊" : "🔇";

updateVoiceUI();
renderMenu();
