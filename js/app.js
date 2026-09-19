/* ============================================================
   Hanzi Quest — views, the study session, and the writing canvas.
   ============================================================ */

/* Components that teach a family but aren't themselves on the syllabus. */
const RADICAL_GLOSS = {
  "土":["tǔ","earth, soil"], "辶":["chuò","walking; movement"], "讠":["yán","speech (compressed 言)"],
  "隹":["zhuī","short-tailed bird"], "寸":["cùn","an inch; a measure"], "王":["wáng","jade; king"],
  "见":["jiàn","to see"], "兑":["duì","to exchange"], "斤":["jīn","an axe"], "乞":["qǐ","to beg"],
  "矢":["shǐ","an arrow"], "钅":["jīn","metal (compressed 金)"], "立":["lì","to stand"],
  "刀":["dāo","a knife"], "纟":["sī","silk (compressed 糸)"], "青":["qīng","blue-green; young"],
  "父":["fù","father"], "且":["qiě","moreover"], "又":["yòu","again; a hand"], "巾":["jīn","a cloth"],
  "夕":["xī","evening"], "主":["zhǔ","master; host"], "食":["shí","food (compressed 飠)"],
  "鸟":["niǎo","a bird"], "虫":["chóng","creeping creature"], "石":["shí","stone"],
  "贝":["bèi","cowrie shell; money"], "力":["lì","strength"], "者":["zhě","one who…"],
  "衣":["yī","clothing"], "足":["zú","a foot"], "止":["zhǐ","to stop; a footprint"], "田":["tián","a field"],
  "囗":["wéi","an enclosure; a border"], "宀":["mián","a roof"], "豕":["shǐ","a pig"],
  "页":["yè","a head; a page"], "亲":["qīn","close; kin"], "冫":["bīng","ice (two strokes, not three)"],
  "欠":["qiàn","to owe; a person yawning"], "母":["mǔ","mother"], "舌":["shé","tongue"],
  "甘":["gān","sweet"], "广":["guǎng","a lean-to roof; a shelter"], "戈":["gē","a halberd"],
  "酉":["yǒu","a wine jar; fermentation"], "艹":["cǎo","grass (compressed 艸)"],
  "犭":["quǎn","beast (compressed 犬)"], "八":["bā","eight; dividing"]
};
const gloss = c => CHAR_INDEX[c] ? [CHAR_INDEX[c].p, CHAR_INDEX[c].m] : (RADICAL_GLOSS[c] || ["", ""]);

/* ---------- tiny helpers ---------- */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
/* shuffle lives in data.js — srs.js needs it as well */
const pick = (arr, n) => shuffle([...arr]).slice(0, n);
const one = arr => arr[(Math.random() * arr.length) | 0];

/* Nobody types tone marks, so searches compare against bare letters. "shui"
   finds 水, and "lv" finds 绿 — the usual keyboard stand-in for ü. */
const bare = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const searchable = q => bare(q).replace(/v/g, "u");
const matches = (ch, q) => {
  const n = searchable(q);
  return ch.c.includes(q) || searchable(ch.p).includes(n) || bare(ch.m).includes(bare(q));
};

/* Tone contour — the shape your voice makes. */
const TONE_PATHS = { 1:"M3,5 L17,5", 2:"M3,14 L17,5", 3:"M3,6 L7,13 L12,13 L17,5", 4:"M3,5 L17,14", 5:"M9,9 L11,9" };
function toneMark(pinyin) {
  const t = toneOf(pinyin);
  return `<span class="tone" title="Tone ${t === 5 ? "neutral" : t}">
    <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true"><path d="${TONE_PATHS[t]}"/></svg>
    ${t === 5 ? "·" : t}</span>`;
}

/* Grammar tags — which kind of word this is. */
const TAG_CLASS = p => p === "v" ? "v" : p === "adj" ? "adj" : p.startsWith("part") ? "part"
  : ["n","num","mw"].includes(p) ? "n" : "fn";
const posTags = ch => `<div class="tags">${ch.pos.map(p =>
  `<span class="tag ${TAG_CLASS(p)}">${esc(POS_LABEL[p] || p)}</span>`).join("")}</div>`;

/* The 田字格 a Chinese schoolchild writes into. */
const TIAN_SVG = `<svg class="tian-grid" viewBox="0 0 100 100" aria-hidden="true">
  <rect class="edge" x="1" y="1" width="98" height="98" rx="2"/>
  <line class="mid" x1="50" y1="1" x2="50" y2="99"/>
  <line class="mid" x1="1" y1="50" x2="99" y2="50"/>
  <line class="mid" x1="1" y1="1" x2="99" y2="99"/>
  <line class="mid" x1="99" y1="1" x2="1" y2="99"/>
</svg>`;

/* ---------- audio ----------

   Browser speech synthesis is fragile in three well-known ways, all of which
   show up as "the audio stopped working after a while":

   1. Chrome garbage-collects a SpeechSynthesisUtterance that nothing holds a
      reference to, cutting playback off mid-word and jamming the queue. The
      live one is kept in `liveUtterance` for exactly this reason.
   2. The engine can be left `paused` — after a tab blur, or an interrupted
      cancel — and every later speak() then queues silently forever.
   3. cancel() is asynchronous, so speaking in the same tick can drop the new
      utterance and leave `speaking` stuck true with nothing playing.

   So: hold the reference, resume before speaking, let cancel land, and keep a
   watchdog that clears a wedged engine instead of queueing behind a ghost. */

/* ---------- bundled clips ----------

   The browser's speech engine is unreliable here: it is blocked outright in
   the cross-origin frame this page is embedded in, and several voices macOS
   lists have no voice data and produce silence. So every character ships with
   a recorded clip, played through a plain <audio> element, which works where
   speechSynthesis does not. Words and sentences still fall back to the engine. */

let audioEl = null, audioUnlocked = false;
const clipFor = t => (window.HQ_AUDIO && window.HQ_AUDIO[t]) || null;

/* js/audio.js is generated, not hand-written, and a clone that hasn't run
   tools/make-audio.mjs simply 404s it — silently, the way a missing script
   always does. Knowing that lets Settings say so instead of leaving someone
   turning the volume up at a page that was never going to make a sound. */
const clipCount = () => (window.HQ_AUDIO && Object.keys(window.HQ_AUDIO).length) || 0;

function ensureAudioEl() {
  if (!audioEl) { audioEl = new Audio(); audioEl.preload = "auto"; }
  return audioEl;
}

/* One muted play inside the first real click unlocks the element for the rest
   of the visit, so later programmatic plays — from a card that advances
   itself, say — are allowed. */
/* Which playback currently owns the shared <audio> element.

   The unlock has to prime the very element we will use later — the permission
   is granted per element — so it loads a real clip, plays it muted, and tidies
   up afterwards. The tidying was the problem: if a character was finished
   before the primer's play() promise settled, the cleanup paused the clip that
   had taken over in the meantime, and the first thing you wrote was silent.
   Bumping a counter whenever real audio claims the element lets the primer
   recognise that it no longer owns it. */
let audioOwner = 0;

function unlockAudio() {
  if (audioUnlocked) return;
  const first = window.HQ_AUDIO && Object.values(window.HQ_AUDIO)[0];
  if (!first) return;                  /* bundle still in flight — stay armed */
  audioUnlocked = true;
  const a = ensureAudioEl();
  const mine = ++audioOwner;
  try {
    a.muted = true;
    a.src = "data:audio/mp4;base64," + first;
    const p = a.play();
    const done = () => {
      /* stand down if a real clip has taken the element since */
      if (audioOwner === mine) { try { a.pause(); a.currentTime = 0; } catch {} }
      a.muted = false;
    };
    if (p && p.then) p.then(done, done); else done();
  } catch { a.muted = false; }
}

function playClip(text) {
  const b64 = clipFor(text);
  if (!b64) return false;
  const a = ensureAudioEl();
  try {
    audioOwner++;                      /* this playback owns the element now */
    a.pause();
    a.muted = false;
    a.src = "data:audio/mp4;base64," + b64;
    a.currentTime = 0;
    const p = a.play();
    /* An AbortError means we interrupted ourselves by starting the next clip —
       normal, and not the browser refusing us. Reporting that as blocked sound
       would put "tap to allow sound" on screen for a chain that is working. */
    if (p && p.catch) p.catch(e => {
      if (e && e.name === "AbortError") return;
      speechBlocked = true;
      renderMuted();
    });
    if (speechBlocked) { speechBlocked = false; renderMuted(); }
    return true;
  } catch { return false; }
}

let phraseTimer = null;

/* Only single characters have bundled clips, and the system voice can't be
   relied on here — so a word or sentence is read one character at a time from
   the clips. Not connected speech, but every character is actually spoken. */
function stopPhrase() {
  clearTimeout(phraseTimer);
  phraseTimer = null;
  if (audioEl) audioEl.onended = null;
}

function sayPhrase(text, force) {
  if ((!state.audio && !force) || !text) return;
  const chars = [...text].filter(c => /[\u4e00-\u9fff]/.test(c));
  if (!chars.length) return;
  stopPhrase();
  if (chars.length === 1) return say(chars[0], force);

  /* One missing clip used to abandon the whole word to the system voice, which
     on a machine without a Chinese voice meant silence: 现金 said nothing
     because 金 is never taught and so was never recorded. Words are free to use
     characters outside the curriculum — 第一, 女儿, 桌子 — so the chain now
     steps over a gap instead of giving up at it. Generating a clip for
     everything speakable is the real fix (tools/make-audio.mjs); this is what
     keeps a bundle that has drifted from the data merely imperfect rather than
     mute. */
  lastSaid = text;
  const a = ensureAudioEl();
  let i = 0;
  const step = () => {
    if (i >= chars.length) { a.onended = null; return; }
    const c = chars[i++];
    if (!clipFor(c)) {           /* nothing recorded for this one — carry on */
      a.onended = null;
      phraseTimer = setTimeout(step, 90);
      return;
    }
    a.onended = () => { phraseTimer = setTimeout(step, 110); };
    /* a clip that refuses to play would otherwise stall the chain for good */
    if (!playClip(c)) { a.onended = null; phraseTimer = setTimeout(step, 90); }
  };
  step();
}

let zhVoice = null, zhVoices = [], voiceIdx = 0;

/* Not every voice the browser lists can actually speak. Recent macOS ships
   Chinese voices as placeholders until their data is downloaded: the browser
   reports them, speak() queues, `speaking` goes true — and nothing ever
   plays, with no error. So prefer the ones known to work, prefer local over
   network, and be ready to move on if one turns out to be mute. */
const KNOWN_GOOD = /ting-?ting|sin-?ji|mei-?jia|li-?mu|yu-?shu|普通话|huihui|yaoyao|kangkang|google/i;

function findVoice() {
  const all = speechSynthesis.getVoices();
  if (!all.length) return;                   /* voices load late; try again later */
  const score = v =>
    (KNOWN_GOOD.test(v.name) ? 4 : 0) +
    (v.localService ? 2 : 0) +
    (/^zh[-_]?(CN|Hans)/i.test(v.lang) ? 1 : 0);
  zhVoices = all.filter(v => /^zh/i.test(v.lang)).sort((a, b) => score(b) - score(a));
  const saved = zhVoices.findIndex(v => v.name === state.voice);
  voiceIdx = saved >= 0 ? saved : 0;
  zhVoice = zhVoices[voiceIdx] || null;
}

function useNextVoice() {
  if (voiceIdx + 1 >= zhVoices.length) return false;
  voiceIdx++;
  zhVoice = zhVoices[voiceIdx];
  return true;
}

let liveUtterance = null, sayTimer = null, sayGuard = null, startGuard = null;
let speechPrimed = false, speechBlocked = false, lastSaid = "";

/* Browsers refuse to play audio a page starts on its own. Speaking once,
   silently, inside the first real click unlocks the engine for the rest of
   the visit — without it, anything spoken from a timer (a card that advances
   itself, say) is queued and never starts. */
function primeSpeech() {
  if (speechPrimed || !("speechSynthesis" in window)) return;
  speechPrimed = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* engine unavailable */ }
}

function speechReset() {
  clearTimeout(sayGuard); clearTimeout(startGuard);
  liveUtterance = null;
  try { speechSynthesis.cancel(); } catch { /* engine gone */ }
}

function say(text, force) {
  if ((!state.audio && !force) || !text) return;
  /* Detaching onended is not enough to stop a phrase: a step already queued on
     phraseTimer will still fire and play its own character over the top. In a
     listening drill that means hearing the previous card's character and being
     marked wrong for answering what you heard. stopPhrase clears both. */
  stopPhrase();
  lastSaid = text;
  if (playClip(text)) return;               /* a recorded clip beats the engine */
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  clearTimeout(sayTimer); clearTimeout(sayGuard); clearTimeout(startGuard);

  const begin = () => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      if (!zhVoice) findVoice();
      if (zhVoice) u.voice = zhVoice;
      u.rate = 0.75;
      let started = false;
      u.onstart = () => {
        started = true;
        /* this one works — remember it rather than rediscovering it */
        if (zhVoice && state.voice !== zhVoice.name) { state.voice = zhVoice.name; save(); }
        if (speechBlocked) { speechBlocked = false; renderMuted(); }
      };
      u.onend = u.onerror = () => { liveUtterance = null; clearTimeout(sayGuard); };
      liveUtterance = u;                     /* Chrome collects unreferenced utterances mid-word */
      synth.speak(u);
      /* queued but never starts = the browser is refusing it. Say so rather
         than leaving the learner wondering why a sound drill is silent. */
      startGuard = setTimeout(() => {
        if (started) return;
        /* a mute voice: move to the next candidate and try again */
        if (useNextVoice()) { speechReset(); say(text, true); return; }
        speechBlocked = true;
        renderMuted();
      }, 900);
      sayGuard = setTimeout(speechReset, 2500 + text.length * 700);
    } catch { speechReset(); }
  };

  try {
    if (synth.paused) synth.resume();
    /* Speaking in the same tick as the click keeps the gesture's permission;
       only defer when something is already talking and must be cut off. */
    if (synth.speaking || synth.pending) {
      synth.cancel();
      sayTimer = setTimeout(begin, 60);
    } else {
      begin();
    }
  } catch { speechReset(); }
}

/* Fetched after the first render rather than ahead of it: 859 KB gzipped of
   base64 speech, loaded as a blocking <script>, meant nothing on the page drew
   until it arrived. Everything that reads clips already guards on HQ_AUDIO
   being there, so the seconds before it lands degrade to the system voice
   rather than to an error. */
function loadAudioBundle() {
  if (window.HQ_AUDIO) return;
  const el = document.createElement("script");
  el.src = `js/audio.js?v=${appVersion()}`;
  el.async = true;
  el.onload = () => renderMuted();
  document.head.appendChild(el);       /* a failure is Settings' story to tell */
}

/* Both unlocks want a real gesture — but NOT `once`, which is what this used
   to be. A `once` listener is spent even on a call that returns early, so a
   click landing before the bundle arrives would burn the only chance to unlock
   the element and leave the whole visit silent. Staying armed costs an early
   return per click. */
addEventListener("pointerdown", unlockAudio, { capture: true });
addEventListener("keydown", unlockAudio, { capture: true });

if ("speechSynthesis" in window) {
  findVoice();
  speechSynthesis.onvoiceschanged = findVoice;
  addEventListener("pointerdown", primeSpeech, { capture: true, once: true });
  addEventListener("keydown", primeSpeech, { capture: true, once: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) speechReset(); });
}

/* ---------- the writing canvas ---------- */

function inkColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    stroke: cs.getPropertyValue("--ink").trim() || "#17211E",
    outline: cs.getPropertyValue("--rule").trim() || "#CBD5CC",
    jade: cs.getPropertyValue("--jade").trim() || "#3F7D63"
  };
}
function makeWriter(mount, char, opts = {}) {
  if (!window.HanziWriter || !window.STROKE_DATA[char] || !mount) return null;
  const c = inkColors();
  return HanziWriter.create(mount, char, Object.assign({
    width: 190, height: 190, padding: 8,
    strokeColor: c.stroke, outlineColor: c.outline, drawingColor: c.jade,
    showOutline: true, showCharacter: true,
    strokeAnimationSpeed: 1, delayBetweenStrokes: 180,
    charDataLoader: (ch, onComplete) => onComplete(window.STROKE_DATA[ch])
  }, opts));
}
function writerBox(char, id) {
  return `<div class="writer-box"><div class="tian">${TIAN_SVG}
    <div class="tian-slot"><div id="${id}"></div></div></div></div>`;
}

/* ============================================================
   Trackpad writing

   A browser can't read the trackpad's actual contacts — no API exposes
   finger positions. What it can do is Pointer Lock: hide the cursor and
   hand us raw, unbounded movement deltas. Integrating those into a brush
   position turns the trackpad into a relative drawing surface, so strokes
   come from moving your finger rather than dragging a held click.

   hanzi-writer reads mousedown/mousemove on its SVG and mouseup on the
   document, positioning from clientX/clientY — so we suppress the real
   events while locked and feed it synthetic ones from the brush instead.
   All of its stroke matching, ordering and hinting keeps working.
   ============================================================ */

const PAD_SENSITIVITY = 0.55;   /* trackpad travel : ink travel */

const pad = { active: false, svg: null, box: null, lockEl: null, dot: null, hint: null,
              x: 0, y: 0, ink: false, onEnd: null, onDraw: null, quiet: false };

const padSupported = () => !!document.body.requestPointerLock && !!window.MouseEvent;

/* Arm the trackpad on a writing box the learner didn't explicitly ask to arm.

   Pointer lock normally wants a user gesture, and a drill card that arrives on
   the auto-advance timer hasn't got one — so this is a request that is allowed
   to be turned down. It fails silently and leaves the manual button exactly
   where it was, which is why `quiet` exists. */
function padAuto(box, mount, onEnd, onDraw, lockEl) {
  if (!state.padAuto || pad.active || !padSupported()) return false;
  return padStart(box, mount, onEnd, onDraw, lockEl, true);
}

/* Two sinks: a hanzi-writer quiz, fed mouse events it will believe, or a
   free page that just wants the brush position. */
function padEmit(type) {
  if (pad.onDraw) { pad.onDraw(type, pad.x, pad.y); return; }
  if (!pad.svg) return;
  const r = pad.svg.getBoundingClientRect();
  const ev = new MouseEvent(type, {
    clientX: r.left + pad.x, clientY: r.top + pad.y, bubbles: true, cancelable: true
  });
  ev.__hq = true;
  (type === "mouseup" ? document : pad.svg).dispatchEvent(ev);
}

function padSetInk(on) {
  if (on === pad.ink || !pad.active) return;
  pad.ink = on;
  pad.dot?.classList.toggle("down", on);
  padEmit(on ? "mousedown" : "mouseup");
}

function padMove() {
  if (!pad.dot) return;
  const r = (pad.svg || pad.box).getBoundingClientRect();
  pad.x = Math.max(0, Math.min(r.width, pad.x));
  pad.y = Math.max(0, Math.min(r.height, pad.y));
  pad.dot.style.transform = `translate(${pad.x}px, ${pad.y}px)`;
}

/* One document-level capture listener: while locked it swallows every real
   pointer event before anything else sees it, and reads the deltas. */
function padGuard(e) {
  if (!pad.active || e.__hq) return;
  if (e.type === "mousemove") {
    pad.x += (e.movementX || 0) * PAD_SENSITIVITY;
    pad.y += (e.movementY || 0) * PAD_SENSITIVITY;
    padMove();
    if (pad.ink) padEmit("mousemove");
  } else if (e.type === "mousedown") {
    padSetInk(!pad.ink);          /* a tap starts a stroke, another ends it */
  }
  e.stopImmediatePropagation();
  e.preventDefault();
}

function padKey(e) {
  if (!pad.active) return;
  if (e.code === "Space") { e.preventDefault(); padSetInk(e.type === "keydown"); }
  if (e.type === "keydown" && e.key === "Escape") document.exitPointerLock?.();
}

function padLockChange() {
  if (document.pointerLockElement === pad.lockEl) padArm();
  else padStop();
}

/* Move the brush to a different box without touching the lock. Releasing and
   re-requesting it per square raced with the browser's own lock change and
   tore the pad down — which is why the first squares misbehaved. */
function padRetarget(mount, box) {
  if (!pad.active) return false;
  const svg = mount && mount.querySelector("svg");
  if (!svg || !box) return false;
  pad.box?.classList.remove("padding-on");
  pad.svg = svg;
  pad.box = box;
  box.classList.add("padding-on");
  if (pad.dot) box.appendChild(pad.dot);
  if (pad.hint) box.appendChild(pad.hint);
  const r = svg.getBoundingClientRect();
  pad.x = r.width / 2; pad.y = r.height / 2;
  padSetInk(false);
  padMove();
  return true;
}

/* Only once the lock is genuinely ours do we start swallowing mouse events —
   otherwise a refused lock would leave the writer unable to hear a real hand. */
function padArm() {
  if (pad.active) return;
  pad.active = true;
  pad.ink = false;

  const r = (pad.svg || pad.box).getBoundingClientRect();
  pad.x = r.width / 2; pad.y = r.height / 2;

  const dot = document.createElement("span");
  dot.className = "brush";
  pad.box.appendChild(dot);
  pad.dot = dot;

  const hint = document.createElement("span");
  hint.className = "pad-hint";
  hint.textContent = "Hold space or tap to ink · Esc to stop";
  pad.box.appendChild(hint);
  pad.hint = hint;

  pad.box.classList.add("padding-on");
  padMove();
  requestAnimationFrame(() => {
    const r2 = (pad.svg || pad.box)?.getBoundingClientRect();
    if (r2 && r2.width && !pad.ink) { pad.x = r2.width / 2; pad.y = r2.height / 2; padMove(); }
  });

  document.addEventListener("mousedown", padGuard, true);
  document.addEventListener("mousemove", padGuard, true);
  document.addEventListener("mouseup", padGuard, true);
  document.addEventListener("keydown", padKey);
  document.addEventListener("keyup", padKey);
}

function padStart(box, mount, onEnd, onDraw, lockEl, quiet) {
  const svg = mount ? mount.querySelector("svg") : null;
  if ((!svg && !onDraw) || !padSupported() || pad.active) return false;
  pad.svg = svg; pad.box = box; pad.onEnd = onEnd; pad.onDraw = onDraw || null;
  pad.lockEl = lockEl || box;
  pad.quiet = !!quiet;

  document.addEventListener("pointerlockchange", padLockChange);
  document.addEventListener("pointerlockerror", padRefused);

  let p;
  try { p = pad.lockEl.requestPointerLock(); } catch { padRefused(); return false; }
  if (p && typeof p.catch === "function") p.catch(padRefused);
  return true;
}

/* Pointer lock can be refused — notably inside an embedded frame that wasn't
   granted it. Say so plainly rather than leaving a dead button. */
function padRefused() {
  const quiet = pad.quiet;
  padStop();
  /* An automatic attempt that the browser turns down is not an error the
     learner needs to read about — the button is still right there. Only an
     attempt they actually asked for gets an explanation. */
  if (quiet) return;
  const box = pad.box || $(".tian");
  if (!box || box.querySelector(".pad-note")) return;
  const note = document.createElement("span");
  note.className = "pad-hint pad-note";
  note.textContent = "Your browser blocked pointer lock here — open the page in its own tab.";
  box.appendChild(note);
  setTimeout(() => note.remove(), 6000);
}

