/* ============================================================
   速练 Sprint — minute math, for characters

   The idea is borrowed wholesale from the timed arithmetic sheets primary
   schools hand out: a fixed number of questions, a fixed number of minutes,
   and two separate things to be proud of. First, did you finish inside the
   time. Then, and only then, how many did you get right.

   Three things follow from that, and they are why this is not simply the
   daily session with a clock bolted on.

   Nothing is marked while you work. A verdict after every question is the
   right design for learning a character and the wrong one for finding out
   how fast you can read — it breaks the rhythm, and knowing you missed
   number 7 does nothing for you at number 8 except cost you number 9. The
   sheet is marked when it is handed in, all at once, the way a real one is.

   The sheet exists before the clock starts. Every question, and every option
   on it, is built during the countdown, so no question can be slower to
   appear than any other and a slow browser cannot cost you a run.

   And a miss here never touches your review schedule. Racing produces slips
   that say nothing about whether you know a character. They go in the 错字本
   instead, where they can be worked on at a sensible speed.
   ============================================================ */

const SPRINT = {
  r: { zh: "认读", name: "Reading", skill: "r", verb: "read",
       blurb: "See the character, pick what it means.",
       long: "The plain one, and the one that transfers straight to a page of text: recognising a character fast enough that reading a sentence feels like reading rather than decoding.",
       par: 2.4 },
  w: { zh: "默写", name: "Writing", skill: "c", verb: "produce",
       blurb: "Produce the character from its meaning.",
       long: "Recall, not recognition — you are given the meaning and have to come up with the character. Two input styles, both faster than drawing strokes.",
       par: 4.0 },
  l: { zh: "听力", name: "Listening", skill: "p", verb: "hear",
       blurb: "Hear it, pick the character.",
       long: "The skill that lags furthest behind the others, because almost nothing else in the app forces you to work from sound alone.",
       par: 3.2 }
};

/* Both are production — you are handed a meaning and have to come back with
   a character — and neither asks you to draw a stroke. */
const WRITE_STYLES = {
  type: { zh: "打字", name: "Type it", key: "type",
          blurb: "Type the pinyin, pick the character — how Chinese is actually written on a phone.",
          par: 4.6 },
  spot: { zh: "辨形", name: "Spot it", key: "spot",
          blurb: "Pick it out of six look-alikes that share its parts.",
          par: 3.0 }
};

const SPRINT_MINUTES = [1, 2, 3, 5];
const SPRINT_COUNTS = [20, 30, 40, 50, 60, 80, 100];
const SPRINT_MIN_POOL = 8;        /* characters you need before a sheet means anything */
const SPRINT_MAX_LOOPS = 6;       /* how many times one sheet may reuse a character */
const SPRINT_READY = 3;           /* the 预备 countdown, in seconds */

/* Difficulty is relative to the mode, not absolute. Two seconds a question is
   brisk reading and impossible typing, and a single table of seconds would
   have called them the same thing. */
const SPRINT_GRADES = [
  { at: 1.5,  zh: "慢", name: "Steady" },
  { at: 1.15, zh: "稳", name: "Even" },
  { at: 0.85, zh: "快", name: "Quick" },
  { at: 0.62, zh: "疾", name: "Fast" },
  { at: 0,    zh: "狂", name: "Furious" }
];

const sprintPar = (mode, style) => mode === "w" ? WRITE_STYLES[style || "type"].par : SPRINT[mode].par;
const sprintPace = (n, secs) => secs / n;
function sprintGrade(mode, n, secs, style) {
  const ratio = sprintPace(n, secs) / sprintPar(mode, style);
  return SPRINT_GRADES.find(g => ratio >= g.at) || SPRINT_GRADES[SPRINT_GRADES.length - 1];
}

