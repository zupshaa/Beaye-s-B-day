(() => {
"use strict";
const MUSIC = "assets/music.mp3"; // optional: drop an mp3 here; ignored if missing
const TURN = 1200;
const $ = s => document.querySelector(s);
const book = $("#book"), stage = $("#stage"), hint = $("#hint"), root = document.documentElement;
const leaves = [...document.querySelectorAll(".leaf")];
const candles = [...document.querySelectorAll(".candle")].sort((a, b) => a.dataset.i - b.dataset.i);
const bgm = $("#bgm");
// Restart button + styles are injected here, so script.js alone is enough to update
if (!$("#restart")) {
  const st = document.createElement("style");
  st.textContent = "#restart{position:absolute;left:50%;top:76%;transform:translateX(-50%);z-index:30;padding:.7em 1.5em;border-radius:99px;border:1px solid rgba(240,228,210,.55);color:rgba(240,228,210,.9);font:italic calc(var(--pw)*.034) Georgia,serif;letter-spacing:.04em;background:rgba(255,255,255,.06);transition:background .3s,opacity .3s;opacity:.85;cursor:pointer}#restart:hover,#restart:focus-visible{background:rgba(255,255,255,.18);opacity:1}";
  document.head.appendChild(st);
  const rb = document.createElement("button");
  rb.id = "restart"; rb.type = "button"; rb.setAttribute("aria-label", "Read the booklet again"); rb.textContent = "\u21BA Read again";
  document.querySelector(".p10").appendChild(rb);
}

// t = number of leaves turned: 0 cover, 1 spread(p2|p3), 2 (p4|p5), 3 (p6|p7), 4 (p8|p9), 5 back cover (p10)
const S = { t: 0, side: "R", env: 0, out: 0, wish: false, busy: false, single: false };

function layout() {
  const w = innerWidth, h = innerHeight;
  S.single = w < 760 || w / h < 1;
  const ph = Math.floor(S.single ? Math.min(h * .9, w * .94 / .8) : Math.min(h * .9, w * .96 / 1.6));
  root.style.setProperty("--ph", ph + "px");
  root.style.setProperty("--pw", ph * .8 + "px");
  place();
}
function place() {
  const k = S.single ? (S.side === "R" ? -.5 : .5) : (S.t === 0 ? -.5 : S.t === 5 ? .5 : 0);
  book.style.setProperty("--shift", k);
  book.classList.toggle("open", S.t > 0 && S.t < 5);
  sync(); updateHint();
}
function sync() {
  leaves.forEach((l, i) => {
    l.classList.toggle("flipped", i < S.t);
    if (!l.classList.contains("turning")) l.style.zIndex = i < S.t ? i + 1 : 10 - i;
  });
}
function canNext() {
  if (S.t === 1) return S.out === 3;
  if (S.t === 2) return S.wish;
  return S.t < 5;
}
function go(dir, force) {
  if (S.busy && !force) return;
  if (S.single && S.t > 0 && S.t < 5) { // pan between the two pages of a spread
    if (dir > 0 && S.side === "L") { S.side = "R"; return place(); }
    if (dir < 0 && S.side === "R") { S.side = "L"; return place(); }
  }
  const n = S.t + dir;
  if (n < 0 || n > 5 || (dir > 0 && !canNext())) return;
  const leaf = leaves[dir > 0 ? S.t : S.t - 1];
  S.busy = true; leaf.style.zIndex = 30; leaf.classList.add("turning");
  S.t = n; S.side = dir > 0 ? "L" : "R";
  place();
  setTimeout(() => { leaf.classList.remove("turning"); S.busy = false; sync(); updateHint(); }, TURN + 60);
}
function openEnvelope() {
  if (S.env || S.busy || S.t !== 1) return;
  S.env = 1; S.busy = true; updateHint();
  const env = $("#env"), clip = $("#clip"), letter = $("#letter");
  env.classList.add("open");
  setTimeout(() => letter.classList.add("rise"), 750);
  setTimeout(() => { clip.classList.add("free"); letter.classList.add("settled"); env.classList.add("gone"); }, 2200);
  setTimeout(() => { letter.tabIndex = 0; S.env = 2; S.busy = false; updateHint(); }, 3700);
}
function blow(c) {
  if (S.t !== 1 || S.busy || S.out >= 3) return;
  c = c && !c.classList.contains("out") ? c : candles.find(x => !x.classList.contains("out"));
  if (!c) return;
  c.classList.add("out"); c.disabled = true; S.out++; updateHint();
  if (S.out === 3) {
    S.busy = true; startMusic();
    setTimeout(() => { S.busy = false; go(1); }, 450);
  }
}
function flipWish() {
  if (S.wish || S.busy || S.t !== 2) return;
  S.busy = true;
  const yet = $("#yet"), my = $("#my");
  yet.classList.add("out");
  setTimeout(() => { my.classList.add("in"); S.wish = true; }, 350);
  setTimeout(() => { yet.classList.add("gone"); S.busy = false; updateHint(); }, 1700);
}
function resetState() {
  candles.forEach(c => { c.classList.remove("out"); c.disabled = false; });
  $("#env").classList.remove("open", "gone");
  $("#clip").classList.remove("free");
  const l = $("#letter"); l.classList.remove("rise", "settled"); l.tabIndex = -1;
  $("#yet").classList.remove("out", "gone");
  $("#my").classList.remove("in");
  $("#zoom").hidden = true;
  Object.assign(S, { env: 0, out: 0, wish: false, side: "R" });
  stopMusic();
}
// Rewinds the booklet leaf by leaf back to the cover, then resets every interaction
function restart() {
  if (S.busy || S.t !== 5) return;
  S.busy = true; hint.textContent = "";
  const step = () => {
    if (S.t > 0) {
      const leaf = leaves[S.t - 1];
      leaf.style.zIndex = 40 - (S.t - 1); leaf.classList.add("turning");
      S.t--; S.side = "R"; place();
      setTimeout(() => { leaf.classList.remove("turning"); sync(); }, TURN + 60);
      setTimeout(step, 450);
    } else setTimeout(() => { resetState(); S.busy = false; place(); }, TURN + 100);
  };
  step();
}
function stopMusic() {
  if (!bgm.src) return;
  let v = bgm.volume;
  const f = setInterval(() => {
    v = Math.max(0, v - .08); bgm.volume = v;
    if (v <= 0) { clearInterval(f); bgm.pause(); bgm.currentTime = 0; }
  }, 100);
}
function startMusic() {
  try {
    bgm.src = MUSIC; bgm.volume = 0;
    const p = bgm.play(); if (p) p.then(() => {
      let v = 0; const f = setInterval(() => { v = Math.min(.7, v + .035); bgm.volume = v; if (v >= .7) clearInterval(f); }, 120);
    }).catch(() => {});
  } catch (e) {}
}
function updateHint() {
  let h = "";
  if (S.t === 0) h = "Tap the cover to open";
  else if (S.t === 1 && S.single && S.side === "L" && S.out < 3) h = S.env === 0 ? "Tap the envelope" : "Swipe left to see the cake";
  else if (S.t === 1) h = S.env === 0 ? "Tap the envelope · then blow out the candles" : S.out < 3 ? `Blow out the candles (${3 - S.out} left)` : "";
  else if (S.t === 2) h = S.wish ? "Tap the right page to keep turning" : (S.single && S.side === "L" ? "Tap to see the next page" : "Tap the page");
  else if (S.t < 5) h = "Tap the right page to turn · the left page to go back";
  else h = "Tap \u201cRead again\u201d to start over";
  hint.textContent = h;
}
// input
let down = null, swiped = false;
stage.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; swiped = false; });
stage.addEventListener("pointerup", e => {
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; go(dx < 0 ? 1 : -1); }
});
stage.addEventListener("click", e => {
  if (swiped) { swiped = false; return; }
  const t = e.target;
  if (t.closest("#letter.settled")) { $("#zoom").hidden = false; return; }
  if (t.closest("#restart")) return restart();
  if (t.closest("#envBtn")) return openEnvelope();
  if (t.closest(".cover")) return go(1);
  if (S.t === 1 && t.closest(".p3")) return blow(t.closest(".candle"));
  if (S.t === 2 && t.closest(".p5") && !S.wish) return flipWish();
  const cx = S.single ? innerWidth / 2 : book.getBoundingClientRect().left + book.offsetWidth / 2;
  go(e.clientX < cx ? -1 : 1);
});
$("#yet").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipWish(); } });
$("#zoom").addEventListener("click", () => { $("#zoom").hidden = true; });
addEventListener("keydown", e => {
  if (e.key === "Escape") $("#zoom").hidden = true;
  else if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if ((e.key === "r" || e.key === "R") && S.t === 5) restart();
});
addEventListener("resize", layout);
layout();
})();