function padStop() {
  document.removeEventListener("pointerlockchange", padLockChange);
  document.removeEventListener("pointerlockerror", padRefused);
  if (!pad.active) { const cb0 = pad.onEnd; pad.onEnd = null; cb0?.(); return; }
  padSetInk(false);
  pad.active = false;
  document.removeEventListener("mousedown", padGuard, true);
  document.removeEventListener("mousemove", padGuard, true);
  document.removeEventListener("mouseup", padGuard, true);
  document.removeEventListener("keydown", padKey);
  document.removeEventListener("keyup", padKey);
  pad.dot?.remove(); pad.hint?.remove();
  pad.box?.classList.remove("padding-on");
  pad.dot = pad.hint = pad.svg = pad.box = pad.lockEl = null;
  pad.onDraw = null;
  pad.quiet = false;
  /* Release the lock as well as our own state.

     This was missing, and `document.exitPointerLock()` appeared in exactly one
     place in the file: the Escape handler. So finishing a character tore down
     the brush, the hint and the listeners but left the cursor captured — the
     only way out was the key the browser itself handles. The listener above is
     already detached by this point, so exiting here cannot re-enter padStop. */
  try { document.exitPointerLock?.(); } catch { /* already released */ }
  const cb = pad.onEnd; pad.onEnd = null;
  cb?.();
}

/* Move the brush to a new writing surface, arming it if it isn't already.

   Everywhere a fresh square appears — the next word in the notebook, a second
   go on a character card — the old code called padStop() and then padStart(),
   which drops the lock and immediately asks for it back. Browsers rate-limit
   exactly that: a re-request landing in the cooldown after an unlock is
   refused, and the trackpad silently stopped working. Since the lock lives on
   a container that survives the re-render, the fix is not to let go of it. */
function padHandoff(box, mount, onEnd, lockEl) {
  if (pad.active) return padRetarget(mount, box);
  return padAuto(box, mount, onEnd, null, lockEl);
}

/* ---------- sentence rendering: known characters light up ---------- */

/* `target` is the character being taught — it gets the emphasis. Everything
   else is inked if you know it and grey if you don't, so a sentence visibly
   fills in as you progress. Without a target, this is just the ink pass. */
function renderZh(text, target) {
  return [...text].map(ch => {
    if (!/[\u4e00-\u9fff]/.test(ch)) return `<span class="u">${esc(ch)}</span>`;
    if (ch === target) return `<span class="t">${esc(ch)}</span>`;
    return `<span class="${isKnown(ch) ? "k" : "u"}">${esc(ch)}</span>`;
  }).join("");
}
/* Reading should never show you material you can't read. */
const cjkOf = str => [...str].filter(c => /[\u4e00-\u9fff]/.test(c));
const canRead = str => { const g = cjkOf(str); return g.length > 0 && g.every(isKnown); };

/* Every multi-character word in the library you can read outright — one whose
   characters are all already yours.

   Deduplicated, because a word is listed under each character it contains:
   大人 appears under 大 and again under 人. Ordered by the last character to
   fall into place, newest first, so the deck opens on the combinations you
   have only just become able to read rather than on 一个 forever. */
function knownWords() {
  const seen = new Map();
  for (const ch of HQ) {
    for (const w of ch.words) {
      if (seen.has(w[0]) || [...w[0]].length < 2 || !canRead(w[0])) continue;
      seen.set(w[0], w);
    }
  }
  return [...seen.values()].sort((a, b) => unlockedAt(b[0]) - unlockedAt(a[0]));
}

/* How far into the curriculum you had to get before this word became readable:
   the position of its latest-taught character. */
const unlockedAt = w => Math.max(...[...w].filter(c => CHAR_INDEX[c]).map(c => CHAR_INDEX[c].i), 0);

/* The longest thing built from this character that the learner can actually
   read: its example sentence if every glyph is known, otherwise a word, and
   otherwise nothing — in which case the reading drill isn't offered at all. */
function readingMaterial(ch) {
  if (canRead(ch.sent[0])) return { zh: ch.sent[0], en: ch.sent[2], pin: ch.sent[1], long: true };
  const w = ch.words.find(x => x[0].length > 1 && canRead(x[0]));
  if (w) return { zh: w[0], en: w[2], pin: w[1], long: false };
  return null;
}

const highlightWord = (word, char) =>
  [...word].map(ch => ch === char ? `<mark>${esc(ch)}</mark>` : esc(ch)).join("");

/* ============================================================
   The character card
   ============================================================ */

function charCard(ch, { writerId }) {
  const comps = ch.comp.length
    ? `<div class="block sheet">
        <div class="block-head"><span class="k">部件</span><span class="t">Built from</span></div>
        <div class="comps">${ch.comp.map((k, i) => {
          const [p, m] = gloss(k);
          return `${i ? '<span class="comp-plus">+</span>' : ""}<button class="comp ${isKnown(k) ? "known" : ""}" data-comp="${esc(k)}">
            <em>${esc(k)}</em><span>${esc(p)}${p && m ? " · " : ""}${esc(m)}</span></button>`;
        }).join("")}
        <span class="comp-plus">→</span><span class="comp"><em>${esc(ch.c)}</em></span></div>
      </div>` : "";

  return `
  <div class="card-hero">
    ${writerBox(ch.c, writerId)}
    <div class="hero-meta">
      <div class="hero-pin">${esc(ch.p)} ${toneMark(ch.p)}</div>
      <div class="hero-mean">${esc(ch.m)}</div>
      ${posTags(ch)}
    </div>
    <div class="tools">
      <button class="tool" data-act="say" data-text="${esc(ch.c)}"><span class="han">发音</span> Hear it</button>
      <button class="tool" data-act="animate"><span class="han">笔顺</span> Stroke order</button>
      <button class="tool" data-act="practise"><span class="han">默写</span> Try writing</button>
    </div>
  </div>

  <div class="block sheet">
    <div class="block-head"><span class="k">字源</span><span class="t">Where it comes from</span></div>
    <p class="origin">${esc(ch.o)}</p>
  </div>

  <div class="block sheet">
    <div class="block-head"><span class="k">记忆</span><span class="t">How to remember it</span></div>
    <p class="story">${esc(ch.story)}</p>
  </div>

  ${comps}

  <div class="block sheet">
    <div class="block-head"><span class="k">词语</span><span class="t">Words you'll meet it in</span></div>
    <div class="words">
      ${ch.words.map(w => `<div class="word">
        <button class="word-zh" data-act="say" data-text="${esc(w[0])}">${highlightWord(w[0], ch.c)}</button>
        <div class="word-pin">${esc(w[1])}</div>
        <div class="word-en" style="grid-column:2">${esc(w[2])}</div>
      </div>`).join("")}
    </div>
  </div>

  <div class="block sheet">
    <div class="block-head"><span class="k">例句</span><span class="t">In a sentence</span></div>
    <div class="sentence">
      <button class="sen-zh" data-act="say" data-text="${esc(ch.sent[0])}" style="background:none;border:0;padding:0;text-align:left">${renderZh(ch.sent[0], ch.c)}</button>
      <div class="sen-pin">${esc(ch.sent[1])}</div>
      <div class="sen-en">${esc(ch.sent[2])}</div>
    </div>
  </div>`;
}

function bindCard(root, ch, writerId) {
  let writer = null;
  const mount = () => (writer = writer || makeWriter($("#" + writerId, root), ch.c));
  mount();
  /* Try writing always starts a fresh attempt, goes straight into trackpad
     mode where the browser allows it, and drops out again once the character
     is finished — so a second go is one click, not three. */
  function startWriting() {
    mount();
    if (!writer) return;
    const box = $(".tian", root), mountEl = $("#" + writerId, root);
    /* already inked in on this very box: keep the lock and just reset the brush */
    const holding = pad.active && pad.box === box;
    if (!holding) padStop();
    writer.cancelQuiz();
    writer.hideCharacter();
    writer.quiz({
      showHintAfterMisses: 2,
      /* finishing releases the trackpad and gives the cursor back, so a
         completed character doesn't leave you pressing Escape */
      onComplete: () => { padStop(); say(ch.c, true); }
    });
    if (holding) padRetarget(mountEl, box);
    else padStart(box, mountEl, null);
  }
  /* `root` here is #svBody or #sesInner — elements that live for the whole
     session while only their innerHTML is swapped. Adding a listener per card
     therefore stacked them: the second card you opened fired every click
     twice, the third three times. Since each call starts by cancelling the
     phrase the previous one just began, the audible result was a word that
     played only its first character, or went silent altogether — worse the
     longer you had been browsing. Bind once, and replace the handler rather
     than piling another on. */
  if (root.__cardClick) root.removeEventListener("click", root.__cardClick);
  root.__cardClick = e => {
    const b = e.target.closest("[data-act]");
    if (b) {
      const act = b.dataset.act;
      if (act === "say") sayPhrase(b.dataset.text, true);
      if (act === "animate") { mount(); writer && writer.animateCharacter(); }
      if (act === "practise") startWriting();
    }
    const comp = e.target.closest("[data-comp]");
    if (comp && CHAR_INDEX[comp.dataset.comp]) openChar(comp.dataset.comp);
  };
  root.addEventListener("click", root.__cardClick);
}

/* ============================================================
   Session
   ============================================================ */

const session = { queue: [], idx: 0, right: 0, wrong: 0, learned: 0, reviewed: 0,
                  combo: 0, bestCombo: 0, active: false, questAtStart: 0, practice: null, todo: null, got: {},
                  qStart: 0, times: [], quick: 0, repair: null };

/* A question is "quick" if it lands while the bar still has some drain left.
   Running out costs nothing — the bar is there to add pace, not a penalty. */
const QUICK_MS = 6000;

function startQuestionTimer(run) {
  const bar = $("#qtimer");
  if (!bar) return;
  if (!run || !state.timer) { bar.hidden = true; session.qStart = 0; return; }
  bar.hidden = false;
  bar.classList.remove("spent");
  bar.style.setProperty("--q", QUICK_MS + "ms");
  /* replacing the node restarts the animation */
  bar.innerHTML = "<i></i>";
  session.qStart = Date.now();
}

/* Extra reps, on demand. Each targets one skill and draws the characters
   you're shakiest at — it reinforces without rescheduling your reviews. */
const PRACTICE = {
  read:  { k: "\u9605\u8bfb", name: "Reading",       blurb: "Do you know what it means?", kinds: ["r", "d"], skill: "r" },
  write: { k: "\u9ed8\u5199", name: "Writing",       blurb: "Draw it from memory",        kinds: ["w"],      skill: "w" },
  say:   { k: "\u53d1\u97f3", name: "Pronunciation", blurb: "Sound and tone",             kinds: ["p", "l"], skill: "p" }
};

/* Every character this mode could ever ask you about — the honest denominator
   for its progress. Writing is the reason this isn't just "everything you
   know": a character with no stroke data can't be drilled, so counting it
   would put the writing ring permanently short of full. */
function practiceChars(mode) {
  const all = knownChars();
  return mode === "write" ? all.filter(c => window.STROKE_DATA[c]) : all;
}

/* The characters one round draws, chosen by practicePool's 70/30 recency
   split and least-shown-first rotation. The eligible set is passed in rather
   than filtered out afterwards: filtering a ready-made pool down to the
   writable ones used to hand a short round back, and quietly broke the split
   it had just been at pains to get right. */
const ROUND = 10;
const practiceRound = mode => practicePool(PRACTICE[mode].skill, ROUND, practiceChars(mode));

function startPractice(mode) {
  const cfg = PRACTICE[mode];
  const pool = practiceRound(mode);
  if (!pool.length) return;
  session.queue = pool.map(c => ({ t: "drill", c, kind: one(cfg.kinds) }));
  session.idx = 0;
  session.right = session.wrong = session.learned = session.reviewed = 0;
  session.combo = session.bestCombo = 0;
  session.got = {};
  session.times = []; session.quick = 0;
  session.questAtStart = menuProgress().known;
  session.practice = mode;
  session.todo = null;
  session.repair = null;
  session.active = true;
  $("#session").classList.add("on");
  document.body.style.overflow = "hidden";
  renderStep();
}

/* ---------- 错字本 repair rounds ----------

   What the mistake notebook is for. A character gets on that page by being
   missed repeatedly under time, and the one thing that will not shift it is
   another timed drill of the same kind — you already know you can't do this
   one in two seconds.

   So a repair round is the opposite of a sprint in every respect. No clock.
   Few characters. And each one approached from every side in turn, because a
   character you keep missing is usually one where a single thread has come
   loose — you know the shape and not the sound, or the sound and not which of
   three shapes it belongs to — and the round has to find out which.

   Three passes. Read the card and then read it back; hear it and name it;
   produce the form from the meaning. Three right answers in a row take it off
   the page, and those answers count wherever you get them — here, or in a
   sprint, or in tomorrow's session. */

const REPAIR_SIZE = 5;

/* Which sprint mode a drill kind speaks for, so answers in a repair round
   count towards clearing the same character they would in a sprint. */
const REPAIR_MODE = { r: "r", d: "r", p: "l", l: "l", c: "w", s: "w", a: "w", w: "w" };

function startRepair(chars) {
  const cs = [...new Set(chars)].filter(c => CHAR_INDEX[c] && isKnown(c)).slice(0, REPAIR_SIZE);
  if (!cs.length) return;
  const items = [];
  cs.forEach(c => { items.push({ t: "intro", c }); items.push({ t: "drill", c, kind: "r" }); });
  shuffle([...cs]).forEach(c => items.push({ t: "drill", c, kind: state.audio ? "l" : "p" }));
  shuffle([...cs]).forEach(c => items.push({ t: "drill", c, kind: "c" }));
  session.queue = items;
  session.idx = 0;
  session.right = session.wrong = session.learned = session.reviewed = 0;
  session.combo = session.bestCombo = 0;
  session.got = {};
  session.times = []; session.quick = 0;
  session.questAtStart = menuProgress().known;
  session.practice = null;
  session.todo = null;
  session.repair = cs;
  session.active = true;
  $("#session").classList.add("on");
  document.body.style.overflow = "hidden";
  renderStep();
}

function buildSession() {
  const due = dueList();
  /* what is still owed today — NOT dayGoal(), which is a target and counts
     what today already taught, so a second session would deal it all again */
  const fresh = nextNew(newLeftToday());
  const items = [];
  const reviews = due.map(c => ({ t: "drill", c, kind: drillKind(c) }));
  let r = 0;
  fresh.forEach(c => {
    items.push({ t: "intro", c });
    for (let k = 0; k < 3 && r < reviews.length; k++) items.push(reviews[r++]);
    items.push({ t: "drill", c, kind: "r", fresh: true });
  });
  while (r < reviews.length) items.push(reviews[r++]);
  session.queue = items;
  session.idx = 0;
  session.right = session.wrong = session.learned = session.reviewed = 0;
  session.combo = session.bestCombo = 0;
  session.got = {};
  session.times = []; session.quick = 0;
  session.questAtStart = menuProgress().known;
  session.practice = null;
  session.todo = null;
  session.repair = null;
  return items;
}

/* Which drill a character has earned. Recall and writing arrive
   only once recognition is solid.

   Writing is sticky: you learn a character's strokes by writing it several
   times in a short window, not once every thirty-five days. So once a
   character has had one writing drill, it keeps getting them until three
   land — otherwise the reps scatter across the whole library and no single
   character ever becomes solid. */
function drillKind(c) {
  const r = rec(c);
  const lvl = r?.lvl || 0;
  const ch = CHAR_INDEX[c];
  const canWrite = lvl >= 4 && state.writeDrills && window.STROKE_DATA[c];

  if (canWrite && r && r.skills.w > 0 && r.skills.w < 3) return "w";

  const bag = ["r", "p"];
  if (lvl >= 2) bag.push("c", "l");
  /* offered only when there is something readable to build them from —
     otherwise renderDrill has to bail out to recognition at the last moment */
  if (lvl >= 3) {
    const readable = ch.words.filter(w => canRead(w[0]));
    if (readable.length) bag.push("s");
    if (readable.some(w => cjkOf(w[0]).length > 1)) bag.push("a");
  }
  if (lvl >= 4) { if (readingMaterial(ch)) bag.push("d"); if (canWrite) bag.push("w", "w"); }
  return one(bag);
}

function startSession() {
  if (!buildSession().length) return;
  session.active = true;
  $("#session").classList.add("on");
  document.body.style.overflow = "hidden";
  renderStep();
}
function endSession() {
  padStop();
  clearAdvance();
  $("#qtimer") && ($("#qtimer").hidden = true);
  session.active = false;
  $("#session").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
}

function renderMuted() {
  const el = $("#muted");
  if (!el) return;
  const off = !state.audio, blocked = speechBlocked && state.audio;
  el.hidden = !off && !blocked;
  el.textContent = off ? "🔇 sound off" : "🔇 tap to allow sound";
  el.title = off ? "Turn sound back on"
    : "Your browser is blocking audio this page started on its own — tap once to allow it";
}

function renderCombo() {
  renderMuted();
  const el = $("#combo");
  const n = session.combo;
  el.className = "combo " + (n >= 8 ? "blaze" : n >= 4 ? "hot" : n === 0 ? "zero" : "");
  el.innerHTML = `<span class="han">连对</span>${n}`;
  el.title = `${n} correct in a row · best this session ${session.bestCombo}`;
}

function renderStep() {
  clearAdvance();
  stopPhrase();                    /* the last card's audio does not belong to this one */
  const total = session.queue.length, done = session.idx;
  $("#sesProg").style.width = total ? `${(done / total) * 100}%` : "0%";
  $("#sesCount").textContent = `${Math.min(done + 1, total)} / ${total}`;
  renderCombo();

  if (session.idx >= session.queue.length) return renderDone();

  const item = session.queue[session.idx];
  const ch = CHAR_INDEX[item.c];
  const body = $("#sesInner"), foot = $("#sesFoot");

  /* handwriting is excluded: the input is slow by nature, and reaching for
     the Trackpad button shouldn't look like hesitation */
  startQuestionTimer(item.t === "drill" && item.kind !== "w");

  if (item.t === "intro") {
    const isNew = !isKnown(item.c);
    const wid = "w" + Math.random().toString(36).slice(2, 8);
    const st = STAGES.find(s => s.n === ch.stage);
    const onMenu = MENU_CHARS.includes(ch.c);
    body.innerHTML = `
      <div class="stack" style="gap:.3rem;align-items:center;text-align:center">
        <span class="eyebrow">${isNew ? "New character" : "Revisiting"} · ${esc(st.icon)} ${esc(st.name)}</span>
        ${onMenu ? `<span class="chip" style="background:var(--seal-wash);color:var(--seal)">🍜 on the menu</span>` : ""}
      </div>
      ${charCard(ch, { writerId: wid })}`;
    bindCard(body, ch, wid);
    foot.innerHTML = `<button class="btn btn-block" id="gotIt">Got it — keep going</button>`;
    $("#gotIt").onclick = () => {
      if (!isKnown(item.c)) { introduce(item.c); tally("new"); session.learned++; }
      next();
    };
    setTimeout(() => say(ch.c), 340);
  } else {
    renderDrill(item, ch, body, foot);
  }
  $("#sesBody").scrollTop = 0;
}

/* A correct answer doesn't need confirming twice. Show the verdict, let it
   land, then move on by itself — but only when it was right; a miss is the
   one time you actually need to read what's on screen. */
const AUTO_ADVANCE_MS = 1400;
let advanceTimer = null;
function clearAdvance() { clearTimeout(advanceTimer); advanceTimer = null; }

const next = () => { clearAdvance(); session.idx++; renderStep(); };

function requeue(item) {
  const at = Math.min(session.queue.length, session.idx + 4);
  session.queue.splice(at, 0, Object.assign({}, item, { kind: "r", again: true }));
}

const KIND_LABEL = {
  r: ["认读", "What does it mean?"],
  p: ["发音", "How is it said?"],
  c: ["默写", "Which character?"],
  s: ["词语", "Fill the gap"],
  w: ["笔顺", "Write it from memory"],
  l: ["听力", "Listen — which character?"],
  a: ["组词", "Build the word"],
  d: ["阅读", "Read the sentence"]
};
const SKILL_OF = { r:"r", p:"p", l:"p", c:"c", s:"c", a:"c", d:"r", w:"w" };

/* Four options that are genuinely four options.

   Picking three distractors at random only guarantees they differ from the
   answer — not from each other, and plenty of characters share a reading:
   是, 事 and 试 are all shì, so 个 could be offered [shì, shì, shì, gè], which
   gives the answer away and looks broken doing it. Deduplicating on the value
   the learner actually compares is the fix. */