const fmtClock = ms => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}`;
};

/* ---------- building a sheet ----------

   Characters are dealt from a shuffled deck rather than drawn at random. A
   hundred random draws from forty characters shows some of them five times
   and some of them never, and puts the same one back-to-back often enough to
   look broken; dealing and reshuffling spreads the sheet evenly and keeps
   consecutive repeats impossible. */
function sprintDeal(pool, n) {
  const out = [];
  let deck = [];
  while (out.length < n) {
    if (!deck.length) {
      deck = shuffle([...pool]);
      /* Cards are dealt off the end, so the seam is the last card, not the
         first — and a pool of one has nowhere to move it to. */
      const top = deck.length - 1;
      if (out.length && deck[top] === out[out.length - 1] && deck.length > 1)
        [deck[top], deck[top - 1]] = [deck[top - 1], deck[top]];
    }
    out.push(deck.pop());
  }
  return out;
}

/* Options that are characters only ever come from characters you have met —
   the same rule the daily drills follow. Meanings are English, so those may
   come from anywhere in the library. */
function sprintDistractors(ch, known, n, kind) {
  const others = known.filter(c => c !== ch.c).map(c => CHAR_INDEX[c]);
  let near = [];
  if (kind === "spot") {
    /* look-alikes first: anything built out of one of the same parts */
    near = others.filter(x => x.comp.some(z => ch.comp.includes(z)) || ch.comp.includes(x.c) || x.comp.includes(ch.c));
    /* then homophones, which are the other way to be confusable */
    if (near.length < n) near = near.concat(others.filter(x => bare(x.p) === bare(ch.p)));
  } else if (kind === "listen") {
    /* the point is hearing it, not splitting hairs between two third tones */
    near = others.filter(x => toneOf(x.p) !== toneOf(ch.p) || bare(x.p)[0] !== bare(ch.p)[0]);
  }
  let out = optionSet(ch.c, near, x => x.c, n);
  if (out.length < n) out = out.concat(optionSet(ch.c, others.filter(x => !out.includes(x.c)), x => x.c, n - out.length));
  return out;
}

function sprintQuestion(c, mode, style, known) {
  const ch = CHAR_INDEX[c];
  const q = { c, ch };
  if (mode === "r") {
    q.correct = ch.m;
    q.opts = shuffle([ch.m, ...optionSet(ch.m, HQ.filter(x => x.c !== c), x => x.m, 3)])
      .map(m => ({ v: m, html: esc(m) }));
  } else if (mode === "l") {
    q.correct = c;
    q.opts = shuffle([c, ...sprintDistractors(ch, known, 3, "listen")])
      .map(x => ({ v: x, html: `<span class="big">${esc(x)}</span>` }));
  } else if (style === "spot") {
    q.correct = c;
    q.opts = shuffle([c, ...sprintDistractors(ch, known, 5, "spot")])
      .map(x => ({ v: x, html: `<span class="big">${esc(x)}</span>` }));
  } else {
    q.correct = c;                     /* typed: the candidates are live */
  }
  return q;
}

function sprintPool(mode) {
  const known = knownChars();
  /* Listening can only ask about what can actually be said. With the bundle
     loaded that is nearly everything; without it the system voice handles
     whatever it handles, so nothing is excluded and the mode degrades rather
     than emptying out. */
  if (mode === "l" && clipCount() > 0) {
    const withClips = known.filter(c => clipFor(c));
    if (withClips.length >= SPRINT_MIN_POOL) return withClips;
  }
  return known;
}

/* ---------- the run ---------- */

const sp = { mode: "r", style: "type", n: 40, secs: 120,
             queue: [], idx: 0, active: false, marked: false,
             startedAt: 0, endsAt: 0, tick: null, qStart: 0,
             typed: "", cands: [], known: [] };

function sprintOpen(mode, n, secs, style) {
  const pool = sprintPool(mode);
  if (pool.length < SPRINT_MIN_POOL) return;
  sprintStop();                       /* "another sheet" from a marked one */
  Object.assign(sp, {
    mode, style: mode === "w" ? style : null, n, secs,
    known: knownChars(), idx: 0, active: true, marked: false,
    typed: "", cands: [], qStart: 0,
    /* cleared explicitly: a run that never got past the countdown would
       otherwise hand the next sheet the last one's clock */
    startedAt: 0, endsAt: 0, readyAt: 0
  });
  sp.queue = sprintDeal(pool, n).map(c => sprintQuestion(c, mode, sp.style, sp.known));
  $("#sprintRun").classList.add("on");
  document.body.style.overflow = "hidden";
  $("#spDrain").firstElementChild.style.width = "100%";
  sprintDots();
  sprintReady();
}

/* 预备 — three seconds to put your hand on the keys. The clock starts after
   it, so a sheet never costs you the time it took to realise it had begun.

   The countdown reads the clock rather than counting its own steps. A chain of
   three one-second timeouts is three seconds only while the tab is in front:
   backgrounded, browsers throttle them hard, and the sheet would sit on 预备
   long past its welcome — or, worse, be answerable from the keyboard while the
   clock it is being timed against had never started. */
function sprintReady() {
  const cfg = SPRINT[sp.mode];
  const g = sprintGrade(sp.mode, sp.n, sp.secs, sp.style);
  if (!sp.readyAt) sp.readyAt = Date.now() + SPRINT_READY * 1000;
  const left = Math.ceil((sp.readyAt - Date.now()) / 1000);
  $("#spMode").innerHTML = `<span class="han">${esc(cfg.zh)}</span> ${esc(cfg.name)}`;
  $("#spCount").textContent = `0 / ${sp.n}`;
  $("#spClock").textContent = fmtClock(sp.secs * 1000);
  $("#spInner").innerHTML = `<div class="sp-ready">
    <span class="sp-ready-k han">预备</span>
    <b>${sp.n} questions · ${fmtClock(sp.secs * 1000)}</b>
    <span class="sp-ready-g"><span class="han">${esc(g.zh)}</span> ${esc(g.name)} · ${sprintPace(sp.n, sp.secs).toFixed(1)}s a question</span>
    <span class="sp-ready-n">${Math.max(0, left)}</span>
  </div>`;
  if (left <= 0) return sprintStart();
  sp.tick = setTimeout(sprintReady, Math.min(1000, sp.readyAt - Date.now()));
}

function sprintStart() {
  sp.startedAt = Date.now();
  sp.endsAt = sp.startedAt + sp.secs * 1000;
  sprintRenderQ();
  sp.tick = setInterval(sprintClock, 100);
}

function sprintClock() {
  const left = sp.endsAt - Date.now();
  $("#spClock").textContent = fmtClock(left);
  $("#spClock").classList.toggle("low", left <= 10000);
  $("#spDrain").firstElementChild.style.width = `${Math.max(0, (left / (sp.secs * 1000)) * 100).toFixed(2)}%`;
  if (left <= 0) sprintFinish(false);
}

/* Asking "give up on this sheet?" with the clock still running is a question
   you are charged for answering — and charged twice, because it is the answer
   "no" that costs. So the confirm holds the clock, and the time left when it
   opened is the time left when it closes. */
function sprintPause() {
  if (!sp.active || !sp.startedAt) return 0;
  sp.left = Math.max(0, sp.endsAt - Date.now());
  clearInterval(sp.tick);
  sp.tick = null;
  return sp.left;
}

function sprintResume() {
  if (!sp.active || !sp.startedAt || sp.tick) return;
  sp.endsAt = Date.now() + (sp.left || 0);
  sp.qStart = Date.now();            /* nor is the current question charged */
  sp.tick = setInterval(sprintClock, 100);
  $("#spInput")?.focus();
}

function sprintStop() {
  clearTimeout(sp.tick);
  clearInterval(sp.tick);
  sp.tick = null;
}

function sprintClose() {
  sprintStop();
  stopPhrase();
  sp.active = false;
  $("#sprintRun").classList.remove("on");
  document.body.style.overflow = "";
  renderAll();
}

/* The strip along the top: one mark per question, filling as you go. It shows
   position, never the verdict — that is what the marking is for. */
function sprintDots() {
  $("#spDots").innerHTML = sp.queue.map((_, i) => `<i class="d${i === 0 ? " at" : ""}"></i>`).join("");
}

function sprintRenderQ() {
  const q = sp.queue[sp.idx];
  if (!q) return;
  const body = $("#spInner");
  const ch = q.ch;
  $("#spCount").textContent = `${sp.idx + 1} / ${sp.n}`;
  const dots = $("#spDots").children;
  if (dots[sp.idx - 1]) dots[sp.idx - 1].className = "d done";
  if (dots[sp.idx]) dots[sp.idx].className = "d at";
  sp.qStart = Date.now();

  if (sp.mode === "r") {
    body.innerHTML = `<div class="sp-q">
      <div class="sp-char han">${esc(ch.c)}</div>
      <div class="sp-opts">${sprintOptHtml(q.opts)}</div>
    </div>`;
  } else if (sp.mode === "l") {
    body.innerHTML = `<div class="sp-q">
      <button class="sp-ear" id="spEar" aria-label="Hear it again">🔊</button>
      <div class="sp-opts grid2">${sprintOptHtml(q.opts)}</div>
    </div>`;
    $("#spEar").onclick = () => say(ch.c, true);
    say(ch.c, true);
  } else if (sp.style === "spot") {
    body.innerHTML = `<div class="sp-q">
      <div class="sp-prompt"><span class="pin">${esc(ch.p)}</span> ${toneMark(ch.p)}<em>${esc(ch.m)}</em></div>
      <div class="sp-opts grid3">${sprintOptHtml(q.opts)}</div>
    </div>`;
  } else {
    sp.typed = "";
    body.innerHTML = `<div class="sp-q">
      <div class="sp-prompt"><em class="lead">${esc(ch.m)}</em></div>
      <div class="sp-type">
        <input class="sp-input" id="spInput" type="text" inputmode="latin" autocomplete="off"
               autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="pinyin…" aria-label="Type the pinyin">
        <button class="sp-skip" id="spSkip">Don't know <kbd class="opt-n">0</kbd></button>
      </div>
      <div class="sp-cands" id="spCands"></div>
      <p class="note sp-tip">Tones aren't needed. <kbd class="opt-n">1</kbd>–<kbd class="opt-n">9</kbd> picks a candidate, <kbd class="opt-n">↵</kbd> takes the first.</p>
    </div>`;
    const inp = $("#spInput");
    inp.oninput = () => { sp.typed = inp.value; sprintCandidates(); };
    inp.onkeydown = sprintTypeKey;
    $("#spSkip").onclick = () => sprintAnswer(null);
    sprintCandidates();
    inp.focus();
  }
  if (sp.mode !== "w" || sp.style !== "type") {
    $$(".sp-opt", body).forEach(b => b.onclick = () => sprintAnswer(b.dataset.v));
  }
}

const sprintOptHtml = opts => opts.map((o, i) =>
  `<button class="sp-opt" data-v="${esc(o.v)}"><kbd class="opt-n">${i + 1}</kbd>${o.html}</button>`).join("");

/* ---------- typing: a stripped-down IME ----------

   Prefix matching over the characters you know, most common first, which is
   what a real input method does. Homophones are the test: typing "shi"
   correctly is half the answer, and the other half is knowing which of the
   six 是 事 十 时 手 试 shapes on screen is the one that means what you were
   asked for. */
function sprintCandidates() {
  const q = sp.queue[sp.idx];
  const t = searchable(sp.typed).replace(/[^a-z]/g, "");
  const el = $("#spCands");
  if (!el) return;
  if (!t) { sp.cands = []; el.innerHTML = `<span class="sp-cands-hint">Start typing the sound.</span>`; return; }
  const exact = c => searchable(CHAR_INDEX[c].p) === t;
  let hits = sp.known
    .filter(c => searchable(CHAR_INDEX[c].p).startsWith(t))
    .sort((a, b) => (exact(b) - exact(a)) || CHAR_INDEX[a].i - CHAR_INDEX[b].i);
  /* The answer is always reachable when the sound is right. A real IME would
     page; with no room to page, it takes the last slot instead. */
  const top = hits.slice(0, 9);
  if (hits.includes(q.correct) && !top.includes(q.correct)) top[top.length - 1] = q.correct;
  sp.cands = top;
  el.innerHTML = top.length
    ? top.map((c, i) => `<button class="sp-cand" data-v="${esc(c)}"><kbd class="opt-n">${i + 1}</kbd><span class="han">${esc(c)}</span></button>`).join("")
    : `<span class="sp-cands-hint">Nothing you know sounds like that.</span>`;
  $$(".sp-cand", el).forEach(b => b.onclick = () => sprintAnswer(b.dataset.v));
}

function sprintTypeKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Enter") { e.preventDefault(); if (sp.cands[0]) sprintAnswer(sp.cands[0]); return; }
  if (e.key === "Escape") { e.preventDefault(); $("#spClose").click(); return; }
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    if (e.key === "0") return sprintAnswer(null);
    const c = sp.cands[+e.key - 1];
    if (c) sprintAnswer(c);
  }
}

/* ---------- answering ---------- */

function sprintAnswer(value) {
  const q = sp.queue[sp.idx];
  if (!q || q.got !== undefined || !sp.active) return;
  q.got = value;                              /* null = handed in blank */
  q.ok = value === q.correct;
  q.ms = Date.now() - sp.qStart;
  grade(q.c, q.ok, SPRINT[sp.mode].skill, { speed: true });
  sprintMark(q.c, sp.mode, q.ok);
  sp.idx++;
  if (sp.idx >= sp.queue.length) return sprintFinish(true);
  sprintRenderQ();
}

function sprintFinish(completed) {
  if (sp.marked) return;
  sp.marked = true;
  sp.active = false;
  sprintStop();
  stopPhrase();
  const answered = sp.queue.filter(q => q.got !== undefined).length;
  const right = sp.queue.filter(q => q.ok).length;
  const run = { mode: sp.mode, style: sp.style, n: sp.n, secs: sp.secs,
                right, answered, done: completed,
                /* a sheet closed before the countdown finished has no elapsed
                   time to report, and Date.now() - 0 is not it */
                ms: sp.startedAt ? Math.min(sp.secs * 1000, Date.now() - sp.startedAt) : 0 };
  const { best, prev } = recordRun(run);
  if (answered) tallySprint(answered);
  sprintMarked(run, best, prev);
}

/* ---------- the marked sheet ----------

   Handed back the way a real one is: the grade at the top, every question in
   order with a tick or a cross, and then the ones you got wrong written out
   properly, because that is the only part anyone actually reads. */
function sprintMarked(run, best, prev) {
  const cfg = SPRINT[run.mode];
  const pct = run.n ? Math.round((run.right / run.n) * 100) : 0;
  const mark = pct >= 90 ? "甲" : pct >= 75 ? "乙" : pct >= 50 ? "丙" : "丁";
  const g = sprintGrade(run.mode, run.n, run.secs, run.style);
  const missed = sp.queue.filter(q => q.got !== undefined && !q.ok);
  const blank = run.n - run.answered;
  const avg = run.answered ? run.ms / run.answered : 0;

  [...$("#spDots").children].forEach((d, i) => {
    const q = sp.queue[i];
    d.className = "d " + (q.got === undefined ? "blank" : q.ok ? "hit" : "miss");
  });
  $("#spClock").classList.remove("low");
  $("#spCount").textContent = `${run.right} / ${run.n}`;

  $("#spInner").innerHTML = `
    <div class="sp-done">
      <div class="sp-seal">${mark}</div>
      <div class="stack" style="gap:.25rem;text-align:center">
        <h1>${run.done ? "Sheet finished." : "Time."}</h1>
        <p class="note">${run.done
          ? `All ${run.n} answered with ${fmtClock(run.secs * 1000 - run.ms)} to spare.`
          : `${run.answered} of ${run.n} answered — ${blank} left blank.`}
          <span class="han">${esc(g.zh)}</span> ${esc(g.name)} sheet, ${esc(cfg.name).toLowerCase()}${run.style ? ` · ${esc(WRITE_STYLES[run.style].name.toLowerCase())}` : ""}.</p>
      </div>
      ${best ? `<div class="sp-record"><span class="han">新纪录</span> Your best on this sheet${prev ? ` — was ${prev.right}/${prev.n}` : " yet"}</div>` : ""}
      <div class="sp-stats">
        <div><b>${run.right}</b><small>right</small></div>
        <div><b>${run.n - run.right}</b><small>not right</small></div>
        <div><b>${pct}%</b><small>of the sheet</small></div>
        <div><b>${avg ? (avg / 1000).toFixed(1) + "s" : "—"}</b><small>a question</small></div>
      </div>

      <div class="sp-marks">${sp.queue.map((q, i) => `<span class="sp-mk ${q.got === undefined ? "blank" : q.ok ? "hit" : "miss"}"
        title="${i + 1}. ${esc(q.ch.c)} ${esc(q.ch.p)}">${esc(q.ch.c)}</span>`).join("")}</div>

      ${missed.length ? `<div class="sp-wrong">
        <span class="eyebrow">What went wrong</span>
        ${missed.map(q => `<button class="sp-wrong-row" data-c="${esc(q.c)}">
          <span class="han">${esc(q.ch.c)}</span>
          <span class="sp-wrong-body"><b>${esc(q.ch.p)} · ${esc(q.ch.m)}</b>
            <small>you said ${sprintSaid(q)}</small></span>
        </button>`).join("")}
        <p class="note">${missed.length === 1 ? "It's" : "They're"} in your <span class="han">错字本</span> now.</p>
      </div>` : run.done ? `<p class="note" style="text-align:center">Nothing missed.</p>`
        : run.answered ? `<p class="note" style="text-align:center">Nothing wrong in what you answered — there just wasn't time for the rest.</p>`
        : ""}
    </div>`;

  $("#spInner").insertAdjacentHTML("beforeend", `<div class="sp-foot">
    <button class="btn btn-block" id="spAgain">Another sheet, same size</button>
    <div class="split">
      ${missed.length ? `<button class="btn btn-seal" id="spFix">Work on ${missed.length > REPAIR_SIZE
        ? `${REPAIR_SIZE} of the ${missed.length}` : `the ${missed.length}`} you missed</button>` : ""}
      <button class="btn btn-ghost" id="spDone">Done</button>
    </div>
  </div>`);

  $$("#spInner .sp-wrong-row").forEach(b => b.onclick = () => { sprintClose(); openChar(b.dataset.c); });
  $("#spAgain").onclick = () => sprintOpen(run.mode, run.n, run.secs, run.style);
  $("#spDone").onclick = sprintClose;
  const fix = $("#spFix");
  if (fix) fix.onclick = () => { const cs = missed.map(q => q.c); sprintClose(); startRepair(cs); };
  if (best && prev) celebrate("record");
}

/* What the learner actually chose, spelled out. A bare 事 in the margin says
   nothing; "事 shì · matter" says what the confusion was. */
function sprintSaid(q) {
  if (q.got === null || q.got === undefined) return "nothing";
  const other = CHAR_INDEX[q.got];
  return other ? `<b class="han">${esc(other.c)}</b> ${esc(other.p)} · ${esc(other.m)}` : esc(q.got);
}

/* ============================================================
   The tab
   ============================================================ */

let sprintPanel = null;          /* which mode's sheet picker is open, if any */

function renderSprint() {
  const pool = knownChars().length;
  const short = pool < SPRINT_MIN_POOL;
  const trouble = sprintTrouble();
  const fluent = sprintFluent();

  $("#viewSprint").innerHTML = `<div class="wrap">
    <div class="today-head">
      <h1>Sprint</h1>
      <p class="note">A fixed number of questions and a fixed number of minutes. Finish the sheet, then find out
        what you got right. Nothing here is marked until you hand it in, and nothing here can make tomorrow's
        review queue any longer.</p>
    </div>
    ${short ? `<div class="sheet" style="padding:1rem">
      <p class="note">Sprints need at least ${SPRINT_MIN_POOL} characters to draw on — you have ${pool}.
        Learn a few more on <b>Today</b> and this opens up.</p></div>` : ""}
    <div class="cols">
      <div class="section">
        <div class="sp-panels">${["r", "w", "l"].map(m => sprintPanelHtml(m, short)).join("")}</div>
        ${sprintNotebookHtml(trouble, fluent)}
      </div>
      <div class="col-side">${sprintBoardHtml()}</div>
    </div>
  </div>`;

  $$("#viewSprint [data-sp-open]").forEach(b => b.onclick = () => {
    sprintPanel = sprintPanel === b.dataset.spOpen ? null : b.dataset.spOpen;
    renderSprint();
  });
  $$("#viewSprint [data-sp-set]").forEach(b => b.onclick = () => {
    const [mode, field, value] = b.dataset.spSet.split(":");
    const cur = sprintPick(mode);
    cur[field] = field === "style" ? value : +value;
    state.sprint.pick[mode] = cur;
    save();
    renderSprint();
  });
  $$("#viewSprint [data-sp-go]").forEach(b => b.onclick = () => {
    const m = b.dataset.spGo, p = sprintPick(m);
    sprintOpen(m, p.n, p.secs, p.style);
  });
  $$("#viewSprint .leech-open").forEach(b => b.onclick = () => openChar(b.dataset.c));
  $$("#viewSprint [data-sp-forget]").forEach(b => b.onclick = e => {
    e.stopPropagation();
    sprintForget(b.dataset.spForget);
    renderSprint();
  });
  const fix = $("#spFixFive");
  if (fix) fix.onclick = () => startRepair(trouble.slice(0, REPAIR_SIZE));
}

/* What this mode's picker is set to — last time's sheet, or a sensible first
   one: forty questions in two minutes, which is squarely a 稳 reading sheet
   and is where the arithmetic version starts children too. */
function sprintPick(mode) {
  const held = sprintState().pick[mode];
  const p = { n: 40, secs: 120, style: mode === "w" ? "type" : null, ...(held || {}) };
  if (mode === "w" && !WRITE_STYLES[p.style]) p.style = "type";
  if (mode !== "w") p.style = null;
  return p;
}

function sprintPanelHtml(mode, short) {
  const cfg = SPRINT[mode];
  const p = sprintPick(mode);
  const open = sprintPanel === mode;
  const bests = sprintBests(mode);
  const top = bests.slice().sort((a, b) => (b.right / b.n) - (a.right / a.n) || (a.secs / a.n) - (b.secs / b.n))[0];
  const g = sprintGrade(mode, p.n, p.secs, p.style);
  const silent = mode === "l" && !state.audio;
  const maxN = Math.max(...SPRINT_COUNTS.filter(n => n <= Math.max(20, sprintPool(mode).length * SPRINT_MAX_LOOPS)));

  return `<div class="sheet sp-panel ${open ? "open" : ""} sp-${mode}">
    <button class="sp-panel-head" data-sp-open="${mode}" aria-expanded="${open}">
      <span class="sp-panel-k han">${esc(cfg.zh)}</span>
      <span class="sp-panel-body">
        <b>${esc(cfg.name)}</b>
        <small>${esc(cfg.blurb)}</small>
      </span>
      <span class="sp-panel-best">${top
        ? `<b>${top.right}/${top.n}</b><small>${fmtClock(top.secs * 1000)} best</small>`
        : `<small>not run yet</small>`}</span>
    </button>
    ${open ? `<div class="sp-picker">
      <p class="note">${esc(cfg.long)}</p>
      ${silent ? `<p class="note sp-warn">Sound is off — turn it back on in Settings, or this mode has nothing to play.</p>` : ""}
      ${mode === "w" ? `<div class="sp-row">
        <span class="sp-row-lbl">How</span>
        <div class="sp-chips">${Object.values(WRITE_STYLES).map(s => `<button class="sp-chip wide ${p.style === s.key ? "on" : ""}" data-sp-set="w:style:${s.key}">
          <span class="han">${esc(s.zh)}</span> ${esc(s.name)}</button>`).join("")}</div>
      </div>
      <p class="note sp-style-note">${esc(WRITE_STYLES[p.style].blurb)}</p>` : ""}
      <div class="sp-row">
        <span class="sp-row-lbl">Questions</span>
        <div class="sp-chips">${SPRINT_COUNTS.map(n => `<button class="sp-chip ${p.n === n ? "on" : ""}"
          ${n > maxN ? "disabled title='More than this sheet can draw without repeating itself to death'" : ""}
          data-sp-set="${mode}:n:${n}">${n}</button>`).join("")}</div>
      </div>
      <div class="sp-row">
        <span class="sp-row-lbl">Minutes</span>
        <div class="sp-chips">${SPRINT_MINUTES.map(m => `<button class="sp-chip ${p.secs === m * 60 ? "on" : ""}"
          data-sp-set="${mode}:secs:${m * 60}">${m}</button>`).join("")}</div>
      </div>
      <div class="sp-verdict">
        <span class="sp-verdict-k han">${esc(g.zh)}</span>
        <span class="sp-verdict-body"><b>${esc(g.name)}</b>
          <small>${sprintPace(p.n, p.secs).toFixed(1)} seconds a question · par for ${esc(cfg.name.toLowerCase())}${p.style ? ` by ${esc(WRITE_STYLES[p.style].name.toLowerCase())}` : ""} is ${sprintPar(mode, p.style).toFixed(1)}</small></span>
      </div>
      <button class="btn btn-block" data-sp-go="${mode}" ${short ? "disabled" : ""}>Start the sheet</button>
      ${bests.length ? `<div class="sp-mini">
        <span class="eyebrow">Your sheets</span>
        ${bests.map(b => `<div class="sp-mini-row">
          <span>${b.n} in ${fmtClock(b.secs * 1000)}${b.style ? ` · ${esc(WRITE_STYLES[b.style].zh)}` : ""}</span>
          <span class="sp-mini-n"><b>${b.right}</b>/${b.n}${b.done ? ` <span class="han sp-fin">完</span>` : ""}</span>
        </div>`).join("")}
      </div>` : ""}
    </div>` : ""}
  </div>`;
}

function sprintNotebookHtml(trouble, fluent) {
  const fixable = trouble.slice(0, REPAIR_SIZE);
  return `<div class="sheet sp-book">
    <div class="stack" style="gap:.7rem">
      <div class="sec-head">
        <span class="eyebrow"><span class="han">错字本</span> Mistake notebook</span>
        <span class="dim" style="font-size:.76rem">${trouble.length} open</span>
      </div>
      ${trouble.length ? `
        <p class="note">Characters you keep getting wrong under time. A repair round takes them slowly and from
          every side — see it, hear it, pick it, use it — and one leaves this page after ${SPRINT_CLEAR} right
          answers in a row, wherever you get them.</p>
        <div class="leech-list">${trouble.slice(0, 24).map(c => {
          const worst = sprintByMode(c).filter(x => x.miss).sort((a, b) => b.miss - a.miss)[0];
          return `<span class="leech sp-leech">
            <button class="leech-open" data-c="${esc(c)}"><span class="z">${esc(c)}</span>
              <span class="n">${sprintMisses(c) || rec(c).wrong}</span> ${worst ? esc(SPRINT[worst.mode].zh) : "missed"}
              ${rightRun(c) ? `<span class="sp-run">${rightRun(c)}/${SPRINT_CLEAR}</span>` : ""}</button>
            <button class="sp-forget" data-sp-forget="${esc(c)}" title="I've got this one — take it off the page" aria-label="Remove ${esc(c)}">✓</button>
          </span>`;
        }).join("")}</div>
        <button class="btn btn-seal btn-block" id="spFixFive">Repair round — the ${fixable.length} worst</button>`
      : `<p class="note">Nothing on this page. Characters land here when you miss them twice under time, or when
          you've been missing them more often than getting them anywhere in the app.</p>`}
      ${fluent.length ? `<div class="sp-fluent">
        <span class="eyebrow"><span class="han">熟字</span> Cold, at speed</span>
        <p class="note">${fluent.length} character${fluent.length === 1 ? "" : "s"} answered right ${SPRINT_FLUENT}+ times running under the clock.</p>
        <div class="sp-fluent-row">${fluent.slice(0, 40).map(c => `<button class="sp-fl leech-open" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      </div>` : ""}
    </div>
  </div>`;
}

