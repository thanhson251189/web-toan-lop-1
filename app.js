// ===== Toán Vui Lớp 1 =====
const $ = (id) => document.getElementById(id);

const QUESTIONS_PER_ROUND = 10;
const PRAISE = ["Giỏi lắm!", "Tuyệt vời!", "Đúng rồi!", "Siêu quá!", "Bé thông minh quá!"];
const ENCOURAGE = ["Thử lại nào!", "Gần đúng rồi!", "Suy nghĩ thêm chút!", "Cố lên bé!"];
const OBJECTS = ["🍎", "🐥", "🌸", "⚽", "🐠", "🍓", "🦋", "🍊", "🐞", "⭐", "🎈", "🐢"];

// ---------- State ----------
let state = {
  mode: null,
  qIndex: 0,
  firstTryCorrect: 0,
  answered: false,
};

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
function makeOptions(answer, min, max, count = 4) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < count && guard++ < 100) {
    const v = answer + (rnd(7) - 3);
    if (v >= min && v <= max) set.add(v);
  }
  while (set.size < count) set.add(rnd(max - min + 1) + min);
  return shuffle([...set]);
}
const emojiRow = (emoji, n) => Array(n).fill(emoji).join("");

// ---------- Question generators ----------
// Each returns { html, visual, options: [...], answer }
const generators = {
  count() {
    const n = 1 + rnd(10);
    const emoji = pick(OBJECTS);
    return {
      html: `Bé đếm xem có bao nhiêu ${emoji}?`,
      visual: `<div class="eq">${emojiRow(emoji, n)}</div>`,
      options: makeOptions(n, 1, 10),
      answer: n,
    };
  },

  add() {
    const hard = state.qIndex >= 5; // câu sau: phạm vi 20
    const maxSum = hard ? 20 : 10;
    let a, b;
    do {
      a = rnd(maxSum + 1);
      b = rnd(maxSum + 1 - a);
    } while (a === 0 && b === 0);
    const ea = pick(OBJECTS);
    const eb = pick(OBJECTS);
    return {
      html: `${a} + ${b} = ?`,
      visual:
        `<div class="count-group group-a">${a > 0 ? emojiRow(ea, a) : "0"}</div>` +
        `<div class="count-group op">+</div>` +
        `<div class="count-group group-b">${b > 0 ? emojiRow(eb, b) : "0"}</div>`,
      options: makeOptions(a + b, 0, maxSum),
      answer: a + b,
    };
  },

  sub() {
    const hard = state.qIndex >= 5;
    const max = hard ? 20 : 10;
    const a = rnd(max + 1);
    const b = rnd(a + 1);
    const ea = pick(OBJECTS);
    return {
      html: `${a} - ${b} = ?`,
      visual: `<div class="eq">${emojiRow(ea, a)}</div>` +
              `<div class="eq" style="font-size:1.2rem;color:#e17055">(bớt đi ${b})</div>`,
      options: makeOptions(a - b, 0, max),
      answer: a - b,
    };
  },

  compare() {
    const hard = state.qIndex >= 5;
    const max = hard ? 99 : 20;
    const a = rnd(max + 1);
    const b = rnd(max + 1);
    const ans = a > b ? ">" : a < b ? "<" : "=";
    return {
      html: "Chọn dấu đúng nào?",
      visual: `<div class="eq">${a} <span class="blank">?</span> ${b}</div>`,
      options: shuffle([">", "<", "="]),
      answer: ans,
    };
  },

  missing() {
    const kind = rnd(3);
    if (kind === 0) {
      // dãy số: 3, 4, _, 6
      const start = rnd(8);
      const seq = [start + 1, start + 2, start + 3, start + 4];
      const idx = 1 + rnd(2); // che số ở giữa dãy
      const missing = seq[idx];
      const shown = seq.map((v, i) => (i === idx ? `<span class="blank">?</span>` : v)).join(", ");
      return {
        html: "Số nào còn thiếu?",
        visual: `<div class="eq">${shown}</div>`,
        options: makeOptions(missing, 1, 12),
        answer: missing,
      };
    }
    if (kind === 1) {
      // a + _ = c
      const c = 2 + rnd(9);
      const a = rnd(c);
      const miss = c - a;
      return {
        html: "Điền số vào chỗ trống",
        visual: `<div class="eq">${a} + <span class="blank">?</span> = ${c}</div>`,
        options: makeOptions(miss, 0, 10),
        answer: miss,
      };
    }
    // c - _ = a
    const c = 2 + rnd(9);
    const a = rnd(c);
    const miss = c - a;
    return {
      html: "Điền số vào chỗ trống",
      visual: `<div class="eq">${c} - <span class="blank">?</span> = ${a}</div>`,
      options: makeOptions(miss, 0, 10),
      answer: miss,
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
      visual: `<div class="shape">${s.svg}</div>`,
      options: shuffle(shapes.map((x) => x.name)),
      answer: s.name,
    };
  },
};