function optionSet(answer, candidates, valueOf, n = 3) {
  const seen = new Set([answer]);
  const out = [];
  for (const x of shuffle([...candidates])) {
    if (out.length >= n) break;
    const v = valueOf(x);
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function renderDrill(item, ch, body, foot) {
  const kind = item.kind;
  const [k, label] = KIND_LABEL[kind];
  const pool = HQ.filter(x => x.c !== ch.c);
  const head = `<div class="drill-kind"><span class="han">${k}</span> ${esc(label)}</div>`;

  /* --- write from memory --- */
  if (kind === "w") {
    const wid = "q" + Math.random().toString(36).slice(2, 8);
    /* A trackpad is not a brush. Allow slips in proportion to how much there
       is to get wrong — one for a simple character, five for 15 strokes. */
    const nStrokes = (window.STROKE_DATA[ch.c]?.strokes || []).length || 1;
    const allowed = Math.max(1, Math.ceil(nStrokes / 3));
    body.innerHTML = `<div class="drill">
      <div class="drill-prompt sheet">${head}
        <div class="drill-q"><span class="pin">${esc(ch.p)}</span> ${toneMark(ch.p)}</div>
        <div class="drill-hint">${esc(ch.m)}</div>
      </div>
      ${writerBox(ch.c, wid)}
      <p class="note" style="text-align:center">Draw the strokes in the box. A hint appears if you miss twice —
        and up to ${allowed} slip${allowed === 1 ? "" : "s"} still counts, since a trackpad isn't a brush.</p>
    </div>`;
    $(".writer-box", body).style.margin = "0 auto";
    $(".writer-box", body).insertAdjacentHTML("afterend", `<div class="write-tools"></div>`);
    const tools = $(".write-tools", body);
    const w = makeWriter($("#" + wid, body), ch.c, { showCharacter: false, showOutline: false });
    foot.innerHTML = "";

    let missed = 0, peeked = false;

    const bindPad = () => $("#padW")?.addEventListener("click", () => {
      const btn = $("#padW");
      btn.disabled = true;
      if (!padStart($(".tian", body), $("#" + wid, body), () => { btn.disabled = false; })) btn.disabled = false;
    });

    /* With the setting on, the box arms itself as it appears — and on a second
       go, after peeking at the strokes, the brush is handed to the rebuilt
       writer rather than the lock being dropped and asked for again. */
    const autoPad = () => padHandoff($(".tian", body), $("#" + wid, body), () => {
      const btn = $("#padW"); if (btn) btn.disabled = false;
    });

    /* Looking at the strokes shouldn't end the question — that's the moment
       you most want to try it. So the hint offers a way back into writing. */
    const showStrokes = () => {
      padStop();
      peeked = true;
      w.cancelQuiz();
      w.showCharacter();
      w.animateCharacter();
      tools.innerHTML = `
        <button class="btn btn-sm" id="tryW">Now you try <kbd class="opt-n">T</kbd></button>
        <button class="btn btn-ghost btn-sm" id="againW">Show again <kbd class="opt-n">S</kbd></button>
        <button class="btn btn-ghost btn-sm" id="moveW">Move on</button>`;
      $("#againW").onclick = () => w.animateCharacter();
      $("#moveW").onclick = () => settle(item, ch, false, foot, null, -1);
      $("#tryW").onclick = arm;
    };

    const arm = () => {
      missed = 0;
      w.cancelQuiz();
      w.hideCharacter();
      tools.innerHTML = `
        ${padSupported() ? `<button class="btn btn-ghost btn-sm" id="padW"><span class="han">触控</span> Trackpad <kbd class="opt-n">T</kbd></button>` : ""}
        <button class="btn btn-ghost btn-sm" id="skipW">${peeked ? "Show me again" : "Show me the strokes"} <kbd class="opt-n">S</kbd></button>`;
      bindPad();
      /* scoped and guarded, like the replay button: a global lookup would find
         a stale control from another view, and throw if none existed */
      const skip = $("#skipW", tools);
      if (skip) skip.onclick = showStrokes;
      autoPad();
      w.quiz({
        showHintAfterMisses: 2,
        onMistake: () => missed++,
        onComplete: () => {
          padStop();
          say(ch.c);
          /* written after peeking still counts as practice, just not as recall */
          settle(item, ch, !peeked && missed <= allowed, foot, null, peeked ? -1 : missed);
        }
      });
    };

    if (w) arm(); else settle(item, ch, false, foot, null, -1);
    return;
  }

  /* --- build the word from tiles --- */
  if (kind === "a") {
    /* Every tile has to be a character you have actually learnt.

       The word was filtered on CHAR_INDEX — is this in the library — rather
       than isKnown — have you met it. And the distractor tiles came from the
       whole library regardless, so a beginner assembling 大人 was picking it
       out of 笑, 完 and 便. Ninety-nine rounds in a hundred showed at least one
       character the learner had never seen, which makes the wrong answers
       noise rather than choices. */
    const readable = ch.words.filter(x => cjkOf(x[0]).length > 1 && canRead(x[0]));
    if (!readable.length) return renderDrill(Object.assign({}, item, { kind: "r" }), ch, body, foot);
    const w = one(readable);
    const target = [...w[0]];
    const distract = pick(knownChars().filter(c => !target.includes(c)), 3);
    const tiles = shuffle([...target, ...distract]);
    body.innerHTML = `<div class="drill">
      <div class="drill-prompt sheet">${head}
        <div class="drill-q">${esc(w[2])}</div>
        <div class="drill-hint"><span class="pin">${esc(w[1])}</span></div>
      </div>
      <div class="assemble">
        <div class="slots">${target.map((_, i) => `<div class="slot" data-s="${i}"></div>`).join("")}</div>
        <div class="tiles">${tiles.map((c, i) => `<button class="tile" data-c="${esc(c)}" data-i="${i}">${esc(c)}</button>`).join("")}</div>
      </div>
    </div>`;
    foot.innerHTML = "";
    let at = 0, wrongOnce = false;
    $$(".tile", body).forEach(t => t.onclick = () => {
      const slot = $(`.slot[data-s="${at}"]`, body);
      if (t.dataset.c === target[at]) {
        slot.textContent = t.dataset.c; slot.classList.add("filled");
        t.classList.add("used"); at++;
        if (at === target.length) {
          sayPhrase(w[0]);
          $$(".tile", body).forEach(x => x.disabled = true);
          settle(item, ch, !wrongOnce, foot, `<b>${esc(w[0])}</b> · ${esc(w[1])} · ${esc(w[2])}`);
        }
      } else {
        wrongOnce = true;
        slot.classList.add("bad");
        setTimeout(() => slot.classList.remove("bad"), 400);
      }
    });
    return;
  }

  /* --- multiple choice, including listening and reading --- */
  let prompt, options, correct, grid2 = false, autoSay = null, spoken = null;

  if (kind === "r") {
    prompt = `<div class="drill-char han">${esc(ch.c)}</div>`;
    correct = ch.m;
    options = [ch.m, ...optionSet(ch.m, pool, x => x.m)].map(m => ({ v: m, html: esc(m) }));
  } else if (kind === "p") {
    prompt = `<div class="drill-char han">${esc(ch.c)}</div>`;
    correct = ch.p;
    const near = pool.filter(x => x.p !== ch.p && (toneOf(x.p) === toneOf(ch.p) || x.p[0] === ch.p[0]));
    let others = optionSet(ch.p, near, x => x.p);
    if (others.length < 3) others = [...others, ...optionSet(ch.p, pool, x => x.p, 3 - others.length)];
    options = [ch.p, ...others]
      .map(p => ({ v: p, html: `<span class="pin">${esc(p)}</span> ${toneMark(p)}` }));
    grid2 = true;
  } else if (kind === "l") {
    prompt = `<button class="ear" id="earBtn" aria-label="Play again">🔊</button>
              <div class="drill-hint">Tap to hear it again</div>`;
    correct = ch.c;
    const near = pool.filter(x => toneOf(x.p) !== toneOf(ch.p) || x.p[0] !== ch.p[0]);
    let lc = optionSet(ch.c, near, x => x.c);
    if (lc.length < 3) lc = [...lc, ...optionSet(ch.c, pool.filter(x => !lc.includes(x.c)), x => x.c, 3 - lc.length)];
    options = [ch.c, ...lc]
      .map(c => ({ v: c, html: `<span class="big">${esc(c)}</span>` }));
    grid2 = true;
    autoSay = ch.c;
  } else if (kind === "c") {
    prompt = `<div class="drill-q"><span class="pin">${esc(ch.p)}</span> ${toneMark(ch.p)}</div>
              <div class="drill-hint">${esc(ch.m)}</div>`;
    correct = ch.c;
    const kin = pool.filter(x => x.comp.some(z => ch.comp.includes(z)));
    let kc = optionSet(ch.c, kin, x => x.c);
    if (kc.length < 3) kc = [...kc, ...optionSet(ch.c, pool.filter(x => !kc.includes(x.c)), x => x.c, 3 - kc.length)];
    options = [ch.c, ...kc]
      .map(c => ({ v: c, html: `<span class="big">${esc(c)}</span>` }));
    grid2 = true;
  } else if (kind === "d") {
    const mat = readingMaterial(ch);
    if (!mat) return renderDrill(Object.assign({}, item, { kind: "r" }), ch, body, foot);
    prompt = `<div class="drill-sen">${renderZh(mat.zh)}</div>`;
    spoken = mat.zh;
    correct = mat.en;
    /* distractors of the same shape — a sentence against sentences */
    const others = mat.long
      ? pick(pool, 3).map(x => x.sent[2])
      : pick(pool.flatMap(x => x.words.filter(w => w[0].length > 1)), 3).map(w => w[2]);
    options = [mat.en, ...others.filter(o => o !== mat.en)].slice(0, 4).map(m => ({ v: m, html: esc(m) }));
  } else { /* s — gap in a word */
    /* Same rule: no readable word, no gap drill. Falling back to an unreadable
       one showed a character the learner could not possibly fill in. */
    const readable = ch.words.filter(x => canRead(x[0]));
    if (!readable.length) return renderDrill(Object.assign({}, item, { kind: "r" }), ch, body, foot);
    const w = one(readable);
    prompt = `<div class="drill-sen">${[...w[0]].map(x => x === ch.c ? `<span class="gap">?</span>` : esc(x)).join("")}</div>
              <div class="drill-hint"><span class="pin">${esc(w[1])}</span> · ${esc(w[2])}</div>`;
    correct = ch.c;
    options = [ch.c, ...optionSet(ch.c, pool, x => x.c)]
      .map(c => ({ v: c, html: `<span class="big">${esc(c)}</span>` }));
    grid2 = true;
  }

  shuffle(options);
  body.innerHTML = `<div class="drill">
    <div class="drill-prompt sheet">${head}${prompt}</div>
    <div class="opts ${grid2 ? "grid2" : ""}">
      ${options.map((o, i) => `<button class="opt" data-v="${esc(o.v)}"><kbd class="opt-n">${i + 1}</kbd>${o.html}</button>`).join("")}
    </div>
  </div>`;
  foot.innerHTML = "";

  if (autoSay) {
    say(autoSay, true);
    /* scoped to this drill's body, and optional: a global lookup would find a
       stale button from another view, and throw outright if none existed */
    const ear = $("#earBtn", body);
    if (ear) ear.onclick = () => say(autoSay, true);
  }

  $$(".opt", body).forEach(btn => btn.onclick = () => {
    const ok = btn.dataset.v === correct;
    $$(".opt", body).forEach(b => {
      b.disabled = true;
      if (b.dataset.v === correct) { b.classList.add("right"); b.insertAdjacentHTML("beforeend", `<span class="mk">✓</span>`); }
    });
    if (!ok) { btn.classList.remove("right"); btn.classList.add("wrong"); btn.querySelector(".mk")?.remove(); btn.insertAdjacentHTML("beforeend", `<span class="mk">✗</span>`); }
    if (kind === "d") sayPhrase(spoken || ch.c);          /* the whole phrase shown */
    else if (["p","r","l"].includes(kind)) say(ch.c);
    settle(item, ch, ok, foot);
  });
}

/* Grade, show the verdict, offer the way forward. */
function settle(item, ch, ok, foot, extra, slips) {
  const writing = item.kind === "w";
  const elapsed = session.qStart ? Date.now() - session.qStart : 0;
  const quick = ok && !writing && elapsed > 0 && elapsed <= QUICK_MS;
  if (elapsed > 0 && !writing) session.times.push(elapsed);
  if (quick) session.quick++;
  $("#qtimer")?.classList.add("spent");
  session.qStart = 0;
  grade(ch.c, ok, SKILL_OF[item.kind] || "r", { practice: !!session.practice || !!session.repair, gentle: writing });
  /* A right answer here is worth exactly what a right answer in a sprint is
     worth, and it is the only way a character gets off the 错字本 page. */
  if (session.repair) sprintMark(ch.c, REPAIR_MODE[item.kind] || "r", ok);
  if (!item.fresh) { tally("rev", ch.c); session.reviewed++; }
  /* a rep in Go deeper, as opposed to a row on today's list */
  if ((session.practice || session.repair) && !session.todo) tallyExtra();
  if (ok) {
    session.right++; session.combo++;
    session.bestCombo = Math.max(session.bestCombo, session.combo);
    (session.got[item.kind] = session.got[item.kind] || new Set()).add(ch.c);
  } else {
    session.wrong++; session.combo = 0;
    /* a missed character comes round again — a missed handwriting attempt
       doesn't, because you've just been shown the strokes */
    if (!writing) requeue(item);
  }
  renderCombo();

  const praise = session.combo >= 8 ? "On fire." : session.combo >= 4 ? "Good run." : "Right.";
  let said;
  if (writing) {
    said = ok
      ? (slips > 0
          ? `Written — ${slips} slip${slips === 1 ? "" : "s"}, still counts.`
          : "Clean. Every stroke first time.")
      : slips === -1
        ? `<b>${esc(ch.c)}</b> · ${esc(ch.p)} · ${esc(ch.m)} — you looked first, so this one doesn't count towards 笔顺. Writing it out is still the point.`
        : `<b>${esc(ch.c)}</b> · ${esc(ch.p)} · ${esc(ch.m)} — handwriting is its own skill, so this hasn't touched your review schedule.`;
  } else {
    const r0 = rec(ch.c);
    said = ok ? esc(praise) + (extra ? " " + extra : "")
              : `<b>${esc(ch.c)}</b> · ${esc(ch.p)} · ${esc(ch.m)}${isLeech(ch.c)
                  ? ` — that's ${r0.wrong} misses. Another repetition won't fix this one; open the card.`
                  : " — you'll see it again shortly."}`;
  }
  const audible = ["p", "l", "r", "d"].includes(item.kind);
  foot.innerHTML = `
    <div class="verdict ${ok ? "ok" : "no"}">
      <span class="han">${ok ? "答对" : "再来"}</span>
      <span>${quick ? `<span class="quick-badge">快 ${(elapsed / 1000).toFixed(1)}s</span>` : ""}${said}</span>
      ${audible ? `<button class="verdict-play" id="replay" title="Hear it again" aria-label="Hear it again">🔊</button>` : ""}
    </div>
    <div class="split">
      ${ok || writing ? "" : `<button class="btn ${isLeech(ch.c) ? "btn-seal" : "btn-ghost"}" id="review">Study the card</button>`}
      <button class="btn ${ok ? "btn-timed" : ""}" id="cont" style="--wait:${AUTO_ADVANCE_MS}ms">${ok ? "Next" : "Continue"}</button>
    </div>`;
  /* listening again means you want to stay on this card */
  $("#replay")?.addEventListener("click", () => {
    clearAdvance();
    $("#cont")?.classList.remove("btn-timed");
    say(ch.c, true);
  });
  $("#cont").onclick = next;
  if (ok) advanceTimer = setTimeout(next, AUTO_ADVANCE_MS);
  const rv = $("#review");
  if (rv) rv.onclick = () => { session.queue.splice(session.idx, 0, { t: "intro", c: ch.c }); renderStep(); };
  $("#cont").focus();
}

function renderDone() {
  startQuestionTimer(false);              /* nothing left to time */
  const answered = session.right + session.wrong;
  const acc = answered ? Math.round((session.right / answered) * 100) : 100;
  const mark = acc >= 90 ? "甲" : acc >= 75 ? "乙" : "丙";
  const gradeNote = acc >= 90 ? "Top marks" : acc >= 75 ? "Solid work" : "Worth another pass";
  const qp = menuProgress();
  const gained = qp.known - session.questAtStart;
  const prac = session.practice ? PRACTICE[session.practice] : null;
  const fixing = session.repair;
  const cleared = fixing ? fixing.filter(c => rightRun(c) >= SPRINT_CLEAR) : [];
  if (session.todo) markDone(session.todo);
  else if (!session.practice && !session.repair) markDone("learn");
  /* Doing the work counts wherever you did it: if every one of today's
     characters was answered correctly in a task's drill during this session,
     that task is done — even if you started it from Go deeper. */
  TODAY_TASKS.forEach(task => {
    if (task.copy || didToday(task.id)) return;
    const pool = taskPool(task);
    if (!pool.length) return;
    if (pool.every(c => task.proves.some(k => session.got[k] && session.got[k].has(c)))) markDone(task.id);
  });
  const task = session.todo ? TODAY_TASKS.find(x => x.id === session.todo) : null;

  $("#sesInner").innerHTML = `
    <div class="done-wrap">
      <div class="grade-seal">${mark}</div>
      <span class="grade-note">${esc(gradeNote)} · ${acc}% correct</span>
      <div class="stack" style="gap:.3rem">
        <h1>${fixing ? "Repair round done." : task ? esc(task.name) + " — done." : prac ? esc(prac.name) + " practice done." : "Today's page is filled."}</h1>
        <p class="muted" style="font-size:.9rem">${fixing
          ? (cleared.length
              ? `${cleared.length} of ${fixing.length} off the 错字本 — ${cleared.map(esc).join(" ")}.`
                + (cleared.length < fixing.length ? ` The rest need ${SPRINT_CLEAR} right in a row.` : "")
              : `None cleared yet — a character leaves the page after ${SPRINT_CLEAR} right answers running, and they count wherever you get them.`)
          : prac
          ? `${answered} rep${answered === 1 ? "" : "s"}. Your reviews are untouched — this was extra.`
          : `${liveStreak()} day${liveStreak() === 1 ? "" : "s"} in a row.`}</p>
      </div>
      <div class="done-stats">
        ${prac || fixing ? `<div><b>${session.right}</b><small>right</small></div>
                 <div><b>${session.wrong}</b><small>missed</small></div>`
               : `<div><b>${session.learned}</b><small>learned</small></div>
                 <div><b>${session.reviewed}</b><small>reviewed</small></div>`}
        <div><b>${session.bestCombo}</b><small>best run</small></div>
        ${session.times.length ? `<div><b>${(session.times.reduce((a, b) => a + b, 0) / session.times.length / 1000).toFixed(1)}s</b><small>average</small></div>
        <div><b>${session.quick}</b><small><span class="han">快</span> under ${QUICK_MS / 1000}s</small></div>` : ""}
      </div>
      ${fixing ? `<button class="btn btn-ghost" id="againFix">Take the next five</button>`
      : prac ? `<button class="btn btn-ghost" id="again">Another ${esc(prac.name.toLowerCase())} round</button>`
      : `<div class="quest-bump">
        <div class="lbl"><span>🍜 Read a Menu</span><span>${qp.known} / ${qp.total}</span></div>
        <div class="bar ${qp.done ? "gold" : ""}"><i style="width:${(qp.pct * 100).toFixed(1)}%"></i></div>
        <div class="lbl"><span>${gained > 0 ? `+${gained} from today` : "No menu characters today"}</span>
          <span>${qp.done ? "Complete" : `${qp.total - qp.known} to go`}</span></div>
      </div>`}
    </div>`;
  $("#again")?.addEventListener("click", () => startPractice(session.practice));
  $("#againFix")?.addEventListener("click", () => {
    const next = sprintTrouble().slice(0, REPAIR_SIZE);
    if (next.length) startRepair(next); else endSession();
  });
  $("#sesFoot").innerHTML = prac || fixing
    ? `<button class="btn btn-block" id="fin">Done</button>`
    : qp.done
    ? `<div class="split"><button class="btn btn-ghost" id="fin">Close</button>
       <button class="btn btn-seal" id="openReward">🍜 Read your menu</button></div>`
    : `<button class="btn btn-block" id="fin">Close</button>`;
  $("#fin").onclick = endSession;
  const or = $("#openReward");
  if (or) or.onclick = () => { endSession(); openQuest("menu"); };
  $("#sesProg").style.width = "100%";
}

/* ============================================================
   Overlays — a character, and a quest
   ============================================================ */

function openSheet(title, html) {
  $("#svTitle").innerHTML = title;
  $("#svBody").innerHTML = html;
  $("#charView").classList.add("on");
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  $("#charView").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
}

function openChar(c) {
  const ch = CHAR_INDEX[c];
  if (!ch) return;
  const wid = "d" + Math.random().toString(36).slice(2, 8);
  const r = rec(c), st = strength(c);
  const stage = STAGES.find(s => s.n === ch.stage);
  openSheet(
    `<span class="han">${esc(ch.c)}</span> <span class="dim" style="font-weight:400;font-size:.85rem">${esc(stage.icon)} ${esc(stage.name)} · #${ch.i + 1}</span>`,
    `<div class="wrap"><div class="section">
      <div class="queue">${r
        ? `<span class="qpill">Seen <b>${r.seen}</b></span>
           <span class="qpill">Level <b>${r.lvl}/8</b></span>
           <span class="qpill">${st === "due" ? "Due <b>now</b>" : `Next <b>${esc(r.due)}</b>`}</span>`
        : `<span class="qpill">Not started yet</span>`}</div>
      ${charCard(ch, { writerId: wid })}
      ${r ? "" : isLocked(c)
        ? `<div class="gate-note">
             <span class="gate-k han">未开</span>
             <span>This one is in <b>${esc(tierOf(ch.i).name)} ${esc(tierOf(ch.i).zh)}</b>, which hasn't opened yet.
               ${(() => { const nd = tierNeeds(tierOf(ch.i));
                  return nd ? `Learn ${nd.more} more from ${esc(nd.tier.name)} and it unlocks.` : ""; })()}
               You can read about it here — it just isn't one to start on yet.</span>
           </div>`
        : `<button class="btn btn-block" id="learnNow">Learn this one now</button>`}
    </div></div>`);
  bindCard($("#svBody"), ch, wid);
  const ln = $("#learnNow");
  if (ln) ln.onclick = () => { introduce(c); tally("new"); closeSheet(); };
}

function openQuest(id) {
  const q = QUESTS.find(x => x.id === id);
  if (!q || q.locked) return;
  const p = menuProgress();
  const pick = menuToday();
  const target = pick.c && !isKnown(pick.c) ? pick.c : null;

  openSheet(`🍜 Read a Menu <span class="dim" style="font-weight:400;font-size:.85rem">看菜单</span>`,
    `<div class="wrap"><div class="section">
      <div class="today-head">
        <h1>${p.done ? "You can read this." : "The menu you're working towards."}</h1>
        <p class="note">${p.done
          ? "Every character here is one you've learned. Hover any of them for a reminder."
          : `${p.known} of ${p.total} characters are yours so far. The rest are greyed out — hover any of them to see what you're missing.`}</p>
      </div>
      <div class="bar ${p.done ? "gold" : ""}"><i style="width:${(p.pct * 100).toFixed(1)}%"></i></div>
      ${renderMenuCard(target, true)}
      <div class="sheet block">
        <div class="block-head"><span class="k">口语</span><span class="t">Say it out loud</span></div>
        <div class="phrase-list">
          ${MENU.phrases.map(ph => `<button class="phrase" data-speak="${esc(ph[0])}">
            <span class="z">${glyphs(ph[0], target)}</span>
            <span class="p">${esc(ph[1])}</span>
            <span class="e">${esc(ph[2])}</span>
          </button>`).join("")}
        </div>
      </div>
      
    </div></div>`);
}

/* ============================================================
   Views
   ============================================================ */

function ringSvg(pct, done) {
  const R = 28, C = 2 * Math.PI * R;
  const arc = C * Math.min(1, Math.max(0, pct));
  return `<svg viewBox="0 0 66 66"><circle class="trk" cx="33" cy="33" r="${R}"/>
    ${arc > 0.5 ? `<circle class="val ${done ? "done" : ""}" cx="33" cy="33" r="${R}"
      stroke-dasharray="${arc.toFixed(1)} ${C.toFixed(1)}"/>` : ""}</svg>`;
}

/* ---------- the menu, rendered as print ---------- */

/* Every Chinese glyph becomes hoverable. */
function glyphs(str, target) {
  return [...str].map(c => {
    if (!/[\u4e00-\u9fff]/.test(c)) return esc(c);
    const cls = c === target ? "target" : isKnown(c) ? "known" : "";
    return `<span class="g ${cls}" data-ch="${esc(c)}">${esc(c)}</span>`;
  }).join("");
}

/* How grown-up a menu you can cope with right now. */
function menuTier() {
  const k = menuProgress().known;
  return MENU_TIERS.filter(t => k >= t.at).pop() || MENU_TIERS[0];
}

function renderMenuCard(target, tall) {
  const m = MENU, tier = menuTier().n;
  const row = it => `<div class="mrow">
      <span class="dish">${glyphs(it[0], target)}</span>
      <span class="dots"></span>
      <span class="price">¥${it[3]}</span>
    </div>${tier >= 2 && it[4] ? `<div class="mdesc">${glyphs(it[4][0], target)}</div>` : ""}`;

  return `<div class="menu-card ${tall ? "tall" : ""}">
    <div class="menu-top">
      <span class="t">${glyphs(m.title, target)}</span>
      <span class="n">${glyphs(m.name, target)}</span>
      <span class="e">${esc(m.en)}</span>
    </div>
    ${tier >= 3 ? `<div class="msec special">
      <div class="msec-head"><span class="z">${glyphs(m.specials.head, target)}</span><span class="e">${esc(m.specials.en)}</span></div>
      ${m.specials.items.map(row).join("")}
      <div class="mnote">${glyphs(m.specials.note[0], target)}</div>
    </div>` : ""}
    ${m.sections.map(s => `<div class="msec">
      <div class="msec-head"><span class="z">${glyphs(s.head, target)}</span><span class="e">${esc(s.en)}</span></div>
      ${s.items.map(row).join("")}
    </div>`).join("")}
  </div>`;
}

/* ---------- anything marked [data-speak] says itself ----------

   data-speak was on the menu's five phrases from the start and nothing ever
   listened for it: "Say it out loud" was a row of buttons that did nothing at
   all. One delegated listener covers those and anything marked the same way
   later. */
function initSpeakables() {
  document.addEventListener("click", e => {
    const b = e.target instanceof Element ? e.target.closest("[data-speak]") : null;
    if (!b) return;
    const text = b.dataset.speak;
    if (!text) return;
    sayPhrase(text, true);
    /* a beat of ink so a click that makes no sound still reads as a click —
       the clips are per character and a phrase may have one missing */
    b.classList.add("said");
    setTimeout(() => b.classList.remove("said"), 420);
  });
}

/* ---------- hover cards ---------- */

let tipEl = null;
function initTips() {
  tipEl = document.createElement("div");
  tipEl.className = "tip";
  document.body.appendChild(tipEl);

  document.addEventListener("mouseover", e => {
    const g = e.target.closest("[data-ch]");
    if (!g) return;
    const ch = CHAR_INDEX[g.dataset.ch];
    if (!ch) return;
    const known = isKnown(ch.c);
    tipEl.innerHTML = `<div class="z">${esc(ch.c)}</div>
      <div class="p">${esc(ch.p)}</div>
      <div class="m">${esc(ch.m)}</div>
      <div class="s">${known ? "You know this one" : "Not learned yet"} · ${esc(ch.words[0][0])} ${esc(ch.words[0][2])}</div>`;
    tipEl.classList.add("on");
    place(g);
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest("[data-ch]")) tipEl.classList.remove("on");
  });
  /* touch has no hover — open the full card instead */
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-ch]");
    if (g && CHAR_INDEX[g.dataset.ch]) openChar(g.dataset.ch);
  });

  function place(g) {
    const r = g.getBoundingClientRect(), t = tipEl.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2;
    let y = r.top - t.height - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(x, innerWidth - t.width - 8));
    tipEl.style.left = x + "px";
    tipEl.style.top = y + "px";
  }
}

/* ---------- flashcards ---------- */

const flash = { deck: [], i: 0, flipped: false, title: "" };

function openFlash(deck, title) {
  if (!deck.length) return;
  flash.deck = shuffle([...deck]);
  flash.i = 0; flash.flipped = false; flash.title = title;
  $("#flash").classList.add("on");
  document.body.style.overflow = "hidden";
  renderFlash();
}
function closeFlash() {
  $("#flash").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
}
/* The first sense of a meaning, for somewhere there is only room for one.

   Splitting on the first punctuation mark is nearly right, but fourteen
   characters are pure grammar and are glossed entirely in brackets — 们 is
   "(plural marker for people)" — which that rule shortens to nothing at all.
   Where trimming would leave an empty string, the whole gloss is the short
   form. */
function shortMeaning(m) {
  const str = String(m).trim();
  /* a gloss that opens with a bracket: prefer whatever follows it, and fall
     back to the bracket's own contents when nothing does */
  const lead = str.match(/^\(([^)]*)\)\s*(.*)$/);
  if (lead) {
    const after = lead[2].replace(/^[;,]\s*/, "").split(/[;,(]/)[0].trim();
    return after || lead[1].trim();
  }
  return str.split(/[;,(]/)[0].trim() || str;
}

/* A deck entry is either a character (a plain string) or a word (its
   [hanzi, pinyin, meaning] triple). Both make the same shape of card, so the
   renderer asks for that shape rather than branching all the way down. */
function flashFace(entry) {
  if (typeof entry === "string") {
    const ch = CHAR_INDEX[entry];
    return { front: ch.c, pin: ch.p, mean: ch.m, tone: true,
             foot: `${ch.words[0][0]} · ${ch.words[0][1]}`, speak: ch.c, wide: false };
  }
  const [w, pin, mean] = entry;
  /* the back names the parts, which is the whole point of a combinations deck:
     seeing that 大人 is big + person is what makes it stick */
  const parts = [...w].filter(c => CHAR_INDEX[c])
    .map(c => `${c} ${shortMeaning(CHAR_INDEX[c].m)}`).join("  +  ");
  /* no tone glyph on a word: the mark draws one contour, and 大人 has two
     syllables with two different ones. A single shape would be a lie. */
  return { front: w, pin, mean, tone: false, foot: parts, speak: w, wide: [...w].length > 2 };
}

function renderFlash() {
  const entry = flash.deck[flash.i];
  const f = flashFace(entry);
  $("#flashTitle").textContent = flash.title;
  $("#flashCount").textContent = `${flash.i + 1} / ${flash.deck.length}`;
  $("#flashStage").innerHTML = `
    <button class="card3d ${flash.flipped ? "flipped" : ""}" id="card3d" aria-label="Flip card">
      <div class="card3d-inner">
        <div class="card-face">
          <span class="big ${f.wide ? "big-wide" : ""}">${esc(f.front)}</span>
          <span class="hint">Tap to flip</span>
        </div>
        <div class="card-face card-back">
          <span class="sm">${esc(f.front)}</span>
          <span class="pin">${esc(f.pin)}${f.tone ? " " + toneMark(f.pin) : ""}</span>
          <span class="mean">${esc(f.mean)}</span>
          <span class="word">${esc(f.foot)}</span>
          <span class="hint">Tap to flip back</span>
        </div>
      </div>
    </button>`;
  $("#card3d").onclick = () => {
    flash.flipped = !flash.flipped;
    $("#card3d").classList.toggle("flipped", flash.flipped);
    if (flash.flipped) sayPhrase(f.speak);
  };
  $("#flashPrev").disabled = flash.i === 0;
  $("#flashNext").textContent = flash.i === flash.deck.length - 1 ? "Done" : "Next";
}
function flashStep(d) {
  if (flash.i + d >= flash.deck.length) return closeFlash();
  flash.i = Math.max(0, flash.i + d);
  flash.flipped = false;
  renderFlash();
}

/* ============================================================
   抄写 — guided copying

   Write a set of characters, one per square, strokes checked as you go.
   The set is today's characters by default, because that's what needs
   bedding in; a word you already know is the other option.
   ============================================================ */

const nb = { source: "today", deck: [], pos: 0, chars: [], idx: 0,
             writers: [], done: [], word: null, round: 1 };

const NB_LINE = 5;                       /* squares shown at a time */

/* Words you could actually write: every character known and drawable. */
function writableWords() {
  const out = new Map();
  knownChars().forEach(c => CHAR_INDEX[c].words.forEach(w => {
    if (w[0].length >= 2 && [...w[0]].every(z => CHAR_INDEX[z] && isKnown(z) && window.STROKE_DATA[z]))
      out.set(w[0], w);
  }));
  return [...out.values()];
}
const todaysWritable = () => learnedToday().filter(c => window.STROKE_DATA[c]);
const nbCanWrite = () => todaysWritable().length > 0 || writableWords().length > 0;

/* Shuffled, and every character from today — not the first handful in the
   order you met them, which you'd end up reciting rather than recalling. */
function nbBuildDeck() {
  if (nb.source === "word") {
    const words = writableWords();
    if (!words.length) return [];
    const pool = words.filter(w => !nb.word || w[0] !== nb.word[0]);
    nb.word = one(pool.length ? pool : words);
    return [...nb.word[0]];
  }
  nb.word = null;
  return shuffle(todaysWritable());
}

function nbLine() {
  nb.chars = nb.deck.slice(nb.pos, nb.pos + NB_LINE);
  nb.done = [];
  nb.idx = 0;
}

function nbSetSource(src) {
  nb.source = todaysWritable().length || src === "word" ? src : "today";
  nb.deck = nbBuildDeck();
  if (!nb.deck.length && src === "word") { nb.source = "today"; nb.deck = nbBuildDeck(); }
  nb.pos = 0; nb.round = 1;
  nbLine();
}

function openNotebook() {
  if (!nbCanWrite()) return;
  nb.word = null;
  nbSetSource(todaysWritable().length ? "today" : "word");
  if (!nb.chars.length) return;
  $("#notebook").classList.add("on");
  document.body.style.overflow = "hidden";
  renderNotebook();
}

function closeNotebook() {
  padStop();
  nb.writers = [];
  $("#notebook").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
}

/* Finishing here should hand you straight to whatever's still outstanding. */
function nextExercise() {
  const next = TODAY_TASKS.find(t => !t.copy && taskAvailable(t) && !didToday(t.id));
  closeNotebook();
  if (next) setTimeout(() => startTodayDrill(next), 260);
}

function renderNotebook() {
  const byWord = nb.source === "word";
  const today = todaysWritable();
  const total = nb.deck.length;
  const doneSoFar = Math.min(nb.pos + nb.done.filter(Boolean).length, total);

  $("#nbTitle").innerHTML = `<span class="han">抄写</span> Writing practice
    <span class="dim" style="font-weight:400;font-size:.82rem">${byWord && nb.word
      ? esc(nb.word[1]) + " · " + esc(nb.word[2])
      : `today's characters · round ${nb.round}`}</span>`;

  $("#nbStage").innerHTML = `
    <div class="nb-modes">
      <button class="filt ${!byWord ? "on" : ""}" data-nbsrc="today" ${today.length ? "" : "disabled"}>今天 Today's</button>
      <button class="filt ${byWord ? "on" : ""}" data-nbsrc="word" ${writableWords().length ? "" : "disabled"}>词语 A word</button>
      <button class="filt" id="nbNew">${byWord ? "Another word" : "Shuffle"}</button>
    </div>

    <div class="nb-progress">
      <span class="nb-count">${doneSoFar} / ${total}</span>
      <span class="bar"><i style="width:${total ? (doneSoFar / total * 100).toFixed(1) : 0}%"></i></span>
    </div>

    <div class="nb-line">
      ${nb.chars.map((c, i) => `
        <div class="nb-sq ${i === nb.idx ? "on" : ""} ${nb.done[i] ? "done" : ""}" data-sq="${i}">
          <div class="tian">${TIAN_SVG}<div class="tian-slot"><div id="nbw${i}"></div></div></div>
          <span class="nb-label">${esc(c)}</span>
        </div>`).join("")}
    </div>

    <div class="nb-tools">
      <button class="btn btn-ghost btn-sm" id="nbPad">触控 Trackpad <kbd class="opt-n">T</kbd></button>
    </div>

    <p class="note nb-hint">Write each character in order — the strokes are checked as you go.
      For a blank page to scribble on, use the <span class="han">练字</span> tab.</p>`;

  nb.writers = [];
  nb.chars.forEach((c, i) => {
    const w = makeWriter($("#nbw" + i), c, { width: 150, height: 150,
      showCharacter: !!nb.done[i], showOutline: i === nb.idx && !nb.done[i] });
    nb.writers[i] = w;
    if (w && i === nb.idx && !nb.done[i]) startSquare(i);
  });

  /* Changing exercise keeps the lock: #nbStage holds it and survives the
     re-render, so the brush only needs re-pointing at the new first square. */
  $$("#nbStage [data-nbsrc]").forEach(b => b.onclick = () => {
    nb.word = null; nbSetSource(b.dataset.nbsrc); renderNotebook(); nbFollow();
  });
  $("#nbNew").onclick = () => { nbSetSource(nb.source); renderNotebook(); nbFollow(); };
  $("#nbPad").onclick = () => nbPad();
  $$("#nbStage .nb-sq").forEach(sq => sq.addEventListener("click", () => {
    const i = +sq.dataset.sq;
    if (i === nb.idx || nb.done[i]) return;
    nb.idx = i;
    renderNotebook();
    nbFollow();
  }));
  renderNotebookPadState();
  nbAutoPad();
}

/* Keep the brush on whichever square is live, without disturbing the lock. */
function nbFollow(retry) {
  retry = retry || 0;
  if (!pad.active || nb.idx < 0) return;
  const sq = $(`#nbStage .nb-sq[data-sq="${nb.idx}"]`);
  const mount = $("#nbw" + nb.idx);
  if (!sq || !mount || !mount.querySelector("svg")) {
    if (retry < 15) setTimeout(() => nbFollow(retry + 1), 60);
    return;
  }
  padRetarget(mount, $(".tian", sq));
}

function startSquare(i) {
  const w = nb.writers[i];
  if (!w) return;
  w.cancelQuiz();
  w.quiz({
    showHintAfterMisses: 2,
    onComplete: () => {
      nb.done[i] = true;
      say(nb.chars[i]);
      const nextInLine = nb.chars.findIndex((_, k) => !nb.done[k]);
      if (nextInLine >= 0) {
        nb.idx = nextInLine;
        renderNotebook();
        nbFollow();
        return;
      }
      /* line finished — slide on to the next without breaking stride */
      nb.pos += NB_LINE;
      if (nb.pos < nb.deck.length) {
        nbLine();
        renderNotebook();
        nbFollow();
        return;
      }
      nb.idx = -1;
      markDone("copy");
      renderNotebook();
      const more = TODAY_TASKS.filter(t => !t.copy && taskAvailable(t) && !didToday(t.id)).length;
      $("#nbStage").insertAdjacentHTML("beforeend",
        `<div class="nb-finish">
           <div class="verdict ok"><span class="han">写完</span>
             <span>${byWordLabel()} — round ${nb.round} done, ${nb.deck.length} character${nb.deck.length === 1 ? "" : "s"} written.</span></div>
           <div class="split">
             <button class="btn btn-ghost" id="nbAgain">Another round</button>
             <button class="btn" id="nbDone">${more ? "Next exercise →" : "Done"}</button>
           </div>
         </div>`);
      $("#nbAgain").onclick = () => {
        nb.round++;
        nb.deck = nb.source === "word" ? nb.deck : shuffle(todaysWritable());
        nb.pos = 0; nbLine(); renderNotebook(); nbFollow();
      };
      $("#nbDone").onclick = more ? nextExercise : closeNotebook;
    }
  });
}

const byWordLabel = () => nb.word ? esc(nb.word[0]) : "Today's characters";

/* The notebook moves between squares without tearing the lock down, so this
   only ever has to fire for the first square of an exercise. */
function nbAutoPad() {
  const sq = $(`#nbStage .nb-sq[data-sq="${nb.idx}"]`);
  const mount = $("#nbw" + nb.idx);
  if (!sq || !mount || !mount.querySelector("svg")) return;
  if (padHandoff($(".tian", sq), mount, renderNotebookPadState, $("#nbStage"))) {
    setTimeout(renderNotebookPadState, 60);
  }
}

function nbPad() {
  if (pad.active) { padStop(); renderNotebookPadState(); return; }
  const sq = $(`#nbStage .nb-sq[data-sq="${nb.idx}"]`);
  const mount = $("#nbw" + nb.idx);
  if (!sq || !mount || !mount.querySelector("svg")) return;
  /* the lock lives on the stage, so moving between squares never re-requests it */
  if (padStart($(".tian", sq), mount, renderNotebookPadState, null, $("#nbStage"))) {
    setTimeout(renderNotebookPadState, 60);
  }
}

function renderNotebookPadState() {
  const b = $("#nbPad");
  if (!b) return;
  b.innerHTML = (pad.active ? "触控 Trackpad on" : "触控 Trackpad") + ` <kbd class="opt-n">T</kbd>`;
  b.classList.toggle("on", pad.active);
}

/* ============================================================
   练字 — the exercise book

   A page to spam bad handwriting into. One grid, one sheet of ink that
   never resets unless you clear it, and an optional faint character to
   trace like a 字帖 copybook.
   ============================================================ */

const wp = { built: false, rows: 6, guide: null, pen: 8, cell: 84, strokes: [], cur: null,
             sort: "day", find: "" };

/* ---------- the practice diary ----------
   Pages are stored as stroke vectors, not pictures: a densely filled page is
   about 30 KB of points against 333 KB as a PNG, and vectors redraw crisply
   at any size and re-ink themselves correctly when the theme changes.
   IndexedDB, not localStorage, because that has room for years of them. */

function diaryDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("hanzi-quest", 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("pages")) d.createObjectStore("pages", { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function diaryTx(mode, fn) {
  return diaryDB().then(d => new Promise((res, rej) => {
    const tx = d.transaction("pages", mode);
    const out = fn(tx.objectStore("pages"));
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    tx.onerror = () => rej(tx.error);
  })).catch(() => null);
}
const diaryPut = page => diaryTx("readwrite", st => st.put(page));
const diaryDel = id   => diaryTx("readwrite", st => st.delete(id));
const diaryAll = ()   => diaryTx("readonly",  st => st.getAll()).then(r => r || []);
const diaryClear = ()  => diaryTx("readwrite", st => st.clear());

function renderWrite() {
  if (!wp.built) buildWritePage(); else wpControls();
}

function buildWritePage() {
  $("#viewWrite").innerHTML = `<div class="wrap wp-wrap">
    <div class="cols">
      <div class="section">
        <div class="wp-bar">
          <div class="wp-title">
            <span class="eyebrow">练字 · Exercise book</span>
            <p class="note">A blank page. Nothing is checked here — fill it, scrawl on it, clear it and go again.</p>
          </div>
          <div class="wp-tools">
            <label class="wp-field">Nib
              <select id="wpPen">
                <option value="5">fine</option><option value="8" selected>medium</option><option value="13">broad</option>
              </select>
            </label>
            <button class="btn btn-ghost btn-sm" id="wpPad">触控 Trackpad</button>
            <button class="btn btn-ghost btn-sm" id="wpSave">Save page</button>
            <button class="btn btn-ghost btn-sm" id="wpClear">Clear page</button>
          </div>
        </div>
        <div class="wp-page" id="wpPage">
          <canvas id="wpGrid"></canvas>
          <canvas id="wpInk"></canvas>
        </div>
        <div class="wp-foot">
          <button class="btn btn-ghost btn-sm" id="wpMore">Add more rows</button>
          <span class="note" id="wpCount"></span>
        </div>
        <div class="sheet wp-diary" id="wpDiary"></div>
      </div>
      <div class="col-side">
        <div class="sheet wp-picker" id="wpPicker"></div>
      </div>
    </div>
  </div>`;
  wp.built = true;
  wpControls();
  wpSizePage();
  wpBindInk();
  wpAutoPad();

  $("#wpPen").onchange  = e => { wp.pen = +e.target.value; wpSetPen(); };
  $("#wpClear").onclick = () => wpClear();
  $("#wpSave").onclick  = () => wpSave();
  $("#wpPad").onclick   = () => wpPad();
  $("#wpMore").onclick  = () => { wp.rows += 4; wpSizePage(); };
  addEventListener("resize", wpSizePage);
  wpDiary();
}

function wpControls() {
  const b = $("#wpPad");
  if (b) { b.textContent = pad.active ? "触控 Trackpad on" : "触控 Trackpad"; b.classList.toggle("on", pad.active); }
  renderPicker();
}

const WP_SORTS = [
  { id: "day",    label: "By day" },
  { id: "stage",  label: "By stage" },
  { id: "pinyin", label: "A–Z" },
  { id: "weak",   label: "Shakiest" }
];

function dayLabel(key) {
  if (key === dayKey()) return "Today";
  const d = new Date(); d.setDate(d.getDate() - 1);
  if (key === dayKey(d)) return "Yesterday";
  const [y, m, dd] = key.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* A dropdown of hundreds of characters is unusable. Grouped chips are not —
   by default the days you learned them, which is how you'd think of them. */
function pickerGroups() {
  let known = knownChars().filter(c => window.STROKE_DATA[c]);
  if (wp.find) known = known.filter(c => matches(CHAR_INDEX[c], wp.find));
  if (wp.sort === "day") {
    const by = {};
    known.forEach(c => { const d = (rec(c) && rec(c).first) || "0000-00-00"; (by[d] = by[d] || []).push(c); });
    return Object.keys(by).sort().reverse().map(d => ({ label: dayLabel(d), chars: by[d] }));
  }
  if (wp.sort === "stage") {
    return STAGES.map(st => ({ label: `${st.icon} ${st.name}`,
        chars: known.filter(c => CHAR_INDEX[c].stage === st.n) })).filter(g => g.chars.length);
  }
  if (wp.sort === "weak") {
    const score = c => ((rec(c).skills.w || 0) * 10) - rec(c).wrong;
    return [{ label: "Needs the most work", chars: [...known].sort((a, b) => score(a) - score(b)) }];
  }
  return [{ label: "All characters",
            chars: [...known].sort((a, b) => CHAR_INDEX[a].p.localeCompare(CHAR_INDEX[b].p)) }];
}

function renderPicker() {
  const host = $("#wpPicker");
  if (!host) return;
  const groups = pickerGroups();
  const total = groups.reduce((a, g) => a + g.chars.length, 0);

  host.innerHTML = `
    <div class="pick-head">
      <span class="eyebrow">Trace a character</span>
      ${wp.guide ? `<button class="link-btn" id="pickClear">Clear <span class="han">${esc(wp.guide)}</span></button>` : ""}
    </div>
    <input class="search pick-find" id="pickFind" type="search" placeholder="Find a character…" value="${esc(wp.find)}">
    <div class="pick-sorts">
      ${WP_SORTS.map(o => `<button class="filt ${wp.sort === o.id ? "on" : ""}" data-sort="${o.id}">${esc(o.label)}</button>`).join("")}
    </div>
    <div class="pick-scroll">
      ${total ? groups.map(g => `<div class="pick-group">
        <div class="pick-label">${esc(g.label)}<span>${g.chars.length}</span></div>
        <div class="pick-grid">${g.chars.map(c => `<button class="pick ${wp.guide === c ? "on" : ""}"
          data-pick="${esc(c)}" title="${esc(CHAR_INDEX[c].p)} · ${esc(CHAR_INDEX[c].m)}">${esc(c)}</button>`).join("")}</div>
      </div>`).join("")
      : `<p class="note">${wp.find ? "Nothing matches." : "Learn a character and it'll appear here."}</p>`}
    </div>`;

  $$("#wpPicker [data-sort]").forEach(b => b.onclick = () => { wp.sort = b.dataset.sort; renderPicker(); });
  $$("#wpPicker [data-pick]").forEach(b => b.onclick = () => {
    wp.guide = wp.guide === b.dataset.pick ? null : b.dataset.pick;
    wpDrawGrid(); renderPicker();
  });
  $("#pickClear")?.addEventListener("click", () => { wp.guide = null; wpDrawGrid(); renderPicker(); });
  const f = $("#pickFind");
  if (f) f.oninput = () => {
    wp.find = f.value.trim();
    const pos = f.selectionStart;
    renderPicker();
    const n = $("#pickFind"); n.focus(); n.setSelectionRange(pos, pos);
  };
}

function wpSizePage() {
  const page = $("#wpPage");
  if (!page || !page.isConnected) return;
  page.style.height = (wp.rows * wp.cell) + "px";
  wpDrawGrid();
  wpSizeInk();
  const cols = Math.max(1, Math.floor(page.clientWidth / wp.cell));
  const cnt = $("#wpCount");
  if (cnt) cnt.textContent = `${cols * wp.rows} squares`;
}

function wpDPR() { return Math.min(2, window.devicePixelRatio || 1); }

function wpDrawGrid() {
  const c = $("#wpGrid"), page = $("#wpPage");
  if (!c || !page) return;
  const dpr = wpDPR(), w = page.clientWidth, h = page.clientHeight;
  if (!w || !h) return;                    /* hidden tab: sizing now would blank it */
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const rule = cs.getPropertyValue("--rule").trim() || "#CBD5CC";
  const seal = cs.getPropertyValue("--seal").trim() || "#C0392B";
  const cell = wp.cell;
  const cols = Math.max(1, Math.floor(w / cell));
  const pad0 = (w - cols * cell) / 2;

  for (let r = 0; r < wp.rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = pad0 + k * cell, y = r * cell;
      ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      /* 米字格: centre cross and diagonals, in seal red at low opacity */
      ctx.save();
      ctx.strokeStyle = seal; ctx.globalAlpha = 0.28; ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y); ctx.lineTo(x + cell / 2, y + cell);
      ctx.moveTo(x, y + cell / 2); ctx.lineTo(x + cell, y + cell / 2);
      ctx.moveTo(x, y); ctx.lineTo(x + cell, y + cell);
      ctx.moveTo(x + cell, y); ctx.lineTo(x, y + cell);
      ctx.stroke();
      ctx.restore();
      if (wp.guide) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = cs.getPropertyValue("--ink").trim() || "#17211E";
        ctx.font = `${Math.round(cell * 0.78)}px "Songti SC","STSong","Noto Serif SC",serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(wp.guide, x + cell / 2, y + cell / 2 + 2);
        ctx.restore();
      }
    }
  }
}

/* Resizing a canvas wipes it, so carry the ink across. */
function wpSizeInk() {
  const c = $("#wpInk"), page = $("#wpPage");
  if (!c || !page) return;
  const dpr = wpDPR(), w = page.clientWidth, h = page.clientHeight;
  /* A resize while this tab is hidden reports zero, and resizing a canvas to
     zero throws away everything on it — so never act on a zero measurement. */
  if (!w || !h) return;
  if (c.width === w * dpr && c.height === h * dpr) return;
  let keep = null;
  if (c.width && c.height) {
    keep = document.createElement("canvas");
    keep.width = c.width; keep.height = c.height;
    keep.getContext("2d").drawImage(c, 0, 0);
  }
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  wpSetPen();
  if (keep) ctx.drawImage(keep, 0, 0, keep.width / dpr, keep.height / dpr);
}

function wpSetPen() {
  const c = $("#wpInk");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.lineWidth = wp.pen; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#17211E";
}

function wpDraw(type, x, y) {
  const c = $("#wpInk");
  if (!c) return;
  const ctx = c.getContext("2d");
  if (type === "mousedown") {
    ctx.beginPath(); ctx.moveTo(x, y);
    wp.cur = [[Math.round(x), Math.round(y)]];
    wp.strokes.push(wp.cur);
  } else if (type === "mousemove" && wp.cur) {
    ctx.lineTo(x, y); ctx.stroke();
    wp.cur.push([Math.round(x), Math.round(y)]);
  } else if (type === "mouseup") {
    wp.cur = null;
  }
}

/* Repaint a page from its vectors — used when loading from the diary. */
function wpPaint(strokes, ctx, scale) {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  strokes.forEach(pts => {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale, pts[0][1] * scale);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * scale, pts[i][1] * scale);
    ctx.stroke();
  });
  ctx.restore();
}

function wpClear() {
  const c = $("#wpInk");
  if (!c) return;
  c.getContext("2d").clearRect(0, 0, c.width, c.height);
  wp.strokes = []; wp.cur = null;
}

/* After a reset. renderWrite() deliberately no-ops once the page is built, so
   without this the exercise book keeps the ink that was on it and the diary
   strip keeps listing pages that have just been deleted. */
function wpReset() {
  if (!wp.built) return;
  wpClear();
  wpDiary();
}

function wpBindInk() {
  const c = $("#wpInk");
  let drawing = false;
  const at = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.addEventListener("pointerdown", e => {
    if (pad.active) return;
    drawing = true; const p = at(e); wpDraw("mousedown", p.x, p.y);
    c.setPointerCapture(e.pointerId); e.preventDefault();
  });
  c.addEventListener("pointermove", e => { if (drawing && !pad.active) { const p = at(e); wpDraw("mousemove", p.x, p.y); } });
  c.addEventListener("pointerup", () => { if (drawing) wpDraw("mouseup"); drawing = false; });
  c.addEventListener("pointercancel", () => { if (drawing) wpDraw("mouseup"); drawing = false; });
}

function wpPad() {
  if (pad.active) { padStop(); wpControls(); return; }
  if (padStart($("#wpPage"), null, wpControls, wpDraw)) setTimeout(wpControls, 50);
}

function wpAutoPad() {
  if (padAuto($("#wpPage"), null, wpControls, wpDraw)) setTimeout(wpControls, 50);
}

async function wpSave() {
  if (!wp.strokes.length) return;
  const page = $("#wpPage");
  await diaryPut({
    id: Date.now(), date: dayKey(), w: page.clientWidth, h: page.clientHeight,
    rows: wp.rows, guide: wp.guide,
    strokes: wp.strokes.map(p => p.map(([x, y]) => [x, y]))
  });
  wpDiary();
}

async function wpLoad(id) {
  const all = await diaryAll();
  const page = all.find(p => p.id === id);
  if (!page) return;
  wp.rows = page.rows || wp.rows;
  wp.guide = page.guide || null;
  wpControls(); wpSizePage();
  const c = $("#wpInk"), ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  wpSetPen();
  wpPaint(page.strokes, ctx, $("#wpPage").clientWidth / (page.w || 1));
  wp.strokes = page.strokes.map(p => p.map(([x, y]) => [x, y]));
  wp.cur = null;
}

async function wpDiary() {
  const host = $("#wpDiary");
  if (!host) return;
  const all = (await diaryAll()).sort((a, b) => b.id - a.id);
  if (!all.length) {
    host.innerHTML = `<p class="note">Save a page and it'll be kept here by date — a diary of your handwriting.</p>`;
    return;
  }
  const bytes = all.reduce((a, p) => a + p.strokes.reduce((n, s2) => n + s2.length, 0), 0) * 8;
  host.innerHTML = `
    <div class="pr-head">
      <span class="eyebrow">Practice diary</span>
      <span class="dim" style="font-size:.74rem">${all.length} page${all.length === 1 ? "" : "s"} · about ${(bytes / 1024).toFixed(0)} KB</span>
    </div>
    <div class="diary-strip">
      ${all.map(p => `<div class="diary-item">
        <button class="diary-thumb" data-page="${p.id}" title="Open this page">
          <canvas width="150" height="${Math.round(150 * (p.h || 1) / (p.w || 1))}"></canvas>
        </button>
        <span class="diary-date"><span>${esc(new Date(p.id).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}
          · ${esc(new Date(p.id).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }))}</span><button class="diary-del" data-del="${p.id}" aria-label="Delete page">✕</button></span>
      </div>`).join("")}
    </div>`;

  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#17211E";
  $$("#wpDiary .diary-thumb").forEach((b, i) => {
    const cv = b.querySelector("canvas"), ctx = cv.getContext("2d");
    ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
    wpPaint(all[i].strokes, ctx, cv.width / (all[i].w || 1));
    b.onclick = () => wpLoad(all[i].id);
  });
  $$("#wpDiary .diary-del").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    await diaryDel(+b.dataset.del);
    wpDiary();
  });
}

/* ---------- the four-week tracker ---------- */

function renderTracker() {
  const days = 28, cells = [];
  const start = new Date(); start.setDate(start.getDate() - days + 1);
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dayKey(d), r = state.days[k], n = dayReps(r);
    const lvl = n === 0 ? "" : n < 5 ? "f1" : n < 12 ? "f2" : n < 25 ? "f3" : "f4";
    cells.push(`<span class="day ${lvl} ${k === dayKey() ? "today" : ""}" title="${k}: ${n} card${n === 1 ? "" : "s"}"></span>`);
  }
  const s = liveStreak(), total = daysStudied();
  $("#tracker").innerHTML = `
    <span class="tracker-lbl">Last 4 weeks</span>
    <span class="tracker-row">${cells.join("")}</span>
    <span class="tracker-note" title="A missed day leaves an empty box — nothing you've done is ever cleared.">
      ${s ? `🔥 ${s}` : "🔥 0"}<span class="sep">·</span>${total} day${total === 1 ? "" : "s"} studied</span>`;
}

/* ---------- 正 as a counting mark ----------

   Five strokes, drawn in order — the tally that's kept across China and Japan,
   the five-bar gate with the gate made out of a character. It earns its place
   here over stars or a growing tree for two reasons: it's the genuine article
   rather than decoration, and the seedling-to-tree metaphor is already taken
   by the stage ladder (🌱 Seed → 🌿 Sprout → 🍃 Branch), where it means
   something different. Reusing it for reps would blur both.

   One rep of extra practice draws one stroke, so a finished 正 is five reps
   and a row of them is the day's work, countable at a glance. */

const ZHENG = [
  "M14 21 H86",     /* 1  the lid */
  "M39 21 V80",     /* 2  the long vertical */
  "M39 50 H81",     /* 3  the arm */
  "M17 50 V80",     /* 4  the short leg */
  "M11 80 H89"      /* 5  the base */
];

function tallyMark(strokes) {
  return `<svg class="tally" viewBox="0 0 100 100" aria-hidden="true">${
    ZHENG.map((d, i) => `<path d="${d}" class="${i < strokes ? "on" : "off"}"/>`).join("")
  }</svg>`;
}

/* A row of them, with the last one part-drawn. Past `max` the row would stop
   being countable, so it becomes a multiplier instead. */
function tallyRow(n, max = 6) {
  if (!n) return `<span class="tally-none">${tallyMark(0)}<span>no reps yet today</span></span>`;
  const full = Math.floor(n / 5), rest = n % 5;
  if (full > max) {
    return `<span class="tally-row">${tallyMark(5)}<span class="tally-x">× ${full}${rest ? ` + ${rest}` : ""}</span></span>`;
  }
  const marks = [];
  for (let i = 0; i < full; i++) marks.push(tallyMark(5));
  if (rest) marks.push(tallyMark(rest));
  return `<span class="tally-row">${marks.join("")}</span>`;
}

/* ---------- today ---------- */

/* Characters you actually sat down and learnt today.

   Placement credits happen today too — ensure() stamps `first` with today's
   date whichever way a character arrives — so crediting 69 characters put all
   69 in here, and Today's whole page followed: a "Learned today" strip of 69,
   and a practice list that wanted you to write out and pronounce every one of
   them. Being placed is not the same as having learnt them this morning, and
   `placed` is exactly the flag that tells the two apart. */
function learnedToday() {
  const k = dayKey();
  return HQ.filter(ch => {
    const r = state.chars[ch.c];
    return r && r.first === k && !r.placed;
  }).map(ch => ch.c);
}

/* Today's practice list — everything here is scoped to the characters you
   picked up today, so it's a short, finishable list rather than a menu. */
const TODAY_TASKS = [
  { id: "recall", k: "认读", name: "Recognise them",       sub: "character to meaning", kind: "r", proves: ["r"] },
  { id: "read",   k: "阅读", name: "Read them in context", sub: "words and sentences",  kind: "d", proves: ["d"] },
  { id: "say",    k: "发音", name: "Hear them and say them", sub: "sound and tone",     kinds: ["l", "p"], kind: "p", proves: ["p", "l"] },
  { id: "copy",   k: "抄写", name: "Write them out",       sub: "square by square",     copy: true }
];

/* What ticking a task requires: today's characters, and only today's. Kept
   deterministic so the "you already did this during another session" inference
   in renderDone compares like with like. */
function taskPool(task) {
  const got = learnedToday();
  if (task.copy) return got.filter(c => window.STROKE_DATA[c]);
  if (task.kind === "d") return got.filter(c => readingMaterial(CHAR_INDEX[c]));
  return got;
}

/* What the drill actually serves.

   Identical to taskPool everywhere except reading. A character learnt an hour
   ago usually has no sentence you can read yet — every other glyph in it is
   still unknown — so scoping reading strictly to today left the row locked on
   most days, which is the one task where the older characters are the point:
   reading in context means reading the context, and the context is everything
   you already know. So it leads with today's readable characters and tops up
   from the ones you can already read. */
const READ_ROUND = 8;

function taskRound(task) {
  const mine = taskPool(task);
  if (task.kind !== "d") return mine;
  const short = READ_ROUND - mine.length;
  if (short <= 0) return mine;
  const got = new Set(mine);
  const older = knownChars().filter(c => !got.has(c) && readingMaterial(CHAR_INDEX[c]));
  return [...mine, ...practicePool("r", short, older)];
}

const taskAvailable = task => taskRound(task).length > 0;

function startTodayDrill(task) {
  const pool = taskRound(task);
  if (!pool.length) return;
  /* alternate the kinds a task declares, so a pronunciation round actually
     plays characters aloud rather than only testing you on them silently */
  const kinds = task.kinds || [task.kind];
  session.queue = shuffle([...pool]).slice(0, 10)
    .map((c, i) => ({ t: "drill", c, kind: kinds[i % kinds.length] }));
  session.idx = 0;
  session.right = session.wrong = session.learned = session.reviewed = 0;
  session.combo = session.bestCombo = 0;
  session.got = {};
  session.times = []; session.quick = 0;
  session.questAtStart = menuProgress().known;
  session.practice = "read";              /* graded gently, like any practice */
  session.todo = task.id;
  session.active = true;
  $("#session").classList.add("on");
  document.body.style.overflow = "hidden";
  renderStep();
}

function renderToday() {
  const t = today();
  const due = dueCount();
  const got = learnedToday();
  const revd = reviewedToday();
  const newLeft = newLeftToday();
  /* Characters on both sides of this fraction. `newLeft` and `due` count
     characters, so measuring what's done in answers made the ring run ahead
     of the queue beside it — a character answered four times is one character
     off the list, not four. */
  const done = got.length + revd.length;
  const pct = (done + newLeft + due) ? done / (done + newLeft + due) : 1;
  const clear = newLeft === 0 && due === 0;
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const who = state.name ? `, ${state.name}` : "";
  const headline = clear ? `You're clear for today${who}.` : done > 0 ? `Keep going${who}.` : `Ready when you are${who}.`;
  const sub = clear
    ? (remainingNew() ? "Nothing is due. You can study ahead whenever you like."
       : "Every character in the library is in your review rotation.")
    : done > 0
      ? `${newLeft} new and ${due} review${due === 1 ? "" : "s"} still waiting.`
      : `${newLeft} new character${newLeft === 1 ? "" : "s"} and ${due} review${due === 1 ? "" : "s"} are queued. About ${Math.max(2, Math.round(newLeft * 1.2 + due * 0.3))} minutes.`;

  const R = 30, C = 2 * Math.PI * R, arc = C * Math.min(1, Math.max(0, clear ? 1 : pct));
  const ring = `<div class="hero-ring">
      <svg viewBox="0 0 74 74"><circle class="trk" cx="37" cy="37" r="${R}"/>
        ${arc > .5 ? `<circle class="val ${clear ? "done" : ""}" cx="37" cy="37" r="${R}" stroke-dasharray="${arc.toFixed(1)} ${C.toFixed(1)}"/>` : ""}</svg>
      <span class="hero-ring-lbl ${clear ? "is-done" : ""}">${clear ? "✓" : Math.round(pct * 100) + "%"}</span>
    </div>`;

  /* ---- the invitation ---- */
  const hero = `<div class="hero">
    <div class="hero-top">
      <div class="hero-head">
        <span class="hero-date">${esc(dateStr)}</span>
        <h1 class="hero-title">${esc(headline)}</h1>
        <p class="hero-sub">${esc(sub)}</p>
      </div>
      ${ring}
    </div>
    <div class="hero-cta">
      ${newLeft + due > 0
        ? `<button class="btn btn-seal btn-lg btn-block" id="startBtn">${done > 0 ? "Continue today's session" : "Start today's session"}</button>`
        : (remainingNew()
            ? `<button class="btn btn-ghost btn-lg btn-block" id="aheadBtn">Study ahead — ${Math.min(5, remainingNew())} more characters</button>`
            : "")}
      <div class="queue">
        <span class="qpill new">New <b>${newLeft}</b></span>
        <span class="qpill due">Due <b>${due}</b></span>
        <span class="qpill" title="${revd.length} character${revd.length === 1 ? "" : "s"} revised today, over ${t.rev} card${t.rev === 1 ? "" : "s"}">Revised today <b>${revd.length}</b></span>
      </div>
    </div>

    <div class="learned">
      <div class="learned-head">
        <span class="eyebrow">Learned today</span>
        <span class="dim" style="font-size:.76rem">${got.length} character${got.length === 1 ? "" : "s"}</span>
      </div>
      ${got.length
        ? `<div class="learned-strip">${got.map(c => {
            const ch = CHAR_INDEX[c];
            return `<button class="lc" data-c="${esc(c)}" title="${esc(ch.m)}">
              <span class="z">${esc(c)}</span><span class="p">${esc(ch.p)}</span></button>`;
          }).join("")}</div>`
        : `<div class="learned-empty"><span class="z">空</span>
            <span>Nothing yet today. Characters you learn will collect here.</span></div>`}
    </div>
  </div>`;

  /* ---- both decks, together ---- */
  const all = knownChars();
  const oneDeck = (id, deck, title, sub, tone, face, empty) => `
    <button class="deck deck-${tone} ${deck.length ? "" : "empty"}" id="${id}" ${deck.length ? "" : "disabled"}>
      <span class="deck-cards" aria-hidden="true">
        <span class="dc dc3"></span>
        <span class="dc dc2"></span>
        <span class="dc dc1 ${face && [...face].length > 1 ? "dc-word" : ""}">${deck.length ? esc(face) : "字"}</span>
      </span>
      <span class="deck-text">
        <b>${esc(title)}</b>
        <small>${esc(deck.length ? sub : (empty || "Learn a character to fill this deck"))}</small>
      </span>
      <span class="deck-go">→</span>
    </button>`;

  /* ---- word of the week: a postcard from further up the road ---- */
  const wk = wordOfWeek();
  const wotw = (() => {
    if (!wk || !wotwEntry(wk)) {
      return `<div class="sheet wotw wotw-empty">
        <div class="pr-head"><span class="eyebrow">Word of the week <span class="han">每周一词</span></span></div>
        <p class="note">Tell the app what you're interested in and it'll show you one real word a week from it —
          usually made of characters well past where you've got to.</p>
        <button class="btn btn-ghost btn-sm btn-block" id="wotwSetup">Pick your interests</button>
      </div>`;
    }
    const entry = wotwEntry(wk);
    if (!entry) return "";
    const cat = entry.src;
    const [word, pin, mean, note] = entry.word;
    const glyphs = [...word].filter(c => /[\u4e00-\u9fff]/.test(c));
    const known = glyphs.filter(isKnown).length;
    /* The meaning and the note stay hidden until asked for.

       Printing them straight away left nothing to do: you would read 音乐,
       start working it out from 音 and 乐, and find the answer already sitting
       underneath — and the notes make it worse, because a good note names the
       characters it is explaining. Forty of them do. So the card now shows the
       word and its pinyin, gives you the beat in which to have a go, and opens
       when you ask it to. It stays open for the rest of the week once you've
       seen it; a new word closes it again. */
    const open = state.wotwShown === wk.week;
    return `<div class="sheet wotw">
      <div class="pr-head">
        <span class="eyebrow">Word of the week <span class="han">每周一词</span></span>
        <span class="dim" style="font-size:.72rem">${esc(cat.icon)} ${esc(cat.name)}${
          entry.festival ? ` <span class="han">${esc(cat.zh)}</span>` : ""}</span>
      </div>
      ${entry.festival ? `<p class="wotw-when">It's ${esc(cat.name)} this week.</p>` : ""}
      <button class="wotw-word" id="wotwSay" title="Hear it">
        <span class="z">${renderZh(word)}</span>
        <span class="p">${esc(pin)}</span>
        ${open ? `<span class="m">${esc(mean)}</span>` : ""}
      </button>
      ${open
        ? `<p class="wotw-note">${esc(note)}</p>
           <p class="note dim">${known === glyphs.length
             ? "You can already read every character in it."
             : `${known} of ${glyphs.length} character${glyphs.length === 1 ? "" : "s"} are ones you know — the rest are ahead of you. Nothing to do here; it isn't a drill.`}</p>`
        : `<button class="btn btn-ghost btn-sm btn-block" id="wotwReveal">What does it mean?</button>
           <p class="note dim">Have a guess from the characters first — that's the whole point of it.</p>`}
    </div>`;
  })();

  /* Characters are only half of reading: 大 and 人 separately don't get you
     大人. This deck is every combination in the library whose characters are
     all already yours — it fills itself as you go, and the back names the
     parts, because seeing that 大人 is big + person is what makes it stick. */
  const combos = knownWords();
  const decks = `<div class="sheet decks">
    <span class="eyebrow">Flashcards</span>
    ${oneDeck("deckToday", got, "Today's characters",
      `${got.length} card${got.length === 1 ? "" : "s"} — tap to flip`, "today", got[got.length - 1])}
    ${oneDeck("deckAll", all, "All characters",
      `${all.length} card${all.length === 1 ? "" : "s"} you've learned`, "all", all[all.length - 1])}
    ${oneDeck("deckWords", combos, "Words you can read",
      `${combos.length} combination${combos.length === 1 ? "" : "s"} of characters you know`, "words",
      combos.length ? combos[0][0] : "", "Learn two characters that go together and this fills up")}
  </div>`;

  /* ---- the to-do list ----

     Learning the day's characters is the first step on this list, not a
     separate thing that happens above it, so it counts towards the total like
     every other row. A step that can't be done yet — no sentence in your
     library uses today's characters — is shown but left out of the fraction,
     rather than quietly shrinking the denominator so that a partly finished
     list reads as complete. */
  const learnDone = got.length > 0 && clear;
  const steps = [
    { id: "learn", el: "div", k: "学习", name: "Learn today's characters",
      sub: `${got.length} learned${due ? ` · ${due} to review` : ""}`,
      ready: true, done: learnDone, now: newLeft + due > 0, go: newLeft + due > 0 ? "→" : "" },
    ...TODAY_TASKS.map(task => {
      const n = taskRound(task).length;
      const ready = n > 0, done = didToday(task.id);
      return {
        id: task.id, el: "button", k: task.k, name: task.name,
        sub: ready
          ? (task.kind === "d" && taskPool(task).length < n
              ? `${task.sub} · ${n}, including ones you already read`
              : `${task.sub} · ${n}`)
          : task.kind === "d" ? "Nothing readable yet — learn a few more characters"
          : "Learn a character first",
        ready, done, now: false, go: ready ? (done ? "again" : "→") : "🔒"
      };
    })
  ];

  const rows = steps.map(st => {
    const attrs = `class="todo ${st.done ? "done" : ""} ${st.ready ? "" : "locked"} ${st.now ? "now" : ""}" data-todo="${st.id}"`;
    const inner = `<span class="todo-tick">${st.done ? "✓" : ""}</span>
      <span class="todo-k han">${esc(st.k)}</span>
      <span class="todo-body"><b>${esc(st.name)}</b><small>${esc(st.sub)}</small></span>
      <span class="todo-go">${st.go}</span>`;
    return st.el === "div" ? `<div ${attrs}>${inner}</div>`
                           : `<button ${attrs} ${st.ready ? "" : "disabled"}>${inner}</button>`;
  }).join("");

  const ready = steps.filter(st => st.ready);
  const stepsDone = ready.filter(st => st.done).length;
  const waiting = steps.length - ready.length;

  const todoBlock = `<div class="sheet todo-block">
    <div class="pr-head">
      <span class="eyebrow">Today's practice</span>
      <span class="dim" style="font-size:.76rem"
        title="${waiting ? `${waiting} more step${waiting === 1 ? "" : "s"} unlock as your library grows` : "Every step on today's list can be done now"}">
        ${stepsDone} of ${ready.length} done${waiting ? ` · ${waiting} locked` : ""}</span>
    </div>
    <div class="bar ${stepsDone === ready.length ? "gold" : ""}"><i style="width:${(stepsDone / ready.length * 100).toFixed(1)}%"></i></div>
    <div class="todo-list">${rows}</div>
  </div>`;

  /* ---- go deeper: the whole library, weakest first ----

     The old tile read "5 of 5 solid" against a ring that only moved on the
     third correct answer for a character, so a whole round of practice could
     change nothing on screen — and against a denominator of every character
     known, which writing can never reach because not every character has
     stroke data to write. Both are fixed here: each mode is measured against
     the characters it can actually draw on, the ring fills with every clean
     pass rather than only the third, and the bar underneath shows the shape
     of it — how much is solid, how much has been round once or twice, how
     much hasn't been touched. Going through the material again and getting it
     right is the thing that makes it stick, so it should be visible. */
  const exToday = extraToday(), exAll = extraTotal(), exBest = extraBestDay();
  /* "fully completed" = every character solid in every mode it can be asked in */
  let deepEligible = false;
  const deepAllSolid = Object.entries(PRACTICE).every(([id, cfg]) => {
    const chars = practiceChars(id);
    return chars.length > 0 && skillStanding(cfg.skill, chars).pct >= 1;
  });
  const deeper = `<section class="deeper">
    <div class="deeper-head">
      <span class="deeper-title">
        <span class="eyebrow">Go deeper <span class="han">加练</span></span>
        <p class="deeper-sub">Reps past today's list. None of it is required and none of it can be finished —
          that's what makes it the part that compounds.</p>
      </span>
      <span class="deeper-count" title="${exToday} rep${exToday === 1 ? "" : "s"} today · one stroke of 正 each, five to a mark">
        ${tallyRow(exToday)}
        <span class="deeper-n"><b>${exToday}</b> rep${exToday === 1 ? "" : "s"} today</span>
      </span>
    </div>
    <div class="pr-grid pr-grid-3">
      ${Object.entries(PRACTICE).map(([id, cfg]) => {
        const chars = practiceChars(id);
        deepEligible = deepEligible || chars.length > 0;
        const n = chars.length;
        const st = skillStanding(cfg.skill, chars);
        const RR = 15, CC = 2 * Math.PI * RR, aa = CC * Math.min(1, st.pct);
        const seg = (cls, count) => count
          ? `<i class="${cls}" style="flex:${count}" title="${count} character${count === 1 ? "" : "s"}"></i>` : "";
        const line = !chars.length
          ? (id === "write" ? "No character you know has stroke data yet" : "Learn a character first")
          : `${st.solid} of ${st.total} solid${st.partway ? ` · ${st.partway} part-way` : ""}`;
        return `<button class="pr pr-deep" data-practice="${id}" ${n ? "" : "disabled"}
          title="${chars.length
            ? `${st.passes} of ${st.goal} clean passes · solid means ${PASSES_FOR_SOLID} correct answers for a character in this mode`
            : "Nothing to practise in this mode yet"}">
          <span class="pr-ring">
            <svg viewBox="0 0 38 38"><circle class="trk" cx="19" cy="19" r="${RR}"/>
              ${aa > .5 ? `<circle class="val" cx="19" cy="19" r="${RR}" stroke-dasharray="${aa.toFixed(1)} ${CC.toFixed(1)}"/>` : ""}</svg>
            <span class="pr-ring-k han">${esc(cfg.k[0])}</span>
          </span>
          <span class="pr-deep-body">
            <b>${esc(cfg.name)}</b>
            <span class="pr-meter" aria-hidden="true">
              ${seg("s3", st.solid)}${seg("s2", st.buckets[2])}${seg("s1", st.buckets[1])}${seg("s0", st.untouched)}
            </span>
            <small>${esc(line)}</small>
          </span>
        </button>`;
      }).join("")}
    </div>
    <div class="deeper-foot">
      <span>${PASSES_FOR_SOLID} clean passes makes a character solid · shakiest first</span>
      <span class="deeper-life">${exAll
        ? `${exAll.toLocaleString()} rep${exAll === 1 ? "" : "s"} all told${exBest > 4 ? ` · best day ${exBest}` : ""}`
        : "Your first rep starts the count"}</span>
    </div>
  </section>`;

  /* ---- the side quest ---- */
  const mp = menuProgress();
  const pick2 = menuToday();
  const pch = pick2.c ? CHAR_INDEX[pick2.c] : null;
  const learnedIt = pick2.c ? isKnown(pick2.c) : true;

  const sideQuest = `<div class="sheet sq">
    <div class="sq-top">
      <span class="sq-icon">🍜</span>
      <span class="sq-name"><b>Read a Menu</b><span class="zh">看菜单</span></span>
      <span class="sq-frac">${mp.known}/${mp.total}</span>
    </div>
    <div class="bar ${mp.done ? "gold" : ""}"><i style="width:${(mp.pct * 100).toFixed(1)}%"></i></div>
    <p class="note">Menu level ${menuTier().n} of ${MENU_TIERS.length} — ${esc(menuTier().label.toLowerCase())}.${
      menuTier().n < MENU_TIERS.length
        ? ` ${MENU_TIERS[menuTier().n].at - mp.known} more character${MENU_TIERS[menuTier().n].at - mp.known === 1 ? "" : "s"} and it gets harder.`
        : " This is a menu you could be handed in Chengdu."}</p>

    ${pch ? `<div class="sq-target ${learnedIt ? "done" : ""}">
      <span class="sq-glyph">${esc(pch.c)}</span>
      <span class="sq-info">
        <span class="t">${learnedIt ? "Today's menu character — learned" : "Today's menu character"}</span>
        <span class="m">${learnedIt ? `${esc(pch.p)} · ${esc(pch.m)}` : "One character a day. Find it on the menu below."}</span>
        ${learnedIt ? `<span class="p">Next one tomorrow.</span>` : `<span class="p">${esc(pch.words[0][0])} · ${esc(pch.words[0][2])}</span>`}
      </span>
    </div>` : `<div class="sq-target done">
      <span class="sq-glyph">✓</span>
      <span class="sq-info"><span class="t">Quest complete</span>
      <span class="m">You can read every character on this menu.</span></span>
    </div>`}

    <div class="sq-actions">
      ${!learnedIt ? `<button class="btn btn-block" id="learnMenu">Learn ${esc(pch.c)}</button>` : ""}
      <button class="btn btn-ghost" id="openMenuFull">See the full menu</button>
    </div>

    <div class="menu-wrap">${renderMenuCard(learnedIt ? null : pick2.c)}</div>

    <div class="menu-legend">
      <span><b style="color:var(--ink)">黑</b> you can read</span>
      <span><b style="color:var(--ink-3)">灰</b> not yet</span>
      ${!learnedIt ? `<span><b style="color:var(--seal)">红</b> today's character</span>` : ""}
      <span class="dim">Hover any character for its meaning</span>
    </div>
  </div>`;

  $("#viewToday").innerHTML = `<div class="wrap">
    <div class="cols">
      <div class="section">${hero}${todoBlock}${deeper}${sideQuest}</div>
      <div class="col-side">${decks}${wotw}</div>
    </div>
  </div>`;

  /* both answers are already computed above; latch and fire */
  checkCheers(ready.length > 0 && stepsDone === ready.length, deepAllSolid);

  $("#wotwSetup")?.addEventListener("click", () => openProfile(false));
  $("#wotwSay")?.addEventListener("click", () => {
    const e = wotwEntry(wk);
    if (e) sayPhrase(e.word[0], true);
  });
  $("#wotwReveal")?.addEventListener("click", () => {
    state.wotwShown = wk.week;
    save();
    const e = wotwEntry(wk);
    if (e) sayPhrase(e.word[0], true);
    renderToday();
  });
  $("#startBtn")?.addEventListener("click", startSession);
  $("#aheadBtn")?.addEventListener("click", () => { studyAhead(5); startSession(); });
  $("#deckToday")?.addEventListener("click", () => openFlash(got, "Today's characters"));
  $("#deckAll")?.addEventListener("click", () => openFlash(all, "All characters"));
  $("#deckWords")?.addEventListener("click", () => openFlash(combos, "Words you can read"));
  $("#openMenuFull")?.addEventListener("click", () => openQuest("menu"));
  $("#learnMenu")?.addEventListener("click", () => openMenuLesson(pick2.c));
  $$("#viewToday .lc").forEach(b => b.onclick = () => openChar(b.dataset.c));
  $$("#viewToday [data-practice]").forEach(b => b.onclick = () => startPractice(b.dataset.practice));
  $$("#viewToday [data-todo]").forEach(b => b.onclick = () => {
    const id = b.dataset.todo;
    if (id === "learn") return startSession();
    const task = TODAY_TASKS.find(x => x.id === id);
    if (!task) return;
    if (task.copy) { openNotebook(); return; }
    startTodayDrill(task);
  });
}

/* The streak calendar. Each day is a practice square that fills with ink. */
function calendar(days) {
  const cells = [];
  const start = new Date(); start.setDate(start.getDate() - days + 1);
  for (let i = 0, pad = (start.getDay() + 6) % 7; i < pad; i++) cells.push(`<div class="day blank"></div>`);
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dayKey(d), r = state.days[k], n = dayReps(r);
    const lvl = n === 0 ? "" : n < 5 ? "f1" : n < 12 ? "f2" : n < 25 ? "f3" : "f4";
    cells.push(`<div class="day ${lvl} ${k === dayKey() ? "today" : ""}" title="${k}: ${n} card${n === 1 ? "" : "s"}"></div>`);
  }
  return `<div class="cal">${cells.join("")}</div>`;
}

/* ---------- library ---------- */

let libFilter = "all", libSearch = "";

/* Which tiers the learner has opened or shut by hand this session. */
const libOpenTiers = {};

/* What is actually standing between you and this tier.

   tierNeeds() returns the *first* unfinished tier, which is the right gate but
   the wrong sentence: telling someone on tier 1 that ninety more characters
   opens Fluent is a promise the third door won't keep. When the blocker isn't
   the tier immediately before this one, say so. */
function tierGateNote(t) {
  const needs = tierNeeds(t);
  if (!needs) return `Open to you — ${tierPlanned(t)} characters, not written yet.`;
  const justBefore = TIERS[t.n - 2];
  const line = `Learn ${needs.more} more character${needs.more === 1 ? "" : "s"} from <b>${esc(needs.tier.name)} ${esc(needs.tier.zh)}</b>`;
  return needs.tier.n === justBefore.n
    ? `${line} and this opens.`
    : `${line} to open <b>${esc(TIERS[needs.tier.n].name)}</b>. This one comes after <b>${esc(justBefore.name)} ${esc(justBefore.zh)}</b>.`;
}

function renderLibrary() {
  const chars = HQ.filter(ch => {
    const st = strength(ch.c);
    if (libFilter === "due" && st !== "due") return false;
    if (libFilter === "learning" && st !== "learning") return false;
    if (libFilter === "strong" && st !== "strong") return false;
    if (libFilter === "new" && isKnown(ch.c)) return false;
    if (libFilter[0] === "s" && libFilter.length === 2 && ch.stage !== +libFilter[1]) return false;
    if (libSearch && !(matches(ch, libSearch)
        || ch.words.some(w => w[0].includes(libSearch) || bare(w[2]).includes(bare(libSearch))))) return false;
    return true;
  });

  const filters = [["all","All"],["due","Due"],["learning","Learning"],["strong","Strong"],["new","Not started"],
    ...STAGES.map(s => ["s" + s.n, `${s.icon} ${s.name}`])];

  /* Grouped by tier rather than laid out in one sheet of 348. A beginner
     scrolling past three hundred characters they can't start on is the
     overwhelm this is meant to remove; a locked tier collapses to a single
     card, and the tier you are actually in is the one left open. */
  const ceiling = unlockedCeiling();
  const openTier = TIERS.find(t => tierUnlocked(t) && tierProgress(t).known < tierProgress(t).built) || TIERS[0];
  const tile = ch => `<button class="gc ${strength(ch.c)} ${isLocked(ch.c) ? "gc-locked" : ""}" data-c="${esc(ch.c)}">
      <span class="z">${esc(ch.c)}</span><span class="p">${esc(ch.p)}</span></button>`;

  const sections = TIERS.map(t => {
    const mine = chars.filter(ch => ch.i >= tierFrom(t) && ch.i < t.to);
    const prog = tierProgress(t);
    const unlocked = tierUnlocked(t);
    const unwritten = prog.planned - prog.built;

    if (!unlocked) {
      return `<div class="tier tier-shut">
        <div class="tier-head">
          <span class="tier-icon">${esc(t.icon)}</span>
          <span class="tier-name"><b>${esc(t.name)} <span class="han">${esc(t.zh)}</span></b>
            <small>${esc(t.blurb)}</small></span>
          <span class="tier-lock">🔒 to ${t.to}</span>
        </div>
        <p class="note">${tierGateNote(t)}</p>
      </div>`;
    }
    if (!prog.built) {
      return `<div class="tier tier-shut">
        <div class="tier-head">
          <span class="tier-icon">${esc(t.icon)}</span>
          <span class="tier-name"><b>${esc(t.name)} <span class="han">${esc(t.zh)}</span></b>
            <small>${esc(t.blurb)}</small></span>
          <span class="tier-lock">to ${t.to}</span>
        </div>
        <p class="note">Open to you, but not written yet — the library stops at ${HQ.length} for now.</p>
      </div>`;
    }
    const isOpen = libOpenTiers[t.n] !== undefined ? libOpenTiers[t.n]
                 : (t.n === openTier.n || !!libSearch || libFilter !== "all");
    return `<div class="tier ${isOpen ? "on" : ""}">
      <button class="tier-head tier-toggle" data-tier="${t.n}" aria-expanded="${isOpen}">
        <span class="tier-icon">${esc(t.icon)}</span>
        <span class="tier-name"><b>${esc(t.name)} <span class="han">${esc(t.zh)}</span></b>
          <small>${prog.known} of ${prog.built} learned${unwritten > 0 ? ` · ${unwritten} more to come` : ""}</small></span>
        <span class="tier-bar"><i style="width:${(prog.pct * 100).toFixed(1)}%"></i></span>
        <span class="tier-caret">${isOpen ? "▾" : "▸"}</span>
      </button>
      ${isOpen ? (mine.length
        ? `<div class="grid-chars">${mine.map(tile).join("")}</div>`
        : `<p class="note" style="padding:0 .2rem .6rem">Nothing here matches that filter.</p>`) : ""}
    </div>`;
  }).join("");

  $("#viewLibrary").innerHTML = `<div class="wrap">
    <div class="today-head">
      <h1>The library</h1>
      <p class="note">${HQ.length} characters in three tiers, taught in the order that makes each one easier
        than the last. ${ceiling < HQ.length
          ? `You've opened the first ${ceiling} — the rest stay shut until the tier before them is ${Math.round(TIER_UNLOCK * 100)}% learned, so there's no way to get ahead of yourself by accident.`
          : "Every tier is open to you."}</p>
    </div>
    <input class="search" id="libQ" type="search" placeholder="Search a character, pinyin or meaning…" value="${esc(libSearch)}">
    <div class="filters">${filters.map(([k, l]) =>
      `<button class="filt ${libFilter === k ? "on" : ""}" data-f="${k}">${esc(l)}</button>`).join("")}</div>
    ${chars.length ? sections
      : `<div class="empty"><span class="z">空</span><p>Nothing here yet. Try another filter.</p></div>`}
    <div class="legend">
      <span><i style="background:var(--seal)"></i>Due now</span>
      <span><i style="background:var(--gold)"></i>Learning</span>
      <span><i style="background:var(--jade)"></i>Strong</span>
      <span><i style="background:var(--rule)"></i>Not started</span>
    </div>
  </div>`;

  $$("#viewLibrary .filt").forEach(b => b.onclick = () => { libFilter = b.dataset.f; renderLibrary(); });
  $$("#viewLibrary .tier-toggle").forEach(b => b.onclick = () => {
    const n = +b.dataset.tier;
    const cur = b.getAttribute("aria-expanded") === "true";
    libOpenTiers[n] = !cur;
    renderLibrary();
  });
  $$("#viewLibrary .gc").forEach(b => b.onclick = () => openChar(b.dataset.c));
  const qEl = $("#libQ");
  qEl.oninput = () => {
    libSearch = qEl.value.trim();
    const pos = qEl.selectionStart;
    renderLibrary();
    const n = $("#libQ"); n.focus(); n.setSelectionRange(pos, pos);
  };
}

/* ---------- radicals ---------- */

function renderRadicals() {
  const documented = Object.keys(RADICALS)
    .filter(k => FAMILIES[k] && FAMILIES[k].length)
    .sort((a, b) => FAMILIES[b].length - FAMILIES[a].length);
  const others = Object.entries(FAMILIES)
    .filter(([k, v]) => v.length > 1 && !RADICALS[k])
    .sort((a, b) => b[1].length - a[1].length);

  $("#viewRadicals").innerHTML = `<div class="wrap">
    <div class="today-head">
      <h1>Characters come in families</h1>
      <p class="note">Chinese isn't a few thousand unrelated symbols. Almost every character is built from a small set of parts called radicals: one part hints at the meaning, another at the sound. Learn a radical and you get a discount on everything containing it.</p>
    </div>
    <div class="rad-grid">
      ${documented.map(k => {
        const r = RADICALS[k], kids = FAMILIES[k];
        const known = kids.filter(isKnown).length;
        return `<div class="sheet rad">
          <div class="rad-top">
            <span class="rad-glyph">${esc(r.form)}</span>
            <span class="rad-id">
              <b>${esc(r.name)}</b>
              <small>${esc(r.pin)} · ${r.strokes} strokes${r.variants ? ` · written ${esc(r.variants)}` : ""}</small>
            </span>
            <span class="quest-frac">${known}/${kids.length}</span>
          </div>
          <p class="rad-does">${esc(r.does)}</p>
          <div class="rad-kids">${kids.map(c => `<button class="rad-kid ${isKnown(c) ? "known" : "locked"}" data-c="${esc(c)}">
            <span class="z">${esc(c)}</span><span>${isKnown(c) ? esc(CHAR_INDEX[c].p) : "?"}</span></button>`).join("")}</div>
        </div>`;
      }).join("")}
    </div>

    ${others.length ? `<div class="sec-head" style="margin:1.4rem 0 .7rem">
      <h2>Other shared parts</h2>
      <span class="dim" style="font-size:.78rem">${others.length} groups</span>
    </div>
    <div class="section">
      ${others.map(([root, kids]) => {
        const [p, m] = gloss(root);
        return `<div class="sheet tree">
          <div class="tree-root">
            <span class="z han">${esc(root)}</span>
            <span class="m"><b>${esc(p)}</b><small>${esc(m)}</small></span>
            <span class="n">${kids.filter(isKnown).length}/${kids.length}</span>
          </div>
          <div class="branches">${kids.map(c => `<button class="branch ${isKnown(c) ? "known" : "locked"}" data-c="${esc(c)}">
            <span class="z">${esc(c)}</span><span>${isKnown(c) ? esc(CHAR_INDEX[c].p) : "?"}</span></button>`).join("")}</div>
        </div>`;
      }).join("")}
    </div>` : ""}
  </div>`;

  $$("#viewRadicals [data-c]").forEach(b => b.onclick = () => openChar(b.dataset.c));
}

/* ---------- record ---------- */

function renderRecord() {
  const known = Object.keys(state.chars).length;
  const strong = Object.keys(state.chars).filter(c => strength(c) === "strong").length;
  const totalCards = Object.values(state.days).reduce((a, d) => a + d.new + d.rev, 0);
  const activeDays = Object.keys(state.days).length;
  const skills = [["认","Recognise","r"],["音","Pronounce","p"],["写","Recall the form","c"],["笔","Write from memory","w"]];
  const cur = currentStage();

  $("#viewRecord").innerHTML = `<div class="wrap">
    <div class="today-head">
      <h1>Your record</h1>
      <p class="note">Recognising a character and being able to write it are different skills. Here's where each stands.</p>
    </div>
    <div class="cols">
      <div class="section">
        <div class="stats">
          <div class="sheet stat"><b>${known}</b><small>Characters</small></div>
          <div class="sheet stat"><b>${liveStreak()}</b><small>Day streak</small></div>
          <div class="sheet stat"><b>${totalCards}</b><small>Cards done</small></div>
        </div>

        <div class="sheet" style="padding:1rem">
          <div class="stack" style="gap:.6rem">
            <span class="eyebrow">Every day since you started</span>
            <div class="cal-wrap">${calendar(182)}</div>
            <div class="cal-legend">Less <span class="day"></span><span class="day f1"></span><span class="day f2"></span><span class="day f3"></span><span class="day f4"></span> More</div>
            <p class="note">${activeDays} day${activeDays === 1 ? "" : "s"} studied · best run ${state.streak.best}</p>
          </div>
        </div>

        <div class="sec-head" style="margin-top:.4rem"><h2>The climb</h2>
          <span class="dim" style="font-size:.78rem">${known} of ${HQ.length} learned</span></div>
        ${TIERS.map(t => {
          const prog = tierProgress(t);
          const unlocked = tierUnlocked(t);
          /* A stage belongs to whichever tier its midpoint falls in. The two
             were never going to line up — tiers are literacy milestones, stages
             are a teaching order — and stage 7 does straddle 200. Listing a
             straddling stage under both tiers reads as a bug rather than as
             precision, so each one is filed once, where most of it lives. */
          const inTier = STAGES.filter(st => {
            const from = st.n === 1 ? 0 : STAGES[st.n - 2].end;
            return tierOf((from + st.end - 1) >> 1).n === t.n;
          });
          return `<div class="sheet tier-block ${unlocked ? "" : "shut"}">
            <div class="tier-head">
              <span class="tier-icon">${esc(t.icon)}</span>
              <span class="tier-name"><b>${esc(t.name)} <span class="han">${esc(t.zh)}</span></b>
                <small>${esc(t.blurb)}</small></span>
              <span class="tier-lock">${unlocked ? `${prog.known}/${prog.built || prog.planned}` : `🔒 to ${t.to}`}</span>
            </div>
            ${unlocked && prog.built ? `<div class="bar ${prog.pct >= 1 ? "gold" : ""}"><i style="width:${(prog.pct * 100).toFixed(1)}%"></i></div>
            <div class="ladder">
              ${inTier.map(s => {
                const p = stageProgress(s.n);
                return `<div class="rung ${p.known > 0 ? "reached" : ""} ${s.n === cur.n ? "current" : ""}">
                  <span class="rung-icon">${esc(s.icon)}</span>
                  <span class="rung-body">
                    <b>${esc(s.name)} <span class="han dim" style="font-weight:400;font-size:.78rem">${esc(s.zh)}</span>${s.core ? "" : ` <span class="dim" style="font-weight:400;font-size:.72rem">· topic pack</span>`}</b>
                    <small>${esc(s.blurb)}</small>
                  </span>
                  <span class="rung-n">${p.known}/${p.total}</span>
                </div>`;
              }).join("")}
            </div>` : `<p class="note">${tierGateNote(t)}</p>`}
          </div>`;
        }).join("")}

        ${(() => {
          const stuck = leeches();
          if (!stuck.length) return "";
          return `<div class="sheet" style="padding:1rem">
            <div class="stack" style="gap:.6rem">
              <span class="eyebrow">Sticking points</span>
              <p class="note">You've missed these more often than you've got them. Repeating the same drill won't shift them —
                open one and look at where it comes from and what it's built out of.</p>
              <div class="leech-list">${stuck.slice(0, 18).map(c => `<button class="leech" data-c="${esc(c)}">
                <span class="z">${esc(c)}</span><span class="n">${rec(c).wrong}</span> missed</button>`).join("")}</div>
            </div>
          </div>`;
        })()}

        <p class="note">The library stops at ${HQ.length} characters for now. The tiers above are the road out
          to 1,000 — the point where roughly nine characters in ten on an ordinary page are ones you know.</p>
        <p class="note dim" style="font-size:.7rem">Hanzi Quest ${esc(appVersion())} · ${esc(appDate())}</p>
      </div>

      <div class="col-side">
        <div class="sheet" style="padding:1rem">
          <div class="stack" style="gap:.8rem">
            <span class="eyebrow">Skills</span>
            <div class="skills">
              ${skills.map(([k, label, key]) => {
                /* Measured against the characters you know, not the whole
                   library — a bar that reads 3% when every character you've
                   met is solid is telling you about the syllabus, not about
                   you. Handwriting is measured against the ones that have
                   stroke data, which are the only ones it can ask for. */
                const st = skillStanding(key, key === "w" ? practiceChars("write") : knownChars());
                const seg = (cls, count) => count
                  ? `<i class="${cls}" style="flex:${count}" title="${count} character${count === 1 ? "" : "s"}"></i>` : "";
                return `<div class="skill" title="${st.passes} of ${st.goal} clean passes across ${st.total} character${st.total === 1 ? "" : "s"}">
                  <span class="k">${esc(k)}</span>
                  <span style="display:flex;flex-direction:column;gap:.3rem;min-width:0">
                    <span style="font-size:.8rem">${esc(label)}</span>
                    <span class="pr-meter">${seg("s3", st.solid)}${seg("s2", st.buckets[2])}${seg("s1", st.buckets[1])}${seg("s0", st.untouched)}</span>
                    <span style="font-size:.7rem;color:var(--ink-3)">${st.solid} of ${st.total} solid${st.partway ? ` · ${st.partway} part-way` : ""}</span>
                  </span>
                  <span class="v">${Math.round(st.pct * 100)}%</span>
                </div>`;
              }).join("")}
            </div>
            <p class="note">A character is solid in a skill after ${PASSES_FOR_SOLID} clean answers in that mode, and the bar fills with each one —
              going back over the same characters and getting them right again is what the percentage is measuring.
              Strong overall: ${strong} of ${known}.</p>
          </div>
        </div>

      </div>
    </div>
  </div>`;

  $$("#viewRecord .leech").forEach(b => b.onclick = () => openChar(b.dataset.c));
}

/* ============================================================
   设置 — settings, in a sheet of their own

   These used to be buried at the bottom of the Record tab, where nobody
   would think to look for them. The gear in the top bar reaches them from
   anywhere instead.
   ============================================================ */

function openSettings() {
  openSheet(`<span class="han">设置</span> Settings`, `<div class="wrap"><div class="section">
    <div class="sheet" style="padding:1rem">
      <div class="stack" style="gap:.2rem">
        <span class="eyebrow" style="margin-bottom:.5rem">Studying</span>
        <div class="settings-row">
          <label>New characters a day<small>More isn't better — reviews compound.</small></label>
          <span class="stepper" id="goalStep">
            <button data-d="-1" aria-label="Fewer">−</button>
            <span>${state.goalNew}</span>
            <button data-d="1" aria-label="More">+</button>
          </span>
        </div>
        <div class="settings-row">
          <label>Question timer<small>A bar that drains while you think. Running out costs nothing.</small></label>
          <button class="btn btn-ghost btn-sm" id="timerTgl">${state.timer ? "On" : "Off"}</button>
        </div>
        <div class="settings-row">
          <label>Include writing drills<small>Trace from memory once a character is solid.</small></label>
          <button class="btn btn-ghost btn-sm" id="writeTgl">${state.writeDrills ? "On" : "Off"}</button>
        </div>
        <div class="settings-row">
          <label>Start the trackpad automatically<small>${padSupported()
            ? "Every writing box arms itself for trackpad writing, instead of waiting for the 触控 button or <kbd class=\"opt-n\">T</kbd>. Esc drops out of it. Some browsers only allow this straight after a click — where one refuses, the button is still there."
            : "This browser has no pointer lock, so trackpad writing isn't available here."}</small></label>
          <button class="btn btn-ghost btn-sm" id="padTgl" ${padSupported() ? "" : "disabled"}>${state.padAuto ? "On" : "Off"}</button>
        </div>
      </div>
    </div>

    <div class="sheet" style="padding:1rem">
      <div class="stack" style="gap:.2rem">
        <span class="eyebrow" style="margin-bottom:.5rem">Sound</span>
        <div class="settings-row">
          <label>Speak characters aloud<small>${clipCount()
            ? `Characters play one of ${clipCount()} recorded clips.`
            : "No recorded clips are loaded — see below."}</small></label>
          <button class="btn btn-ghost btn-sm" id="audioTgl">${state.audio ? "On" : "Off"}</button>
        </div>
        ${clipCount() ? "" : `<div class="settings-row stacked">
          <label>Recorded clips are missing
            <small><code>js/audio.js</code> didn't load, so characters fall back to your system voice —
              which many browsers don't have a Chinese one for. Regenerate it on a Mac with
              <code>node tools/make-audio.mjs</code> and reload.</small></label>
        </div>`}
        <div class="settings-row stacked">
          <label>Voice for words and sentences
            <small>Longer phrases use your system voice — and some voices are listed but silent, so test a few.</small></label>
          <span class="voice-pick">
            <select id="voiceSel">${zhVoices.length
              ? zhVoices.map((v, i) => `<option value="${esc(v.name)}" ${i === voiceIdx ? "selected" : ""}>${esc(v.name)}</option>`).join("")
              : `<option value="">no Chinese voice found</option>`}</select>
            <button class="btn btn-ghost btn-sm" id="voiceTest" ${zhVoices.length ? "" : "disabled"}>Test</button>
          </span>
        </div>
        <div class="settings-row" id="voiceMsgRow" hidden>
          <small class="note" id="voiceMsg"></small>
        </div>
      </div>
    </div>

    <div class="sheet" style="padding:1rem">
      <div class="stack" style="gap:.2rem">
        <span class="eyebrow" style="margin-bottom:.5rem">Your data</span>
        <div class="settings-row">
          <label>Save your progress to a file<small>Writes one .json file — progress, streak and diary — that you can load back in later.
            ${state.lastBackup ? `Last saved ${esc(new Date(state.lastBackup).toLocaleDateString())}.` : "You haven't saved a copy yet."}</small></label>
          <button class="btn btn-ghost btn-sm" id="backupBtn">Save</button>
        </div>
        <div class="settings-row">
          <label>About you<small>${state.name ? `Called ${esc(state.name)}. ` : ""}${(state.interests || []).length
            ? `${state.interests.length} interest${state.interests.length === 1 ? "" : "s"} picked — they set the word of the week.`
            : "Set a name and pick interests for the word of the week."}</small></label>
          <button class="btn btn-ghost btn-sm" id="profileBtn">Edit</button>
        </div>
        <div class="settings-row">
          <label>Find my level<small>${state.placed && state.placed.known
            ? `Credited ${state.placed.known} character${state.placed.known === 1 ? "" : "s"} on ${esc(new Date(state.placed.on).toLocaleDateString())}. Taking it again only ever adds — it never removes progress.`
            : "Walks the curriculum in order and marks what you already read as known, without putting it in your review queue."}</small></label>
          <button class="btn btn-ghost btn-sm" id="placeBtn">${state.placed ? "Retake" : "Start"}</button>
        </div>
        <div class="settings-row">
          <label>Show the tour again<small>The short walkthrough from your first visit.</small></label>
          <button class="btn btn-ghost btn-sm" id="tourBtn">Replay</button>
        </div>
        <div class="settings-row">
          <label>Reset everything<small>Clears your streak and all progress.</small></label>
          <button class="btn btn-ghost btn-sm" id="resetBtn">Reset</button>
        </div>
        <div class="settings-row">
          <label>Version<small>If this doesn't match what you just published, you're looking at a cached copy —
            reload with <kbd class="opt-n">⇧</kbd> held, or <kbd class="opt-n">⌘⇧R</kbd>.</small></label>
          <span class="ver-tag" id="verTag">${esc(appVersion())} <span class="dim">· ${esc(appDate())}</span></span>
        </div>
      </div>
    </div>
  </div></div>`);

  $$("#goalStep button").forEach(b => b.onclick = () => {
    state.goalNew = Math.max(GOAL_MIN, Math.min(GOAL_MAX, state.goalNew + (+b.dataset.d)));
    save(); openSettings();
  });
  $("#timerTgl").onclick = () => { state.timer = !state.timer; save(); openSettings(); };
  $("#writeTgl").onclick = () => { state.writeDrills = !state.writeDrills; save(); openSettings(); };
  $("#padTgl").onclick = () => { state.padAuto = !state.padAuto; save(); openSettings(); };
  $("#audioTgl").onclick = () => { state.audio = !state.audio; save(); openSettings(); };
  $("#backupBtn").onclick = openBackup;
  $("#profileBtn").onclick = () => openProfile(false);
  $("#placeBtn").onclick = () => { closeSheet(); setTimeout(openPlacement, 250); };
  $("#tourBtn").onclick = () => { closeSheet(); setTimeout(() => startTour(true), 250); };
  $("#resetBtn").onclick = async () => {
    const pages = (await diaryAll()).length;
    if (!await askConfirm({
      k: "清除",
      title: "Reset everything?",
      body: `This clears ${Object.keys(state.chars).length} character${Object.keys(state.chars).length === 1 ? "" : "s"}, `
          + `your ${liveStreak()}-day streak, every day on the calendar`
          + `${pages ? `, and all ${pages} page${pages === 1 ? "" : "s"} of your practice diary` : ""}. `
          + `It can't be undone${state.lastBackup ? " — only a saved file can bring it back" : ", and you have no saved copy"}.`,
      yes: "Reset everything", no: "Keep my progress", danger: true
    })) return;
    resetProgress();
    await diaryClear();                  /* the diary is IndexedDB, not localStorage */
    wpReset();
    closeSheet();
    startTour(true);                     /* a blank app with no explanation is just blank */
  };
  $("#voiceSel")?.addEventListener("change", e => {
    const i = zhVoices.findIndex(v => v.name === e.target.value);
    if (i < 0) return;
    voiceIdx = i; zhVoice = zhVoices[i];
    state.voice = zhVoice.name; save();
  });
  $("#voiceTest")?.addEventListener("click", () => {
    const row = $("#voiceMsgRow"), msg = $("#voiceMsg");
    if (!zhVoice) return;
    const v = zhVoice, name = v.name;      /* pin it, so the verdict names the right voice */
    row.hidden = false;
    msg.textContent = `Testing ${name}…`;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("你好");
      u.lang = "zh-CN"; u.voice = v; u.rate = 0.8;
      let began = false;
      u.onstart = () => { began = true; msg.textContent = `${name} is speaking — if you hear nothing, check your volume and output device.`; };
      u.onerror = e => { msg.textContent = `${name} failed: ${e.error}. Try another.`; };
      liveUtterance = u;
      speechSynthesis.speak(u);
      setTimeout(() => {
        if (!began) msg.textContent = `${name} never started — your system lists it but it has no voice data. Pick a different one.`;
      }, 1200);
    } catch (e) { msg.textContent = "This browser refused to speak at all."; }
  });
}