function sprintBoardHtml() {
  const runs = sprintRecent().slice(0, 8);
  const total = sprintTotal();
  return `<div class="sheet" style="padding:1rem">
    <div class="stack" style="gap:.7rem">
      <span class="eyebrow"><span class="han">记录</span> The board</span>
      ${runs.length ? `<div class="sp-board">
        ${runs.map(r => {
          const cfg = SPRINT[r.mode];
          const b = sprintState().best[sheetKey(r)];
          const isBest = !!b && b.at === r.at;
          return `<div class="sp-board-row ${isBest ? "best" : ""}">
            <span class="sp-board-k han">${esc(cfg.zh)}</span>
            <span class="sp-board-body"><b>${r.right} / ${r.n}</b>
              <small>${fmtClock(r.secs * 1000)} sheet · ${esc(r.on)}${r.done ? " · finished" : ` · ${r.n - r.answered} blank`}</small></span>
            ${isBest ? `<span class="sp-board-star" title="Your best on this sheet">★</span>` : ""}
          </div>`;
        }).join("")}
      </div>
      <p class="note">${total} question${total === 1 ? "" : "s"} answered against the clock, all told.
        The times to beat are your own — nothing here leaves this device.</p>`
      : `<p class="note">No sheets yet. The board fills with every run, and a ★ marks the best you've done on
        a given size.</p>`}
    </div>
  </div>`;
}