const MODES = [
  { id: "count",   emoji: "🔢", name: "Đếm số",      desc: "Đếm đồ vật từ 1 đến 10" },
  { id: "add",     emoji: "➕", name: "Phép cộng",   desc: "Cộng trong phạm vi 10 và 20" },
  { id: "sub",     emoji: "➖", name: "Phép trừ",    desc: "Trừ trong phạm vi 10 và 20" },
  { id: "compare", emoji: "⚖️", name: "So sánh",     desc: "Lớn hơn, bé hơn hay bằng?" },
  { id: "missing", emoji: "🕵️", name: "Tìm số thiếu", desc: "Số nào đang trốn?" },
  { id: "shapes",  emoji: "🔷", name: "Hình học",    desc: "Nhận biết các hình" },
];

// ---------- Rendering ----------
function show(id) {
  ["menu", "game", "result"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
}

function renderMenu() {
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
  $("question-text").innerHTML = q.html;
  $("question-visual").innerHTML = q.visual;
  const opts = $("options");
  opts.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.innerHTML = opt;
    btn.addEventListener("click", () => onAnswer(btn, opt));
    opts.appendChild(btn);
  });
}

function onAnswer(btn, opt) {
  const q = state.current;
  const ok = opt === q.answer || String(opt) === String(q.answer);
  if (ok) {
    if (!state.answered) state.firstTryCorrect++;
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
    }, 1300);
  } else {
    sfxWrong();
    btn.classList.add("wrong", "dim");
    btn.disabled = true;
    showFeedback(false);
    setTimeout(hideFeedback, 1100);
  }
}

function showFeedback(good) {
  const fb = $("feedback"), box = $("feedback-box");
  box.className = "feedback-box " + (good ? "good" : "bad");
  $("feedback-emoji").textContent = good ? pick(["🎉", "🌟", "🥳", "👏", "💯"]) : "🤔";
  $("feedback-text").textContent = good ? pick(PRAISE) : pick(ENCOURAGE);
  fb.classList.remove("hidden");
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
  $("result-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  $("result-text").textContent =
    stars === 3 ? "Xuất sắc! Bé là siêu sao Toán!" :
    stars === 2 ? "Rất giỏi! Chút nữa là trọn vẹn!" :
    stars === 1 ? "Khá lắm! Luyện thêm nhé!" : "Không sao, chơi lại sẽ giỏi hơn!";
  $("result-sub").textContent = `Bé trả lời đúng ${score}/${QUESTIONS_PER_ROUND} câu ở lần đầu.`;
  show("result");
}

// ---------- Events ----------
$("btn-back").addEventListener("click", renderMenu);
$("btn-menu").addEventListener("click", renderMenu);
$("btn-replay").addEventListener("click", () => startRound(state.mode));
$("sound-toggle").addEventListener("click", () => {
  soundOn = !soundOn;
  store.soundOn = soundOn;
  saveStore();
  $("sound-toggle").textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) sfxCorrect();
});
$("sound-toggle").textContent = soundOn ? "🔊" : "🔇";

renderMenu();