/* ============================================================
   Backup

   Progress lives in localStorage and the diary in IndexedDB. Clear your site
   data and months are gone, so this writes both out as one JSON file. The
   artifact sandbox blocks downloads a page starts for itself, so we ask the
   host to save it where that's available, and fall back to plain copyable
   text where it isn't.
   ============================================================ */

async function buildBackup() {
  return {
    app: "hanzi-quest", version: 1, exported: new Date().toISOString(),
    characters: HQ.length,
    progress: JSON.parse(JSON.stringify(state)),
    diary: await diaryAll()
  };
}

/* Three ways out, in order of how well each works where it works.

   On an ordinary page — a clone, GitHub Pages — a Blob and a click on a
   download link puts the file straight in Downloads, which is what anyone
   asking to "save my progress" actually means. Inside the artifact sandbox
   that is blocked outright and silently, so there we ask the host to save it.
   If neither lands, the text itself is still worth having. */
function blobDownload(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch { return false; }
}

async function doExport() {
  const data = await buildBackup();
  const text = JSON.stringify(data);
  const name = `hanzi-quest-${dayKey()}.json`;
  const sandboxed = !!window.claude?.use;

  const remember = how => { state.lastBackup = Date.now(); save(); return { saved: true, name, how }; };

  if (sandboxed) {
    const saver = await claude.use("downloads").catch(() => null);
    if (saver) {
      try { await saver.save({ filename: name, data: text }); return remember("host"); }
      catch { /* declined or unavailable — fall through */ }
    }
  } else if (blobDownload(name, text)) {
    return remember("download");
  }
  return { saved: false, name, text };
}

/* Nagging is rude, but losing six weeks to a cleared cache is worse. The dot
   appears once there is something worth losing and no copy of it. */
function backupStale() {
  const known = Object.keys(state.chars).length;
  if (known < 5) return false;
  if (!state.lastBackup) return true;
  return (Date.now() - state.lastBackup) > 14 * 864e5;
}

function openBackup() {
  const last = state.lastBackup
    ? new Date(state.lastBackup).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : null;
  openSheet(`<span class="han">备份</span> Save your progress`, `<div class="wrap"><div class="section">
    <div class="today-head">
      <h1>Save your progress to a file</h1>
      <p class="note">Everything you've done lives in this browser and nowhere else: ${Object.keys(state.chars).length} character${Object.keys(state.chars).length === 1 ? "" : "s"},
        ${daysStudied()} day${daysStudied() === 1 ? "" : "s"} studied, your streak, and every page in your practice diary.
        Clearing your browser data, switching browsers or using a private window loses all of it.
        Saving writes one <code>.json</code> file you can keep anywhere and load back in below.</p>
    </div>
    <div class="sheet block">
      <div class="block-head"><span class="k">导出</span><span class="t">Save a copy</span>
        <span class="dim" style="margin-left:auto;font-size:.74rem">${last ? `last saved ${esc(last)}` : "never saved"}</span></div>
      <button class="btn btn-block" id="bkExport">Save progress to a file</button>
      <div id="bkOut"></div>
    </div>
    <div class="sheet block">
      <div class="block-head"><span class="k">导入</span><span class="t">Restore from a backup</span></div>
      <p class="note">This replaces everything currently on this device.</p>
      <input type="file" id="bkFile" accept="application/json,.json" class="search">
      <textarea id="bkPaste" class="search" rows="3" placeholder="…or paste the contents of a backup file here"></textarea>
      <button class="btn btn-ghost btn-block" id="bkImport">Restore</button>
      <div id="bkMsg" class="note"></div>
    </div>
  </div></div>`);

  $("#bkExport").onclick = async () => {
    const r = await doExport();
    $("#bkOut").innerHTML = r.saved
      ? `<p class="note">Saved as <b>${esc(r.name)}</b>${r.how === "download" ? " — check your Downloads folder" : ""}.
         Keep it somewhere that isn't this browser.</p>`
      : `<p class="note">Your browser wouldn't let the page save a file, so here it is to copy — select all and paste it somewhere safe.</p>
         <textarea class="search" rows="5" id="bkText"></textarea>`;
    const ta = $("#bkText");
    if (ta) { ta.value = r.text; ta.focus(); ta.select(); }
    renderAll();                            /* the top-bar dot can stand down */
  };

  const restore = async raw => {
    const msg = $("#bkMsg");
    try {
      const data = JSON.parse(raw);
      if (data.app !== "hanzi-quest" || !data.progress) {
        const e = new Error("wrong app");
        e.wanted = "That doesn't look like a Hanzi Quest backup.";
        throw e;
      }
      if (!await askConfirm({
        k: "恢复",
        title: "Restore from this backup?",
        body: `It holds ${Object.keys(data.progress.chars || {}).length} character`
            + `${Object.keys(data.progress.chars || {}).length === 1 ? "" : "s"}`
            + `${data.exported ? `, saved ${new Date(data.exported).toLocaleDateString()}` : ""}. `
            + "Everything currently on this device is replaced.",
        yes: "Restore", no: "Cancel", danger: true
      })) return;
      state = Object.assign(blank(), data.progress);
      save();
      if (Array.isArray(data.diary)) for (const page of data.diary) await diaryPut(page);
      msg.textContent = "Restored. Reloading…";
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      msg.textContent = err.wanted || "That isn't a readable backup file — it should be the JSON this page exported.";
    }
  };
  $("#bkFile").onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => restore(String(fr.result));
    fr.readAsText(f);
  };
  $("#bkImport").onclick = () => {
    const v = $("#bkPaste").value.trim();
    if (v) restore(v); else $("#bkMsg").textContent = "Choose a file or paste a backup first.";
  };
}

/* ============================================================
   Keyboard

   This is a daily habit done at a laptop; reaching for the mouse on every
   card is the main friction in a session. 1-4 answers, space or enter moves
   on. Space is off limits while the trackpad has it for inking.
   ============================================================ */

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && t.matches && t.matches("input, textarea, select")) return;

  /* a question is open: Enter takes whichever button has focus (Cancel, by
     default) and nothing underneath gets to act on the keystroke */
  if (asking()) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); document.activeElement?.click?.(); }
    return;
  }

  /* A sprint. Digits answer, R replays, 0 hands the question in blank. The
     typing style runs its own keydown on the input, and the guard above has
     already bowed out of anything typed into one. */
  if (sp.active) {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (e.key === "0") { $("#spSkip")?.click(); return; }
      $$("#spInner .sp-opt, #spInner .sp-cand")[+e.key - 1]?.click();
      return;
    }
    if (e.key.toLowerCase() === "r") { e.preventDefault(); $("#spEar")?.click(); }
    return;
  }

  /* a marked sheet, still on screen: space closes it like any other verdict */
  if ($("#sprintRun").classList.contains("on")) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("#spAgain")?.click(); }
    return;
  }

  /* the notebook: T for the trackpad */
  if ($("#notebook").classList.contains("on")) {
    if (e.key.toLowerCase() === "t") { e.preventDefault(); nbPad(); }
    return;
  }

  /* flashcards */
  if ($("#flash").classList.contains("on")) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("#card3d")?.click(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); flashStep(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); flashStep(-1); }
    return;
  }

  /* the placement quiz: 1-4 to answer, space when you don't know it */
  if ($("#place").classList.contains("on")) {
    if (place.done) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("#placeGo")?.click(); }
      return;
    }
    if (place.locked) { e.preventDefault(); return; }   /* mid-reveal: swallow it */
    if (e.key === " ") { e.preventDefault(); $("#placeDunno")?.click(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const opts = $$("#placeBody .place-opt:not(:disabled)");
      const hit = opts[+e.key - 1];
      if (hit) { e.preventDefault(); hit.click(); }
    }
    return;
  }

  if (!session.active) return;

  /* The pad owns space, for inking — but not the mode keys.

     This used to bail out entirely while the trackpad was live, so once you
     were writing there was no way back out with the keyboard: T couldn't turn
     it off and nothing could show you the strokes. Stepping between writing and
     looking at the character is the most common thing to want mid-drill, so
     both keys work from either side. */
  if (pad.active) {
    const k = e.key.toLowerCase();
    if (k === "s") { e.preventDefault(); ($("#skipW") || $("#againW"))?.click(); }
    /* T toggles, as it does in the notebook — the drill's 触控 button only ever
       started the pad and disabled itself, so there was no way back to the
       mouse without Escape */
    if (k === "t") { e.preventDefault(); padStop(); }
    return;
  }

  if (e.key === " " || e.key === "Enter") {
    /* Space moves you on. It does not answer for you.

       #skipW was in this list, which meant that on a writing drill — the one
       that comes straight after meeting a character — two taps of space gave
       up on the quiz without a stroke being written: the first tap dismissed
       the card, the second hit "Show me the strokes". That reads as the space
       bar skipping the quiz, because it is. The skip button keeps its own key
       (S), where pressing it is a decision rather than a reflex. */
    const go2 = $("#cont") || $("#gotIt") || $("#fin") || $("#again");
    if (go2) { e.preventDefault(); go2.click(); }
    /* nothing to advance to means the question is still open: swallow it, so
       a held key cannot run ahead into whatever renders next */
    else if (session.queue[session.idx]?.t === "drill") e.preventDefault();
    return;
  }
  if (/^[1-9]$/.test(e.key)) {
    const n = +e.key - 1;
    const opts = $$("#sesInner .opt:not(:disabled)");
    if (opts[n]) { e.preventDefault(); opts[n].click(); return; }
    const tiles = $$("#sesInner .tile:not(.used)");
    if (tiles[n]) { e.preventDefault(); tiles[n].click(); }
    return;
  }
  if (e.key.toLowerCase() === "r") $("#earBtn")?.click();
  /* S shows the strokes, or shows them again; T puts you back to writing.
     The same two keys either way round, so switching needs no thought. */
  if (e.key.toLowerCase() === "s") { e.preventDefault(); ($("#skipW") || $("#againW"))?.click(); }
  if (e.key.toLowerCase() === "t") { e.preventDefault(); ($("#padW") || $("#tryW"))?.click(); }
}

/* ---------- version ----------

   Defined inline in index.html rather than in a script file, because a script
   file is exactly the thing that gets cached — asking a stale js/app.js what
   version it is would always get the reassuring answer. index.html carries no
   query string of its own and is the one file browsers reliably revalidate. */
const appVersion = () => (typeof APP_VERSION === "string" ? APP_VERSION : "dev");
const appDate = () => (typeof APP_DATE === "string" ? APP_DATE : "—");

/* ============================================================
   Finishing something

   Two moments worth marking: the day's list all ticked, and every character
   solid in all three Go deeper modes. Both are rare enough that a bit of
   noise is earned — the day's list once a day at most, the Go deeper one
   perhaps twice a year.

   The sound is synthesised rather than bundled: five notes of a pentatonic
   scale, which is the one that reads as Chinese to most ears and also the one
   where any subset sounds consonant. A stored clip would be another asset to
   ship and another thing to go missing.
   ============================================================ */

const CHEERS = {
  day:  { seal: "成", zh: "今日功课已毕", en: "Today's page is filled.", notes: [523.25, 587.33, 659.25, 783.99, 880] },
  deep: { seal: "圆", zh: "圆满", en: "Every character solid, every mode.", notes: [523.25, 659.25, 783.99, 1046.5, 1318.5] },
  record: { seal: "破", zh: "破纪录", en: "A new best on that sheet.", notes: [659.25, 783.99, 880, 1046.5, 1318.5] }
};

function cheerSound(notes) {
  if (!state.audio) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    notes.forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      /* a struck-string shape: immediate, then let it ring out */
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 2600);
  } catch { /* no audio context — the animation still lands */ }
}

let cheerTimer = null;

function celebrate(kind) {
  const c = CHEERS[kind];
  if (!c) return;
  const el = $("#cheer");
  if (!el) return;
  $("#cheerSeal").textContent = c.seal;
  $("#cheerZh").textContent = c.zh;
  $("#cheerEn").textContent = c.en;

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bits = $("#cheerBits");
  bits.innerHTML = calm ? "" : Array.from({ length: 14 }, (_, i) => {
    const left = 6 + Math.random() * 88;
    const delay = Math.random() * 0.5;
    const dur = 1.5 + Math.random() * 1.1;
    const size = 0.7 + Math.random() * 0.9;
    const drift = (Math.random() - 0.5) * 120;
    return `<span class="cheer-bit" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;font-size:${size}rem;--drift:${drift}px">${i % 2 ? "✦" : "花"}</span>`;
  }).join("");

  el.classList.add("on");
  cheerSound(c.notes);
  clearTimeout(cheerTimer);
  cheerTimer = setTimeout(() => el.classList.remove("on"), calm ? 1800 : 2600);
}

/* Fired from renderToday, which is the one place that already knows both
   answers. Each is latched so a re-render doesn't set it off again — the
   day's one in the day record, the Go deeper one in the profile, since
   finishing every mode is a once-in-a-library event. */
function checkCheers(dayDone, deepDone) {
  const t = today();
  if (dayDone && !t.cheered) { t.cheered = true; save(); setTimeout(() => celebrate("day"), 260); }
  if (deepDone && !state.deepCheered) { state.deepCheered = true; save(); setTimeout(() => celebrate("deep"), dayDone ? 2900 : 260); }
  /* it can be lost again — a new character makes the library incomplete */
  if (!deepDone && state.deepCheered) { state.deepCheered = false; save(); }
}

/* ============================================================
   Profile — a name, and what you care about

   Two questions, both skippable. The name is used where the app addresses you
   directly and nowhere else. The interests feed the word of the week and
   nothing else — in particular they do NOT reorder the curriculum, because the
   teaching order is load-bearing: 马 has to arrive before 妈 and 吗 whatever
   you happen to be interested in.
   ============================================================ */

function openProfile(firstRun) {
  const chosen = new Set(state.interests || []);
  openSheet(`<span class="han">关于你</span> About you`, `<div class="wrap"><div class="section">
    <div class="today-head">
      <h1>${firstRun ? "Two quick questions." : "About you"}</h1>
      <p class="note">Both optional, and both changeable later. Your name is only ever used to address you.
        Your interests pick the word of the week — they don't change the order characters are taught in,
        because that order is what makes each character easier than the last.</p>
    </div>

    <div class="sheet block">
      <div class="block-head"><span class="k">名字</span><span class="t">What should we call you?</span></div>
      <input type="text" id="pfName" class="search" maxlength="40" placeholder="Your name"
        value="${esc(state.name || "")}" autocomplete="given-name">
    </div>

    <div class="sheet block">
      <div class="block-head"><span class="k">兴趣</span><span class="t">What are you into?</span></div>
      <p class="note">Pick any number. Each week you'll get one real word from them — usually built from
        characters well past where you've got to, which is the point of it.</p>
      <div class="int-grid">
        ${INTEREST_KEYS.map(k => {
          const it = INTERESTS[k];
          return `<button class="int ${chosen.has(k) ? "on" : ""}" data-int="${esc(k)}" aria-pressed="${chosen.has(k)}">
            <span class="int-icon">${esc(it.icon)}</span>
            <span class="int-body"><b>${esc(it.name)}</b><span class="han">${esc(it.zh)}</span></span>
          </button>`;
        }).join("")}
      </div>
    </div>

    <div class="split">
      <button class="btn btn-ghost" id="pfSkip">${firstRun ? "Skip for now" : "Cancel"}</button>
      <button class="btn btn-seal" id="pfSave">Save</button>
    </div>
  </div></div>`);

  $$("#svBody .int").forEach(b => b.onclick = () => {
    const k = b.dataset.int;
    if (chosen.has(k)) chosen.delete(k); else chosen.add(k);
    b.classList.toggle("on", chosen.has(k));
    b.setAttribute("aria-pressed", chosen.has(k));
  });
  $("#pfSkip").onclick = () => { state.profiled = true; save(); closeSheet(); };
  $("#pfSave").onclick = () => {
    state.name = $("#pfName").value.trim().slice(0, 40);
    const next = [...chosen];
    /* a changed interest set invalidates a pick that may no longer be in it */
    if ((state.interests || []).join() !== next.join()) state.wotw = null;
    state.interests = next;
    state.profiled = true;
    save();
    closeSheet();
  };
}

/* ============================================================
   Placement — finding where to start

   Four options, meaning to character. Meaning-to-character rather than the
   other way round because recognising 山 among four English words is easy to
   fake by elimination, while picking 山 out of four plausible characters is
   not. The distractors are drawn from nearby in the curriculum so they look
   alike; a block of easy ones would place everybody at the end.
   ============================================================ */

const place = { idx: 0, asked: 0, misses: 0, done: false, got: new Set(), result: 0, locked: false };

const MIN_BEFORE_STOP = 12;   /* questions before "that's enough" is offered */

function openPlacement() {
  place.idx = 0; place.asked = 0; place.misses = 0; place.done = false;
  place.got = new Set(); place.result = 0; place.locked = false;
  $("#place").classList.add("on");
  document.body.style.overflow = "hidden";
  renderPlacement();
}

function closePlacement() {
  $("#place").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
  maybeOfferProfile();
}

function placementOptions(c) {
  const ch = CHAR_INDEX[c];
  /* neighbours in the curriculum: same era, similar difficulty, genuinely
     confusable — rather than three characters from four stages away */
  const near = HQ
    .filter(x => x.c !== c && Math.abs(x.i - ch.i) <= 30)
    .sort((a, b) => Math.abs(a.i - ch.i) - Math.abs(b.i - ch.i));
  return shuffle([ch, ...pick(near.slice(0, 18), 3)]);
}

function renderPlacement() {
  if (place.done) return renderPlacementDone();

  /* walk past anything already known — a retake shouldn't re-ask them */
  while (place.idx < HQ.length && isKnown(HQ[place.idx].c)) place.idx++;
  if (place.idx >= HQ.length) return finishPlacement();

  const ch = HQ[place.idx];
  const opts = placementOptions(ch.c);
  const stage = STAGES.find(st => ch.i < st.end) || STAGES[0];
  const left = PLACE_MISS_LIMIT + 1 - place.misses;

  $("#placeProg").style.width = `${((place.idx / HQ.length) * 100).toFixed(1)}%`;
  $("#placeCount").textContent = `${place.got.size} known`;

  $("#placeBody").innerHTML = `<div class="place-inner">
    <span class="place-where">${esc(stage.icon)} ${esc(stage.name)} · #${ch.i + 1} of ${HQ.length}</span>
    <span class="eyebrow">Which character means</span>
    <h1 class="place-q">${esc(ch.m)}</h1>
    <div class="place-opts">
      ${opts.map((o, i) => `<button class="place-opt" data-c="${esc(o.c)}">
        <kbd class="opt-n">${i + 1}</kbd><span class="han">${esc(o.c)}</span></button>`).join("")}
    </div>
    <button class="btn btn-ghost btn-sm" id="placeDunno">I don't know this one <kbd class="opt-n">space</kbd></button>
    <p class="note">Answer honestly. Every one you get right is marked as already known and skipped —
      ${place.misses
        ? `${left} more miss${left === 1 ? "" : "es"} and we'll stop here.`
        : `we stop once you've missed more than ${PLACE_MISS_LIMIT}.`}</p>
    ${place.asked >= MIN_BEFORE_STOP
      ? `<button class="btn btn-ghost btn-sm place-stop" id="placeEnough">That's enough — start me here</button>` : ""}
  </div>`;

  $$("#placeBody .place-opt").forEach(b => b.onclick = () => placementAnswer(b.dataset.c === ch.c, b, ch.c));
  $("#placeDunno").onclick = () => placementAnswer(false, null, ch.c);
  $("#placeEnough")?.addEventListener("click", finishPlacement);
}

function placementAnswer(ok, btn, c) {
  /* One answer per question. The options are disabled on the way out, but the
     "I don't know" button and its space shortcut are not — without this, space
     held down through the reveal counts a miss per repeat and ends the quiz
     several characters early. */
  if (place.locked) return;
  place.locked = true;
  place.asked++;
  if (ok) place.got.add(c); else place.misses++;
  $$("#placeBody .place-opt").forEach(b => {
    b.disabled = true;
    if (b.dataset.c === c) b.classList.add("right");
  });
  const dunno = $("#placeDunno");
  if (dunno) dunno.disabled = true;
  if (btn && !ok) btn.classList.add("wrong");
  say(c);
  setTimeout(() => {
    place.idx++;
    place.locked = false;
    if (place.misses > PLACE_MISS_LIMIT) return finishPlacement();
    renderPlacement();
  }, ok ? 320 : 900);
}

function finishPlacement() {
  place.result = place.got.size;
  place.done = true;
  renderPlacement();
}

function renderPlacementDone() {
  const n = place.got.size;
  const reached = place.idx;
  const stage = n ? (STAGES.find(st => reached < st.end) || STAGES[STAGES.length - 1]) : STAGES[0];
  const firstGap = HQ.find(ch => !place.got.has(ch.c) && !isKnown(ch.c));
  $("#placeProg").style.width = "100%";
  $("#placeBody").innerHTML = `<div class="place-inner">
    <span class="place-seal">${n ? esc(stage.icon) : "🌱"}</span>
    <h1>${n ? `You already know ${n} character${n === 1 ? "" : "s"}.` : "We'll start at the beginning."}</h1>
    <p class="note">${n
      ? `Every one of those was asked and answered — nothing here is guessed. They go into your library as known,
         which means they'll show up in reading, writing and pronunciation practice, and they'll be inked in
         sentences, exactly as if you'd learnt them in an earlier session.`
      : `Nothing to skip, which is the easiest place to start from. ${HQ.length} characters, in an order where
         each one makes the next easier.`}</p>

    ${n ? `<div class="place-ledger">
      <div class="pl-row">
        <span class="pl-n">0</span>
        <span class="pl-t"><b>reviews tomorrow</b><small>Known characters don't land in your queue. The first few
          come back within the week as a refresher; the rest are a fortnight out or more.</small></span>
      </div>
      <div class="pl-row">
        <span class="pl-n">5</span>
        <span class="pl-t"><b>new characters on day one</b><small>The same first session everybody gets —
          starting at ${firstGap ? `<b class="han">${esc(firstGap.c)}</b> ${esc(firstGap.p)}, the first one you didn't know` : "the beginning"}.</small></span>
      </div>
    </div>` : ""}

    <div class="place-foot">
      <button class="btn btn-ghost" id="placeRedo">Take it again</button>
      <button class="btn btn-seal" id="placeGo">${n ? "Start here" : "Start from the beginning"} <kbd class="opt-n">↵</kbd></button>
    </div>
    <p class="note dim">You can re-place from Settings at any time. It only ever adds.</p>
  </div>`;
  $("#placeRedo").onclick = openPlacement;
  $("#placeGo").onclick = () => {
    if (n) placeKnown(place.got);
    else { state.placed = { on: dayKey(), at: 0, known: 0 }; save(); }
    closePlacement();
  };
}

/* ============================================================
   Asking before something irreversible

   This used to be window.confirm(). Inside the cross-origin frame an artifact
   is embedded in there is no `allow-modals`, and a sandbox without it makes
   confirm() return **false immediately** — no dialog, no error, nothing in the
   console. Every guard written as `if (!confirm(...)) return;` therefore became
   `return;`: Reset did nothing at all, Restore did nothing at all, and closing
   a session part-way through was impossible. A dialog drawn in the page works
   the same everywhere.
   ============================================================ */

let askDone = null;

function askConfirm({ k = "确定", title, body, yes = "Confirm", no = "Cancel", danger = false }) {
  const el = $("#ask");
  $("#askK").textContent = k;
  $("#askTitle").textContent = title;
  $("#askBody").textContent = body;
  const yesBtn = $("#askYes"), noBtn = $("#askNo");
  yesBtn.textContent = yes;
  noBtn.textContent = no;
  yesBtn.className = "btn btn-sm" + (danger ? " ask-danger" : "");
  el.classList.add("on");
  document.body.style.overflow = "hidden";
  noBtn.focus();                       /* the safe option, for a stray Enter */
  return new Promise(res => { askDone = res; });
}

function closeAsk(answer) {
  if (!askDone) return;
  const res = askDone;
  askDone = null;
  $("#ask").classList.remove("on");
  /* a sheet or session underneath may still want the scroll locked */
  if (!$("#charView").classList.contains("on") && !session.active
      && !$("#flash").classList.contains("on") && !$("#notebook").classList.contains("on")) {
    document.body.style.overflow = "";
  }
  res(answer);
}

const asking = () => !!askDone;

/* ============================================================
   A short walk round, the first time only
   ============================================================ */

const TOUR = [
  { k: "汉", title: "Welcome",
    body: `${HQ.length} characters, taught in an order where each one makes the next easier —
           you'll meet 马 just before 妈 and 吗, so by then you already own both halves.
           Nothing here needs to be finished in a sitting.` },
  { k: "今天", title: "Today is a short list",
    body: `Learn the day's characters, then tick off practising them: recognising,
           reading, saying and writing. Everything is scoped to what you learned today,
           so the list is always finishable.` },
  { k: "看菜单", title: "A side quest with an ending",
    body: `One character a day from a real restaurant menu. The ones you know are inked
           in; the rest stay grey. Learn them all and you can read the whole thing —
           hover any character for its meaning while you get there.` },
  { k: "速练", title: "A minute, against the clock",
    body: `The 速练 tab is a timed sheet — so many questions, so many minutes, and nothing
           marked until you hand it in. Reading, writing and listening each keep their own
           board, and whatever you keep missing goes into a 错字本 to be worked on properly.` },
  { k: "写字", title: "Writing, two ways",
    body: `Trace characters stroke by stroke with a mouse, a finger or the trackpad
           (press <kbd class="opt-n">T</kbd>). Or open the 练字 tab for a blank exercise
           book to fill however you like.` },
  { k: "记录", title: "It's all kept here",
    body: `Progress lives in this browser and nowhere else, so it's waiting when you come
           back — but clearing your browser data, switching browsers or opening a private
           window loses the lot.` },
  { k: "备份", title: "Save it somewhere real",
    body: `The <kbd class="opt-n">💾</kbd> button in the top bar writes everything — characters,
           streak, diary — to one file you can keep. The same screen loads it back, on this
           computer or another one. Worth doing once you've a streak worth keeping; the button
           grows a gold dot when you're overdue.` }
];

let tourStep = 0;

function startTour(force) {
  if (!force && state.tour) return;
  tourStep = 0;
  $("#tour").classList.add("on");
  document.body.style.overflow = "hidden";
  renderTour();
}

function endTour() {
  state.tour = true; save();
  $("#tour").classList.remove("on");
  document.body.style.overflow = "";
  maybeOfferPlacement();
}

/* Offered once, at the end of the tour, and only to a genuinely empty record —
   asking someone mid-streak where they'd like to start would be alarming. */
async function maybeOfferPlacement() {
  if (wasPlaced() || Object.keys(state.chars).length) return;
  const yes = await askConfirm({
    k: "定位",
    title: "Do you already read some Chinese?",
    body: `A quick check walks the ${HQ.length} characters in order and finds where your recognition starts to give out, `
        + "so you don't spend a fortnight on characters you have known for years. Under two minutes.",
    yes: "Find my level", no: "Start from scratch"
  });
  if (yes) openPlacement();
  else { state.placed = { at: 0, on: dayKey() }; save(); maybeOfferProfile(); }
}

/* Asked once, after placement is settled, so the first run is two short
   questions rather than a gauntlet of dialogs. */
function maybeOfferProfile() {
  if (state.profiled) return;
  setTimeout(() => { if (!state.profiled) openProfile(true); }, 400);
}

function renderTour() {
  const t = TOUR[tourStep], last = tourStep === TOUR.length - 1;
  $("#tourBody").innerHTML = `
    <span class="tour-k han">${esc(t.k)}</span>
    <h2>${esc(t.title)}</h2>
    <p>${t.body}</p>
    <div class="tour-dots">${TOUR.map((_, i) =>
      `<span class="${i === tourStep ? "on" : ""}"></span>`).join("")}</div>`;
  $("#tourBack").hidden = tourStep === 0;
  $("#tourNext").textContent = last ? "Start learning" : "Next";
}

/* ============================================================
   Navigation
   ============================================================ */

let view = "today";
const RENDER = { today: renderToday, sprint: renderSprint, library: renderLibrary,
                 write: renderWrite, radicals: renderRadicals, record: renderRecord };

function go(v) {
  view = v;
  const id = "view" + v[0].toUpperCase() + v.slice(1);
  $$(".view").forEach(el => el.classList.toggle("on", el.id === id));
  $$("[data-nav]").forEach(b => b.classList.toggle("on", b.dataset.nav === v));
  RENDER[v]();
  window.scrollTo(0, 0);
}
function renderAll() {
  /* renderWrite() deliberately no-ops once built — rebuilding it would wipe
     whatever is on the page. */
  RENDER[view]();
  renderStreakChip();
  renderTracker();
}

function renderStreakChip() {
  const s = liveStreak();
  $$(".streak-chip").forEach(chip => {
    chip.className = "chip chip-streak streak-chip" + (s ? "" : " cold");
    chip.innerHTML = `🔥 ${s}`;
    chip.title = s ? `${s} day streak · best ${state.streak.best}` : "No streak yet — study today to start one";
  });
  const stale = backupStale();
  $$(".save-btn").forEach(b => {
    b.classList.toggle("nudge", stale);
    b.title = state.lastBackup
      ? `Save your progress to a file — last saved ${new Date(state.lastBackup).toLocaleDateString()}`
      : "Save your progress to a file — you haven't saved a copy yet";
  });
}

function initTheme() {
  const saved = localStorage.getItem("hq-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  $$(".theme-btn").forEach(b => b.onclick = () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("hq-theme", document.documentElement.dataset.theme); } catch {}
    renderAll();
    if (wp.built) { wpDrawGrid(); wpSetPen(); }
  });
}

function boot() {
  load();
  initTheme();
  $$("[data-nav]").forEach(b => b.onclick = () => go(b.dataset.nav));
  $("#sesClose").onclick = async () => {
    if (session.idx > 0 && session.idx < session.queue.length
        && !await askConfirm({
          k: "离开",
          title: "Leave this session?",
          body: `${session.idx} of ${session.queue.length} cards answered. Everything you've answered is already saved — `
              + "the rest go back in the queue.",
          yes: "Leave", no: "Keep going"
        })) return;
    endSession();
  };
  $("#svClose").onclick = closeSheet;
  /* Abandoning a sheet halfway is a decision, not a slip of the finger — but
     once it is marked there is nothing left to lose by closing it. */
  $("#spClose").onclick = async () => {
    sprintPause();
    if (sp.active && sp.idx > 0 && !await askConfirm({
          k: "作废",
          title: "Give up on this sheet?",
          body: `${sp.idx} of ${sp.n} answered. Those answers are already counted, but the sheet won't be `
              + "scored and won't reach the board.",
          yes: "Give up", no: "Keep going"
        })) return sprintResume();
    sprintClose();
  };
  $("#muted").onclick = () => {
    /* this tap is the gesture the engine was waiting for */
    state.audio = true; speechBlocked = false; speechPrimed = false; audioUnlocked = false;
    unlockAudio(); primeSpeech(); save(); renderMuted();
    if (lastSaid) setTimeout(() => say(lastSaid, true), 80);
  };
  $("#askYes").onclick = () => closeAsk(true);
  $("#askNo").onclick = () => closeAsk(false);
  /* clicking the dim backdrop is a cancel, like Escape */
  $("#ask").addEventListener("pointerdown", e => { if (e.target === $("#ask")) closeAsk(false); });
  document.addEventListener("keydown", onKey);
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (asking()) { e.preventDefault(); closeAsk(false); return; }   /* the topmost thing open */
    if ($("#sprintRun").classList.contains("on")) { e.preventDefault(); $("#spClose").click(); return; }
    if ($("#place").classList.contains("on")) { closePlacement(); return; }
    if ($("#notebook").classList.contains("on")) { if (pad.active) padStop(); else closeNotebook(); }
    else if ($("#flash").classList.contains("on")) closeFlash();
    else if ($("#charView").classList.contains("on")) closeSheet();
    else if (session.active) $("#sesClose").click();
  });
  initTips();
  initSpeakables();
  $("#flashClose").onclick = closeFlash;
  $("#placeClose").onclick = closePlacement;
  $("#nbClose").onclick = closeNotebook;
  /* #nbPad lives inside the notebook stage now, and is bound when it renders */
  $("#flashPrev").onclick = () => flashStep(-1);
  $("#flashNext").onclick = () => flashStep(1);
  $$(".settings-btn").forEach(b => b.onclick = openSettings);
  $$(".save-btn").forEach(b => b.onclick = openBackup);
  $("#tourNext").onclick = () => { if (tourStep === TOUR.length - 1) endTour(); else { tourStep++; renderTour(); } };
  $("#tourBack").onclick = () => { if (tourStep > 0) { tourStep--; renderTour(); } };
  $("#tourSkip").onclick = endTour;
  go("today");
  loadAudioBundle();                   /* after the first render, never before */
  /* The chip and the save button are painted from state, and nothing else on
     the first frame does it — without this a six-day streak reads 🔥 0 until
     the first render triggered by something else. */
  renderStreakChip();
  renderTracker();
  startTour();
  connectRemote().then(changed => { if (changed) renderAll(); });
}

document.addEventListener("DOMContentLoaded", boot);
