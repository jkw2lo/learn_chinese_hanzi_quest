/* ============================================================
   State, scheduling and persistence.

   Progress lives in localStorage so the app works instantly and
   offline. When the page is published as an Artifact with the `db`
   capability, the same record also syncs to the viewer's private
   store so a streak survives switching devices.
   ============================================================ */

const KEY = "hanzi-quest-v1";

/* Leitner-ish intervals, in days, indexed by level. */
const INTERVALS = [1, 1, 2, 4, 8, 16, 35, 75, 150];
const MAX_LVL = INTERVALS.length - 1;

/* ---------- dates ---------- */

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}
function daysBetween(a, b) {
  const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 864e5);
}

/* ---------- pinyin → tone ---------- */

const TONE_MAP = {
  "ā":1,"ē":1,"ī":1,"ō":1,"ū":1,"ǖ":1,
  "á":2,"é":2,"í":2,"ó":2,"ú":2,"ǘ":2,
  "ǎ":3,"ě":3,"ǐ":3,"ǒ":3,"ǔ":3,"ǚ":3,
  "à":4,"è":4,"ì":4,"ò":4,"ù":4,"ǜ":4
};
function toneOf(pinyin) {
  for (const ch of pinyin) if (TONE_MAP[ch]) return TONE_MAP[ch];
  return 5; /* neutral */
}

/* ---------- state ---------- */

const blank = () => ({
  v: 1,
  chars: {},
  days: {},
  streak: { cur: 0, best: 0, last: null },
  goalNew: 5,
  quest: "menu",
  started: dayKey(),
  audio: true,
  voice: null,
  timer: true,
  tour: false,
  writeDrills: true,
  /* Which of the two Go-deeper writing tiles the merged card currently
     shows — "write" (one character) or "write2" (a compound word). See the
     toggle in renderToday, js/app.js. */
  writeVariant: "write",
  /* how the four answers are laid out: "auto" lets the window decide, "row"
     and "grid" overrule it — see optColsEffective in app.js */
  optCols: "auto",
  padAuto: false,
  /* Whether a sheet marks itself as you go — see flashVerdict. A sheet was
     built to withhold that: you hand it in and find out, which is what makes
     it a test rather than a drill. The wash made telling you possible, and
     some people would rather know, so it is a choice and not a decision. */
  spTell: true,
  hailed: [],           /* milestones already celebrated — see MILESTONES */
  menuTaught: [],       /* the side quest's own book — see menuCanRead() */
  /* Keyed by id, like chars and days — not a list. B1 in porting.md is what a
     list costs when something merges it the wrong way; a song never needs to
     be that, since nothing about it is positional. See mergeState. */
  songs: {},
  sprint: { marks: {}, runs: [], best: {}, pick: {} },
  name: "",
  interests: [],
  profiled: false,
  intro: false,         /* the four-stage introduction has been through once */
  level: null,          /* what they said they could already read, in the introduction */
  levelAsked: false,    /* the one-off "take the check?" on the first session */
  updated: Date.now()
});

let state = blank();

/* Names are capitalised: each word, and after a hyphen or an apostrophe, so
   mary-jane becomes Mary-Jane and o'brien becomes O'Brien. The REST of each
   word is left exactly as typed — otherwise McRae and van der Berg get broken
   in the name of tidiness.

   Declared here in srs.js rather than in app.js because load() needs it too:
   records written before this existed carry whatever was typed, and the
   greeting says it back every morning. One rule, both paths. */
const capName = s => String(s || "").trim()
  .replace(/(^|[\s\-'\u2019])(\p{L})/gu, (m, sep, first) => sep + first.toLocaleUpperCase());

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
    if (!(state.goalNew >= GOAL_MIN && state.goalNew <= GOAL_MAX)) state.goalNew = blank().goalNew;
    /* An imported backup is whatever was in the file, and a record synced by a
       version with the unionKeys bug in it holds an object here. The quest
       reads this on every render and a non-array takes the dashboard down
       with it. Repaired rather than emptied — see asList. */
    state.menuTaught = asList(state.menuTaught);
    state.hailed = asList(state.hailed);
    if (state.name) state.name = capName(state.name);
    fillInterests();
  } catch { /* private mode, cleared storage — carry on with a fresh record */ }
  return state;
}

let saveTimer = null;
function save() {
  state.updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushRemote, 1500);
}

/* Start again, leaving nothing behind.

   This was `Object.assign(state, blank())`, which only overwrites the keys
   blank() happens to declare — so everything the record grew afterwards
   survived the wipe: the day's menu pick (`menuPick`), the last-backup stamp,
   and whatever the next feature adds. Replacing the binding outright is the
   only version that stays correct as the shape of the record changes. The
   caller clears the practice diary, which lives in IndexedDB, separately. */
function resetProgress() {
  state = blank();
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  save();                                /* writes the blank record, and syncs it */
  return state;
}

/* ---------- merging two records of the same person ----------

   Last write wins is the right rule for a setting and the wrong rule for work.
   A morning on the phone and an afternoon on the laptop are both real; whichever
   pushed second would erase the other, and the thing erased would be the thing
   the person actually did. So preferences follow the clock and anything earned
   is unioned.

   What makes the union safe is that everything counted here only ever goes up.
   `seen`, `right`, `wrong`, `skills` and `shown` are incremented in grade() and
   reset nowhere, so max() of two counts of the same monotonic thing is the true
   count — the only way to overcount would be to record one session twice, and a
   session happens on one device.

   `lvl` and `due` are the exception, and are not counts: they are a position in
   a review queue. Maxing them would invent a schedule neither device had, so
   they come as a pair from whichever record was written later. */

const day = d => String(d || "");
const laterDay = (a, b) => (day(a) >= day(b) ? day(a) : day(b)) || null;
const earlierDay = (a, b) => (!a ? b : !b ? a : (day(a) <= day(b) ? a : b)) || null;
const bigger = (a, b) => Math.max(a || 0, b || 0);

const CH_COUNTS = ["seen", "right", "wrong"];
const CH_SKILLS = ["r", "p", "c", "w"];

function mergeChar(x, y) {
  if (!x) return y;
  if (!y) return x;
  /* the later sighting carries the schedule: the other device's queue has
     since moved on, and its lvl/due are a snapshot of a queue that no longer
     exists */
  const lead = day(y.last) >= day(x.last) ? y : x;
  const out = Object.assign({}, lead);
  CH_COUNTS.forEach(k => out[k] = bigger(x[k], y[k]));
  out.skills = {}; out.shown = {};
  CH_SKILLS.forEach(k => {
    out.skills[k] = bigger(x.skills && x.skills[k], y.skills && y.skills[k]);
    out.shown[k] = bigger(x.shown && x.shown[k], y.shown && y.shown[k]);
  });
  out.first = earlierDay(x.first, y.first);
  out.last = laterDay(x.last, y.last);
  return out;
}

/* A day's tally is counts and a set of characters revised. Both union. */
function mergeDay(x, y) {
  if (!x) return y;
  if (!y) return x;
  const out = Object.assign({}, x, y);
  /* Every count on a day record merges by the larger side, not a sum — two
     devices that each logged a morning before ever syncing would otherwise
     double it. `sp`, `ms` and `sessions` were missing from this list, which
     left them to Object.assign's plain "y wins": whichever side merged in
     last silently overwrote the other's count instead of keeping the bigger
     one. Same bug as B1 in porting.md, smaller — a lost tally, not a broken
     page — caught here while adding `ms` and `sessions` rather than repeating it. */
  ["new", "rev", "ahead", "extra", "sp", "spr", "ms", "sessions"].forEach(k => {
    if (x[k] !== undefined || y[k] !== undefined) out[k] = bigger(x[k], y[k]);
  });
  if (x.revC || y.revC) out.revC = unionKeys(x.revC, y.revC);
  return out;
}

/* Every key from both sides, in a fixed order.

   Sorted, and not for tidiness: the merged record is serialised to compare it
   against the local one and again to write it to the remote. Keys arriving in
   whichever order the arguments happened to be in would make two identical
   records compare as different — a repaint on every pull, and a write on every
   load. Dates sort chronologically as a bonus. */
const mergeBy = (x = {}, y = {}, f) => {
  const out = {};
  for (const k of [...new Set([...Object.keys(x), ...Object.keys(y)])].sort()) out[k] = f(x[k], y[k]);
  return out;
};
/* a plain union of two flag objects, in the same fixed order — Object.assign
   would keep whichever order the arguments arrived in */
const unionKeys = (x, y) => mergeBy(x, y, (a, b) => (b === undefined ? a : b));

/* A list that has been through unionKeys, read back as a list.

   `menuTaught` is a list of characters and was being merged with unionKeys,
   which is for keyed flags: it walks Object.keys and hands back a plain
   object. So ["菜"] came out of a sync as {"0":"菜"}, [] came out as {}, and
   the next thing to call `.includes` on it threw — which on this record is
   taughtHere, which is menuCanRead, which is menuProgress, which is every
   row of today's list, Go deeper, and the screen at the end of a session.
   One sign-in was enough to do it, and nothing in the app could recover
   because load() normalises on load and the merge runs after.

   Fixed at the merge below. This stays because the wreckage is already
   written to people's records and to the remote document, and it keeps the
   characters rather than resetting the list: somebody who learnt 菜 from the
   menu before signing in still learnt it. */
const asList = v => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);

/* x is the older record and y the newer, so the preferences in here resolve by
   the clock rather than by which way round the caller happened to pass them */
function mergeSprint(x = {}, y = {}) {
  const out = {};
  /* a mark is [right, wrong] per mode plus `s`, a rolling window of the last
     few results — the window is a recent history, so it comes from one device
     whole rather than being interleaved into a sequence that never happened */
  out.marks = mergeBy(x.marks, y.marks, (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const total = m => ["l", "r", "w", "a"].reduce((n, k) => n + ((m[k] || [0, 0])[0] + (m[k] || [0, 0])[1]), 0);
    const lead = total(b) >= total(a) ? b : a;
    const m = Object.assign({}, lead);
    ["l", "r", "w", "a"].forEach(k => {
      if (a[k] || b[k]) m[k] = [bigger((a[k] || [])[0], (b[k] || [])[0]),
                                bigger((a[k] || [])[1], (b[k] || [])[1])];
    });
    return m;
  });
  out.best = mergeBy(x.best, y.best, (a, b) => (!b ? a : !a ? b : (beats(a, b) ? a : b)));
  out.cleared = unionKeys(x.cleared, y.cleared);
  /* every finished sheet from both devices, newest first, deduped on the
     millisecond it was recorded */
  const seen = new Set();
  out.runs = [...(x.runs || []), ...(y.runs || [])]
    .filter(r => r && !seen.has(r.at) && seen.add(r.at))
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, SPRINT_RUNS_KEPT);
  /* the sheet settings last chosen — a preference, so the later device's copy
     wins, which is why mergeState hands these over in clock order */
  out.pick = unionKeys(x.pick, y.pick);
  return out;
}

function mergeState(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = (b.updated || 0) >= (a.updated || 0) ? b : a;
  const older = newer === a ? b : a;

  /* settings, name, interests, the day's menu pick: answers rather than
     accumulations, so the clock decides */
  const out = Object.assign(blank(), older, newer);

  out.chars = mergeBy(a.chars, b.chars, mergeChar);
  out.days = mergeBy(a.days, b.days, mergeDay);
  /* A song is imported (or edited) whole, not built up over time the way a
     character's record is — so there is nothing to accumulate, only a pick
     between two copies of the same id, by whichever was touched more
     recently. `edited` and not `added`: `added` never changes once a song is
     created, so an edit on one device and no edit on the other would
     otherwise tie on `added` and be decided by argument order rather than by
     which side actually holds the edit. */
  const songStamp = s => s.edited || s.added || 0;
  out.songs = mergeBy(a.songs, b.songs, (x, y) => (!y ? x : !x ? y : (songStamp(y) >= songStamp(x) ? y : x)));
  out.sprint = mergeSprint(older.sprint, newer.sprint);
  /* by value, like `hailed` below it — both are lists, not flag objects */
  out.menuTaught = [...new Set([...asList(a.menuTaught), ...asList(b.menuTaught)])];
  out.hailed = [...new Set([...asList(a.hailed), ...asList(b.hailed)])].sort((x, y) => x - y);
  out.streak = {
    /* a best is a claim about the past and cannot be undone by the other
       device not knowing about it */
    best: bigger(a.streak && a.streak.best, b.streak && b.streak.best),
    cur: (newer.streak || {}).cur || 0,
    last: laterDay(a.streak && a.streak.last, b.streak && b.streak.last)
  };
  out.started = earlierDay(a.started, b.started);
  out.lastBackup = bigger(a.lastBackup, b.lastBackup) || null;
  out.placed = (a.placed && b.placed)
    ? (bigger(a.placed.known, b.placed.known) === (a.placed.known || 0) ? a.placed : b.placed)
    : (a.placed || b.placed || null);
  out.updated = Math.max(a.updated || 0, b.updated || 0);
  return out;
}

/* ---------- optional cross-device sync ----------

   One document per person, holding the whole record. Two providers can supply
   it and neither is required: `window.claude` when this app runs inside a
   Claude artifact, and js/sync.js when a Firebase project has been configured.
   Both hand over the same tiny shape — an object with get() and set() — so
   everything below is written once.

   With no provider at all, remoteDoc stays null, pushRemote is a no-op and the
   app is exactly the localStorage-only app it was. */

let remoteDoc = null;
let onRemoteChange = null;             /* set by app.js, so a pull can repaint */

/* Hand the record a document to sync against. Returns whether the local state
   changed as a result, so the caller knows whether to re-render. */
async function useRemote(doc) {
  remoteDoc = doc;
  if (!doc) return false;
  try {
    const snap = await doc.get();
    const remote = snap && snap.exists ? snap.data() : null;
    if (remote) {
      const merged = mergeState(state, remote);
      const changed = JSON.stringify(merged) !== JSON.stringify(state);
      state = merged;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
      /* push unconditionally: even when nothing changed locally, the remote is
         missing whatever this device knew that it didn't */
      pushRemote();
      return changed;
    }
    pushRemote();
  } catch { remoteDoc = null; }
  return false;
}

function dropRemote() { remoteDoc = null; }

async function connectRemote() {
  if (!window.claude?.use) return false;
  try {
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db) return false;
    const uid = user ? await user.id() : null;
    return await useRemote(db.doc(`data/users/${uid || "me"}/progress`));
  } catch { remoteDoc = null; }
  return false;
}

async function pushRemote() {
  if (!remoteDoc) return;
  try { await remoteDoc.set(JSON.parse(JSON.stringify(state))); } catch { /* offline or refused */ }
}

/* ---------- per-character record ---------- */

function rec(c) {
  return state.chars[c] || null;
}
function ensure(c) {
  if (!state.chars[c]) {
    state.chars[c] = {
      lvl: 0, due: dayKey(), seen: 0, right: 0, wrong: 0,
      skills: { r: 0, p: 0, c: 0, w: 0 },  /* clean answers: recognise, pinyin, recall, write */
      shown: { r: 0, p: 0, c: 0, w: 0 },   /* times asked at all, right or wrong */
      first: dayKey(), last: dayKey()
    };
  }
  /* records written before `shown` existed */
  if (!state.chars[c].shown) state.chars[c].shown = { r: 0, p: 0, c: 0, w: 0 };
  return state.chars[c];
}

/* How many times this character has come up in this mode, however it went.
   `skills` counts only the clean answers, which is the wrong measure for
   deciding what to show next: a character you keep getting wrong would stay
   at the front of the queue forever. */
const shownIn = (c, skill) => {
  const r = rec(c);
  return (r && r.shown && r.shown[skill]) || 0;
};

const isKnown  = c => !!state.chars[c];
const isDue    = c => { const r = rec(c); return r && r.due <= dayKey(); };
function strength(c) {
  const r = rec(c);
  if (!r) return "locked";
  if (isDue(c)) return "due";
  if (r.lvl >= 5) return "strong";
  return "learning";
}

/* ---------- grading ---------- */

function grade(c, correct, skill, opts = {}) {
  const r = ensure(c);
  /* Both kinds of extra work reinforce without rescheduling. */
  const extra = opts.practice || opts.speed;
  r.seen++;
  r.last = dayKey();
  if (skill && r.shown[skill] !== undefined) r.shown[skill]++;
  if (correct) {
    r.right++;
    if (skill && r.skills[skill] !== undefined) r.skills[skill]++;
    /* Extra practice reinforces and counts toward the skill bars, but it
       doesn't push the review date out — drilling a card early shouldn't
       delay the review you actually needed. Getting it wrong still does. */
    if (!extra || r.due <= dayKey()) {
      r.lvl = Math.min(MAX_LVL, r.lvl + 1);
      r.due = addDays(dayKey(), INTERVALS[r.lvl]);
    }
  } else if (opts.speed) {
    /* A sprint. Racing produces slips that say nothing about whether you know
       the character — you knew it, you were two hundred milliseconds late
       reading the fourth option. So a miss here is recorded and counted, and
       goes into the 错字本 where it can be worked on properly, but it never
       demotes the character or drags it back into today's queue. The same
       rule as Go deeper, for the same reason: a mode you choose to do extra
       must not be able to make tomorrow worse. */
    r.wrong++;
  } else if (opts.gentle) {
    /* Handwriting. Failing to produce 学 from memory says little about
       whether you can read it, and a stroke can simply fail to register on a
       trackpad — so a miss here records the attempt and withholds the skill
       credit, but never demotes the character or drags it back to today. */
    r.wrong++;
    r.due = addDays(dayKey(), INTERVALS[r.lvl]);
  } else {
    r.wrong++;
    r.lvl = Math.max(0, r.lvl - 2);
    r.due = dayKey();            /* comes round again today */
  }
  save();
  return r;
}

function introduce(c) {
  const r = ensure(c);
  r.due = addDays(dayKey(), 1);
  save();
  return r;
}

/* ---------- daily tally and streak ---------- */

function today() {
  const k = dayKey();
  if (!state.days[k]) state.days[k] = { new: 0, rev: 0 };
  return state.days[k];
}

/* `rev` counts answers, which is the right unit for the activity heatmap — a
   day of forty reps was a bigger day than one of four. It is the wrong unit
   for "reviewed today": a character you saw four times in one session is one
   character revised, not four, and counting it four times made the number
   race ahead of the queue it was sitting next to. So the characters
   themselves are recorded alongside the rep count. */
function tally(kind, ch) {
  const t = today();
  t[kind]++;
  if (kind === "rev" && ch) (t.revC = t.revC || {})[ch] = true;
  touchStreak();
  save();
}

const reviewedToday = () => Object.keys((state.days[dayKey()] || {}).revC || {});

/* ---------- extra practice: reps, counted like reps ----------

   Today's list is a finishable checklist and closes. Go deeper is the
   opposite — unbounded, never "done", and the place where repetition actually
   happens. A checklist tick is the wrong reward for that: you want to see the
   pile grow. So extra reps are counted separately from everything else and
   never touch the day's completion. */
function tallyExtra() {
  const t = today();
  t.extra = (t.extra || 0) + 1;
  touchStreak();
  save();
}

const extraToday = () => (state.days[dayKey()] || {}).extra || 0;
const extraTotal = () => Object.values(state.days).reduce((a, d) => a + (d.extra || 0), 0);
const extraBestDay = () => Object.values(state.days).reduce((a, d) => Math.max(a, d.extra || 0), 0);
const extraDays = () => Object.values(state.days).filter(d => d.extra > 0).length;

/* ---------- time and activities, for the tracker ----------

   Not required for anything the SRS schedule reads — this is entirely for
   the tracker, so a learner can see how much they actually did. Time is
   summed per question rather than by timing a whole session end to end: a
   session can be left open, backgrounded, or closed without ever reaching
   endSession, and a per-question tally survives all three the same way `rev`
   and `extra` already do. Each question's contribution is capped — a tab
   left open overnight is a bug in this number, not three hundred minutes of
   studying. */
const STUDY_MS_CAP = 3 * 60 * 1000;
/* `cap` defaults to guarding a single question against a backgrounded tab,
   but a sprint sheet's own elapsed time is already bounded by its configured
   length (recordRun does the same Math.min against sp.secs) — passed its own
   value back as the cap there makes this a no-op ceiling rather than a
   second, tighter one that would clip a real five-minute sheet to three. */
function tallyTime(ms, cap = STUDY_MS_CAP) {
  if (!(ms > 0)) return;
  const t = today();
  t.ms = (t.ms || 0) + Math.min(ms, cap);
  save();
}
/* One activity = one session, practice round, repair round, or sprint sheet
   that ran to a close — counted where each of those already funnels through
   a single function (endSession, sprintFinish) on the way out, rather than
   at every place one can be started, which is exactly the list `startTodayDrill`
   once fell off (see X2 in porting.md). */
function tallySession() {
  const t = today();
  t.sessions = (t.sessions || 0) + 1;
  save();
}
const timeToday = () => (state.days[dayKey()] || {}).ms || 0;
const timeTotal = () => Object.values(state.days).reduce((a, d) => a + (d.ms || 0), 0);
const sessionsToday = () => (state.days[dayKey()] || {}).sessions || 0;

/* ---------- studying ahead ----------

   "Study ahead — 5 more characters" used to do `state.goalNew += 5`, which is
   the setting, not the day. So one click on a Tuesday quietly rewrote "new
   characters a day" from 5 to 10 and left it there: Wednesday dealt ten, the
   settings stepper read 10, and clicking again made it 15. What the button
   means is "give me more today", so the extra is kept on the day and is gone
   with it. */
const aheadToday = () => (state.days[dayKey()] || {}).ahead || 0;
function studyAhead(n) {
  const t = today();
  t.ahead = (t.ahead || 0) + n;
  save();
}

/* Today's target: the standing setting, plus anything asked for on top of it
   today. This is a *target*, not a batch size — see newLeftToday(). */
const dayGoal = () => state.goalNew + aheadToday();

/* How many new characters are still owed today, and the only number allowed to
   decide how many a session deals.

   Getting this wrong is what made "Study ahead" run away even after the extra
   stopped touching the setting. nextNew(n) returns the next n characters you
   have *never seen*, so it has no idea what today already taught you: dealing
   nextNew(dayGoal()) on a finished day of five handed out ten more, not five.
   Click, finish, click, finish and the day went 5 → 15 → 30 → 50, with the
   hero counting down a different number from the one the session dealt. One
   function now answers both. */
const newLeftToday = () =>
  Math.max(0, Math.min(dayGoal(), remainingNew()) - today().new);

/* The stepper's own range. A stored goalNew outside it cannot have come from a
   person — it is wreckage from the version that did `goalNew += 5` — so it
   goes back to the default on load rather than sitting at a number nobody
   chose and the stepper cannot walk back down to. */
const GOAL_MIN = 1, GOAL_MAX = 30;

function touchStreak() {
  const k = dayKey();
  const s = state.streak;
  if (s.last === k) return;
  if (s.last && daysBetween(s.last, k) === 1) s.cur++;
  else s.cur = 1;
  s.last = k;
  if (s.cur > s.best) s.best = s.cur;
}

/* Which of today's practice tasks are ticked off. */
function markDone(id) {
  const t = today();
  (t.did = t.did || {})[id] = true;
  /* HQDIAG rather than hqNote: this file loads before app.js, and the row
     that ticks itself is one of the things worth being able to look back at. */
  if (window.HQDIAG) HQDIAG.note("did", id);
  save();
}
const didToday = id => !!(state.days[dayKey()] && state.days[dayKey()].did && state.days[dayKey()].did[id]);

/* A streak only stands if you studied today or yesterday. */
function liveStreak() {
  const s = state.streak;
  if (!s.last) return 0;
  const gap = daysBetween(s.last, dayKey());
  return gap <= 1 ? s.cur : 0;
}

/* Deliberately the standing goal and not dayGoal(): asking for five more
   characters is extra credit, and extra credit cannot take back a day you had
   already finished — or the streak that came with it. */
function goalMet() {
  const t = state.days[dayKey()];
  if (!t) return false;
  return t.new + t.rev > 0 && t.new >= Math.min(state.goalNew, remainingNew()) && dueCount() === 0;
}

/* ---------- queues ---------- */

function dueList() {
  const k = dayKey();
  return Object.keys(state.chars)
    .filter(c => state.chars[c].due <= k)
    .sort((a, b) => state.chars[a].lvl - state.chars[b].lvl);
}
const dueCount = () => dueList().length;

/* New characters come in curriculum order — the order is the teaching.
   The menu side quest runs on its own daily thread and never reorders this. */
function nextNew(n) {
  const out = [];
  const ceiling = unlockedCeiling();
  for (const ch of HQ) {
    if (out.length >= n) break;
    if (ch.i >= ceiling) break;              /* the tier gate, not just an ordering */
    if (!state.chars[ch.c]) out.push(ch.c);
  }
  return out;
}
/* What is left that you're actually allowed to start on. Counting the whole
   library here would promise "study ahead" sessions the gate then refuses. */
const remainingNew = () => HQ.slice(0, unlockedCeiling()).filter(ch => !state.chars[ch.c]).length;

/* Nothing chosen means everything.

   The word of the week is purely a reward — it never changes what is taught or
   when — so an empty interest list has no upside at all: it just means the card
   sits there explaining why it is empty. Nobody should ever meet that card. On
   save, on skip, and here on load for the records that already exist. */
function fillInterests() {
  if (!(state.interests || []).filter(k => INTERESTS[k]).length)
    state.interests = [...INTEREST_KEYS];
  return state.interests;
}

/* ---------- milestones ----------

   Every hundredth character, and the last one, get a moment. The list is
   deliberately coarse: a library of 763 gives eight of these, which is often
   enough to look forward to and rare enough that one still means something.
   Every fifty would give fifteen and each would mean half as much.

   `hailed` records what has been celebrated rather than deriving it from the
   count, because the count goes down as well as up — a reset, or a character
   removed from the curriculum — and nobody should be congratulated twice for
   the same hundred. */
const MILESTONES = [100, 200, 300, 400, 500, 600, 700, HQ.length];
const hailed = () => (state.hailed = asList(state.hailed));

/* The HIGHEST milestone reached and not yet celebrated, not the lowest. The
   placement test can credit three hundred characters in one go, and a queue
   of overlays to click through would turn the moment into a chore. */
function milestoneDue() {
  const n = knownChars().length;
  const due = MILESTONES.filter(m => n >= m && !hailed().includes(m));
  return due.length ? due[due.length - 1] : null;
}

/* Marking one marks everything below it, so the ones jumped over do not queue
   up and surface one at a time over the next eight sessions. */
function markMilestone(m) {
  MILESTONES.forEach(x => { if (x <= m && !hailed().includes(x)) hailed().push(x); });
  save();
}

/* ---------- word of the week ----------

   The curriculum order is fixed and impersonal by design — you learn 的 and 是
   before anything you would have chosen, because everything else is built on
   them. This runs beside it rather than through it: one real word a week from
   whatever you said you cared about, usually made of characters well past where
   you have reached.

   It is deliberately not a drill. Nothing here is scheduled, graded, counted,
   or added to the review queue — the moment it becomes homework it stops being
   the thing that makes you want to keep going.

   The pick is stable for the whole week (an ISO week key seeds it) and won't
   repeat until everything in your chosen interests has had a turn. */

function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);          /* to the Thursday of this week */
  const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - jan1) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/* The Monday and Sunday bounding a date, so "is the festival this week"
   has a definite answer. */
function weekBounds(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));           /* back to Monday */
  const end = new Date(t); end.setDate(end.getDate() + 6);
  return [t, end];
}

/* When a festival falls in a given year, or null if we can't say. Fixed-date
   ones are trivial; the lunar ones are tabled, and a year outside the table
   simply doesn't fire rather than guessing. */
function festivalDate(f, year) {
  if (f.on) {
    const [m, d] = f.on.split("-").map(Number);
    return new Date(year, m - 1, d);
  }
  if (f.lunar) {
    const v = f.lunar[year];
    if (!v) return null;
    const [m, d] = v.split("-").map(Number);
    return new Date(year, m - 1, d);
  }
  if (f.lunarOffset) {
    const base = FESTIVALS.find(x => x.key === f.lunarOffset.from);
    const bd = base && festivalDate(base, year);
    if (!bd) return null;
    const out = new Date(bd);
    out.setDate(out.getDate() + f.lunarOffset.days);
    return out;
  }
  return null;
}

/* Whichever festival lands inside this week. Checking the neighbouring years
   too, since the week of 30 December contains 1 January. */
function festivalThisWeek(d = new Date()) {
  const [from, to] = weekBounds(d);
  for (const f of FESTIVALS) {
    for (const y of [from.getFullYear(), to.getFullYear()]) {
      const fd = festivalDate(f, y);
      if (fd && fd >= from && fd <= to) return f;
    }
  }
  return null;
}

/* What has been shown before, ever. Festival words in particular must not
   come round again next year, so this history is never wiped — only the
   interest pool is allowed to cycle once it is exhausted. */
const wotwSeen = () => new Set(state.wotwPast || []);

function rememberWord(key) {
  state.wotwPast = [...(state.wotwPast || []), key].slice(-600);
}

function wordOfWeek(d = new Date()) {
  const wk = weekKey(d);
  const held = state.wotw;
  if (held && held.week === wk) {
    const src = held.fest ? FESTIVALS.find(f => f.key === held.fest) : INTERESTS[held.cat];
    if (src && src.words[held.i]) return held;
  }

  const seen = wotwSeen();
  let choice = null;

  /* a festival in this week wins over anything the interests would offer */
  const fest = festivalThisWeek(d);
  if (fest) {
    const fresh = fest.words.map((_, i) => i).filter(i => !seen.has(`f:${fest.key}:${i}`));
    /* every one already used — this festival has come round more times than it
       has words, so start again from the one seen longest ago */
    const pool = fresh.length ? fresh : fest.words.map((_, i) => i);
    const idx = fresh.length
      ? pool[hashOf(wk) % pool.length]
      : pool.reduce((best, i) => {
          const at = (state.wotwPast || []).lastIndexOf(`f:${fest.key}:${i}`);
          return best === null || at < best.at ? { i, at } : best;
        }, null).i;
    choice = { week: wk, fest: fest.key, i: idx };
  } else {
    const cats = (state.interests || []).filter(k => INTERESTS[k]);
    if (!cats.length) return null;
    const all = [];
    cats.forEach(k => INTERESTS[k].words.forEach((_, i) => all.push(`${k}:${i}`)));
    let fresh = all.filter(x => !seen.has(x));
    if (!fresh.length) {
      /* been through every word in every interest — let them cycle */
      state.wotwPast = (state.wotwPast || []).filter(x => x.startsWith("f:"));
      fresh = all;
    }
    const [cat, i] = fresh[hashOf(wk) % fresh.length].split(":");
    choice = { week: wk, cat, i: +i };
  }

  state.wotw = choice;
  rememberWord(choice.fest ? `f:${choice.fest}:${choice.i}` : `${choice.cat}:${choice.i}`);
  save();
  return choice;
}

/* a stable hash, so the pick doesn't wander between reloads in the same week */
const hashOf = str => [...str].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

/* Resolve a pick to the thing it points at. */
function wotwEntry(w) {
  if (!w) return null;
  const src = w.fest ? FESTIVALS.find(f => f.key === w.fest) : INTERESTS[w.cat];
  if (!src || !src.words[w.i]) return null;
  return { src, word: src.words[w.i], festival: !!w.fest };
}

/* ---------- placement ----------

   The first version sampled — five characters stood for twenty — and credited
   the whole range. Two things were wrong with that, and the second was worse.

   It guessed. Most of what it credited was never shown, so "we found your
   level" really meant "we assumed you knew seventy characters we never asked
   about".

   And it dumped. Everything credited went into the review queue, so being
   placed at 100 meant opening the app to sixty-two cards on day one, a
   mixture of characters you knew cold and characters you had never seen. That
   is the worst possible first session: too long, and too uneven to be either
   satisfying or useful.

   So now it walks every character in curriculum order and stops once you have
   missed more than PLACE_MISS_LIMIT of them. Nothing is inferred: a character
   is credited if and only if you answered it correctly.

   And credit does not mean homework. A credited character goes into the
   library as **known** — it counts for tier progress, it turns up in Go deeper,
   it inks itself in sentences and vocabulary, exactly as if you had learnt it
   in some earlier session. What it does not do is land in tomorrow's queue.
   Its first review sits PLACED_REST days out, fanned across PLACED_FAN more,
   so day one is what it should be for everybody: five new characters. */

const PLACE_MISS_LIMIT = 3;    /* stop once misses go past this */
const PLACED_LVL = 4;
const PLACED_REST = 12;        /* days before a credited character is first checked */
const PLACED_FAN = 24;         /* and the spread after that */

/* The last few before you started missing are the shakiest things you got
   right — you were at the edge of what you know. They come back within the
   week rather than in a month: the refresher, without the backlog. */
const PLACE_TAIL = 12;
const TAIL_REST = 3;
const TAIL_FAN = 5;

/* Credit exactly what was answered correctly, and nothing else. */
function placeKnown(chars) {
  const k = dayKey();
  const list = [...chars].filter(c => CHAR_INDEX[c] && !state.chars[c]);
  let added = 0;
  list.forEach((c, i) => {
    const r = ensure(c);
    const tail = i >= list.length - PLACE_TAIL;
    r.lvl = tail ? Math.max(1, PLACED_LVL - 2) : PLACED_LVL;
    r.placed = true;
    r.seen = 1; r.right = 1;
    r.skills.r = 1;              /* it was a recognition question, and you got it */
    r.shown.r = 1;
    r.due = tail ? addDays(k, TAIL_REST + (i % TAIL_FAN))
                 : addDays(k, PLACED_REST + (i % PLACED_FAN));
    added++;
  });
  const last = list.length ? CHAR_INDEX[list[list.length - 1]].i + 1 : 0;
  state.placed = {
    on: k,
    at: Math.max(last, (state.placed && state.placed.at) || 0),
    known: ((state.placed && state.placed.known) || 0) + added
  };
  save();
  return added;
}

const wasPlaced = () => !!state.placed;

/* ---------- sticking points ----------
   A character you keep missing isn't going to yield to another repetition of
   the same drill. Flag it so it can be looked at properly instead. */

const LEECH_MISSES = 5;

function isLeech(c) {
  const r = rec(c);
  return !!r && r.wrong >= LEECH_MISSES && r.wrong >= r.right;
}
const leeches = () => Object.keys(state.chars)
  .filter(c => CHAR_INDEX[c] && isLeech(c))
  .sort((a, b) => state.chars[b].wrong - state.chars[a].wrong);

/* ---------- practice: extra reps, weakest first ---------- */

/* ---------- what a round of extra practice draws on ----------

   Sorting the whole library by weakness and taking the top N stopped working
   once the library got big: the same forty characters were always the weakest,
   so the same forty came round every time, and the hundred behind them were
   never seen again.

   Two rules fix it.

   Most of a round is what you have learned recently, because that is what is
   actually at risk of slipping — RECENT_SHARE of it, drawn from the last
   RECENT_WINDOW characters you were introduced to. The rest reaches back into
   everything older, so the early stages don't rot.

   And within either group, what comes up is what has come up *least* — by
   `shown`, the count of times a character has been asked in this mode at all.
   Weakness breaks the tie, not the other way round: ordering by weakness alone
   pins a character you keep missing to the front of the queue permanently,
   which is how you end up seeing 难 six times an evening. */

const RECENT_SHARE = 0.7;
const RECENT_WINDOW = 40;

/* Newest first: by the day it was introduced, then by curriculum position for
   everything introduced on the same day (a placement quiz credits hundreds at
   once, and they all share a date). */
function byRecency(chars) {
  return [...chars].sort((a, b) => {
    const ra = rec(a), rb = rec(b);
    return (rb.first || "").localeCompare(ra.first || "") || CHAR_INDEX[b].i - CHAR_INDEX[a].i;
  });
}

/* Least-asked first, weakest as the tie-break, then a coin toss so equal
   characters don't always come out in the same order. */
function byNeed(skill) {
  return (a, b) => shownIn(a, skill) - shownIn(b, skill)
                || (rec(a).skills[skill] || 0) - (rec(b).skills[skill] || 0)
                || rec(a).lvl - rec(b).lvl
                || Math.random() - 0.5;
}

function practicePool(skill, n, pool) {
  const all = (pool || knownChars());
  if (all.length <= n) return [...all].sort(byNeed(skill));

  const ranked = byRecency(all);
  const recent = ranked.slice(0, RECENT_WINDOW);
  const older = ranked.slice(RECENT_WINDOW);

  const wantRecent = Math.min(recent.length, Math.round(n * RECENT_SHARE));
  const wantOlder = Math.min(older.length, n - wantRecent);

  const picked = [
    ...[...recent].sort(byNeed(skill)).slice(0, wantRecent),
    ...[...older].sort(byNeed(skill)).slice(0, wantOlder)
  ];

  /* If one side couldn't fill its share — a new learner has no `older` at all
     — take the shortfall from whatever is left rather than serving a short
     round. */
  if (picked.length < n) {
    const have = new Set(picked);
    picked.push(...ranked.filter(c => !have.has(c)).sort(byNeed(skill)).slice(0, n - picked.length));
  }
  return shuffle(picked);
}

const knownChars = () => Object.keys(state.chars).filter(c => CHAR_INDEX[c]);

/* Everything done on one day, counted in reps.

   The day's own session counts cards — `new` and `rev`. Go deeper and Sprint
   count answers, in `extra` and `sp`, and are deliberately kept out of the
   day's checklist, which is a finishable list of the day's characters. But
   they are not kept out of *practice*: both already keep a streak alive, and
   both used to leave the day's square on the heatmap blank and the "days
   studied" total unmoved. A 🔥 1 sitting beside "0 days studied" is the app
   disagreeing with itself, and it got much easier to produce once a whole tab
   could be used without touching the queue.

   So the ink and the totals count all of it. What counts as *done* — goalMet,
   the checklist — still counts only new and rev, which is the distinction that
   was worth keeping. */
const dayReps = d => d ? (d.new || 0) + (d.rev || 0) + (d.extra || 0) + (d.sp || 0) : 0;

/* Days you actually studied — this never resets, unlike the streak. */
const daysStudied = () => Object.values(state.days).filter(d => dayReps(d) > 0).length;

/* ---------- the menu side quest: one character a day ----------

   The quest keeps its own books. It used to run entirely on the main library:
   what you could read was `isKnown`, the daily character was the next unknown
   in curriculum order, and learning one called `introduce`. Three things were
   wrong with that, and they were all the same thing — the side quest was not
   on the side.

   It marched in step with Today, so a placement check could tell somebody who
   had never opened the quest that they could read the whole menu. Learning a
   character here fed the same schedule as everything else, so an aside became
   another obligation. And finishing a menu lesson ticked off "learn today's
   characters" — a task about the day's five, completed from another page.

   So: cross-reference in, progression out. `state.menuTaught` is what the menu
   itself has taught. `menuCanRead` asks both books, because a character
   learned anywhere still inks in, which is the whole point of the page.
   `menuLearn` records and nothing else.

   The trade-off, stated plainly: a character met on the menu is not scheduled
   for review. It is recognition and immersion, not retention. That is fine
   here because every character on this card is in the curriculum and will come
   round properly in its own time.

   It also means nothing has to be kept out of the day's list — a menu
   character never enters the library, so `learnedToday` has nothing to exclude
   and the ring cannot move behind your back. */

function menuQuest() { return QUESTS.find(q => q.id === "menu"); }

/* What the quest taught you, as opposed to what the curriculum did. */
const taughtHere = c => asList(state.menuTaught).includes(c);
const menuCanRead = c => isKnown(c) || taughtHere(c);

/* How grown-up a menu you can cope with right now: you get the next one when
   you can read this one. Nothing on another tab can spring this gate, and
   nothing on another tab is required to pass it.

   It cannot strand anybody either. MENU_READ holds only characters the library
   teaches, and the quest offers one a day from the level you are standing on,
   so the worst case is 26 days to clear level 1 and every one of those days
   moves you a character closer. Which is also why "this level is exhausted but
   the card is not finished" does not exist: clearing the wall promotes you on
   the spot. */
function menuTier() {
  let n = 1;
  while (n < MENU_TIERS.length && MENU_READ[n].every(menuCanRead)) n++;
  return MENU_TIERS[n - 1];
}

/* What is actually on the wall in front of you, at the level you are on. */
const menuOnWall = () => MENU_READ[menuTier().n];

/* Count the ink, not the vocabulary.

   The bar used to answer "how many of a list of 54 do I know". Nobody standing
   in a restaurant asks that. The question the quest is named after is how much
   of this can I read, and the denominator for it is the card with repeats: 面
   appears in five dishes, and learning it lights up five characters of wall.
   That weights common characters the way the wall does, and it moves every
   session rather than only when a menu character comes up, which is most of
   why it is worth looking at.

   `known` / `total` stay alongside it as the countable pair — the number you
   can check by looking at the card — and the wall pair is the one the level
   copy needs. */
function menuProgress() {
  const known = MENU_PRINTED.filter(menuCanRead).length;
  const ink   = MENU_INK.filter(menuCanRead).length;
  const wall  = menuOnWall();
  const wallKnown = wall.filter(menuCanRead).length;
  return {
    known, total: MENU_PRINTED.length,
    ink, inkTotal: MENU_INK.length,
    pct: ink / MENU_INK.length,
    /* The tick on the track, and whether there is anything for it to mark.
       Every printed character here is taught, so `capped` is false and the bar
       runs to the end — but a card that outgrew the curriculum would stop
       short, and a bar that quietly halts reads as broken. */
    ceiling: MENU_INK_CEILING,
    ceilingPct: MENU_INK_CEILING / MENU_INK.length,
    capped: MENU_INK_CEILING < MENU_INK.length,
    wallKnown, wallTotal: wall.length,
    done: known === MENU_PRINTED.length
  };
}

/* "N of 54 learned right here" — the only number the quest itself controls. */
const menuOwn = () => MENU_PRINTED.filter(taughtHere).length;

/* Today's menu character, picked off the wall you can actually see.

   Fixed once chosen so it can't shift underfoot — but a pick the wall no
   longer shows is a repair rather than a shift. Anyone holding a character
   from a level they have since dropped below would otherwise spend the rest of
   the day hunting for something that is not printed. */
function menuToday() {
  const k = dayKey();
  const wall = menuOnWall();
  const p = state.menuPick;
  const stillThere = p && p.d === k &&
    (p.c ? wall.includes(p.c) : !wall.some(c => !menuCanRead(c)));
  if (stillThere) return p;
  const next = wall.find(c => !menuCanRead(c)) || null;
  state.menuPick = { d: k, c: next, done: !next };
  save();
  return state.menuPick;
}

/* Records it in the quest's own book and nothing else: no `introduce`, no
   review date, no day count, no tally. */
function menuLearn(c) {
  if (!c || !CHAR_INDEX[c]) return;
  state.menuTaught = asList(state.menuTaught);
  if (!state.menuTaught.includes(c)) state.menuTaught.push(c);
  save();
}

function menuLearned() {
  const p = menuToday();
  if (!p.c) return;
  menuLearn(p.c);
  p.done = true;
  save();
}

/* The menu characters you can already read — the flashcard deck. Reads
   `menuCanRead`, not `isKnown`: when you decouple a store, every reader of the
   old one has to be found. This one and `glyphs()` in app.js were the two that
   were missed the first time, and the second left a character the quest had
   just taught still printed in grey. */
const menuKnown = () => MENU_PRINTED.filter(menuCanRead);

function stageProgress(stageNo) {
  const inStage = HQ.filter(c => c.stage === stageNo);
  const known = inStage.filter(c => isKnown(c.c)).length;
  return { known, total: inStage.length, pct: inStage.length ? known / inStage.length : 0 };
}

/* ---------- tiers ----------

   `to` is the milestone the tier stands for, not how many characters are
   written yet: a tier can run past the end of the library, so `tierChars`
   returns what actually exists and `tierPlanned` says what it is aiming at.
   Keeping those apart is what lets the Library show an honest "n of m
   written" instead of pretending the rest are missing.

   No sizes in this comment on purpose. It used to say "tier 2 runs to 500 but
   the library currently stops at 348", which was true when it was written and
   a lie by the time the library reached 763. Prose that states a count is
   prose that goes stale. */

const tierFrom = t => t.n === 1 ? 0 : TIERS[t.n - 2].to;
const tierChars = t => HQ.slice(tierFrom(t), t.to);
const tierPlanned = t => t.to - tierFrom(t);
const tierOf = i => TIERS.find(t => i < t.to) || TIERS[TIERS.length - 1];

function tierProgress(t) {
  const inTier = tierChars(t);
  const known = inTier.filter(ch => isKnown(ch.c)).length;
  return { known, built: inTier.length, planned: tierPlanned(t),
           pct: inTier.length ? known / inTier.length : 0 };
}

/* Tier 1 is always open. After that you need TIER_UNLOCK of the previous
   tier's *written* characters — and every tier before that too, so a gap
   early on can't be stepped over. */
function tierUnlocked(t) {
  for (let i = 0; i < t.n - 1; i++) {
    const p = tierProgress(TIERS[i]);
    if (!p.built || p.pct < TIER_UNLOCK) return false;
  }
  return true;
}

/* How many more of the blocking tier are needed to open this one. */
function tierNeeds(t) {
  for (let i = 0; i < t.n - 1; i++) {
    const prev = TIERS[i], p = tierProgress(prev);
    if (!p.built || p.pct < TIER_UNLOCK) {
      return { tier: prev, more: Math.max(1, Math.ceil(p.built * TIER_UNLOCK) - p.known) };
    }
  }
  return null;
}

/* The curriculum position past which nothing may be studied yet. Everything
   the daily session and the Library hand out is checked against this. */
function unlockedCeiling() {
  let ceiling = 0;
  for (const t of TIERS) {
    if (!tierUnlocked(t)) break;
    ceiling = Math.min(t.to, HQ.length);
  }
  return ceiling;
}

const isLocked = c => {
  const ch = CHAR_INDEX[c];
  return !!ch && !isKnown(c) && ch.i >= unlockedCeiling();
};

function currentStage() {
  for (const s of STAGES) {
    const p = stageProgress(s.n);
    if (p.known < p.total) return s;
  }
  return STAGES[STAGES.length - 1];
}

/* ---------- skill mastery, for the progress view ---------- */

/* Three clean answers in a mode is what makes a character solid in it. The
   number is arbitrary but the shape isn't: one right answer can be a lucky
   guess, three spread over different days is knowledge. */
const PASSES_FOR_SOLID = 3;

const passesIn = (c, skill) => {
  const r = rec(c);
  return (r && r.skills && r.skills[skill]) || 0;
};

/* How a skill stands across a set of characters.

   "12 of 30 solid" alone hid the actual work: two clean passes on every
   character reads as zero, and so does none. What's wanted is credit for the
   passes themselves — going through the material again and getting it right
   is the thing that makes it stick — so this also returns the buckets, and a
   percentage against the whole three-passes-each goal rather than against a
   threshold nothing crosses for a week. */
function skillStanding(skill, chars) {
  const buckets = [0, 0, 0, 0];         /* characters with 0, 1, 2, 3+ clean passes */
  let passes = 0;
  chars.forEach(c => {
    const n = Math.min(PASSES_FOR_SOLID, passesIn(c, skill));
    buckets[n]++;
    passes += n;
  });
  const total = chars.length;
  return {
    total, buckets, passes,
    solid: buckets[PASSES_FOR_SOLID],
    partway: buckets[1] + buckets[2],
    untouched: buckets[0],
    goal: total * PASSES_FOR_SOLID,
    pct: total ? passes / (total * PASSES_FOR_SOLID) : 0
  };
}

/* ============================================================
   速练 Sprint — the record behind the timed sheets

   The UI lives in js/sprint.js. What is here is everything that has to
   survive a reload: the per-character marks, the finished runs, and the
   best of them.

   Two numbers are kept for every character, per mode: how often it has been
   answered right and wrong under time pressure. They are deliberately not
   the same numbers the review schedule keeps. A character you read correctly
   at leisure every time and miss every time at two seconds a question is not
   a character you know — and nothing in the main record could tell you that,
   because nothing in the main record is timed.

   Alongside the counts is `s`, the last SPRINT_WINDOW answers as a string of
   1s and 0s, newest last, merged across all three modes. It is what decides
   whether a character is still a problem: the counts say what has happened
   over months, the string says what is happening now.
   ============================================================ */

const SPRINT_WINDOW = 12;        /* recent answers kept per character */
const SPRINT_TROUBLE = 2;        /* misses before it goes in the 错字本 */
const SPRINT_CLEAR = 3;          /* right answers in a row to leave it */
const SPRINT_FLUENT = 5;         /* right in a row before it counts as fluent */
const SPRINT_RUNS_KEPT = 40;     /* finished sheets kept for the recent list */

/* Records written before any of this existed have no `sprint` key at all, and
   one written by a version that only knew about `marks` has no `best`. Same
   problem `ensure` solves for `shown`, same answer. */
function sprintState() {
  const s = state.sprint = state.sprint || {};
  s.marks = s.marks || {};
  s.runs = s.runs || [];
  s.best = s.best || {};
  s.pick = s.pick || {};
  return s;
}

function sprintMark(c, mode, ok) {
  const s = sprintState();
  const m = s.marks[c] = s.marks[c] || { s: "" };
  const pair = m[mode] = m[mode] || [0, 0];
  pair[ok ? 0 : 1]++;
  m.s = (m.s + (ok ? "1" : "0")).slice(-SPRINT_WINDOW);
  /* Dismissing a character from the notebook is a claim about yourself, and
     missing it again is the evidence against. The claim loses. */
  if (!ok && s.cleared) delete s.cleared[c];
  save();
  return m;
}

const sprintMarkOf = c => sprintState().marks[c] || null;

/* Summed across every sprint mode. */
function sprintCount(c, i) {
  const m = sprintMarkOf(c);
  if (!m) return 0;
  return ["r", "w", "l", "a"].reduce((a, k) => a + (m[k] ? m[k][i] : 0), 0);
}
const sprintHits = c => sprintCount(c, 0);
const sprintMisses = c => sprintCount(c, 1);

/* How many right answers in a row it is currently on, counting sprints and
   repair rounds together — the only thing that gets a character out of the
   notebook, and the only thing that puts one on the fluent list. */
function rightRun(c) {
  const m = sprintMarkOf(c);
  if (!m || !m.s) return 0;
  let n = 0;
  for (let i = m.s.length - 1; i >= 0 && m.s[i] === "1"; i--) n++;
  return n;
}

/* Which mode a character actually fails in — "you can read it, you can't
   hear it" is the useful sentence, and it needs the per-mode split. */
function sprintByMode(c) {
  const m = sprintMarkOf(c);
  return ["r", "w", "l", "a"].map(k => ({ mode: k, hit: m && m[k] ? m[k][0] : 0, miss: m && m[k] ? m[k][1] : 0 }));
}

/* Recent misses weigh more than old ones: a character missed three times last
   week and answered right ever since is not the one to work on today. */
function troubleScore(c) {
  const m = sprintMarkOf(c);
  const recent = m && m.s ? [...m.s].filter(x => x === "0").length : 0;
  const r = rec(c);
  return recent * 3 + sprintMisses(c) + (r && isLeech(c) ? 4 : 0) - rightRun(c) * 2;
}

/* The 错字本. A character earns its page by being missed repeatedly under
   time — or by being a sticking point in the main record, which is the same
   problem arrived at from the other direction — and loses it by being
   answered right SPRINT_CLEAR times running, wherever that happens. */
function sprintTrouble() {
  const out = new Set();
  Object.keys(sprintState().marks).forEach(c => {
    if (CHAR_INDEX[c] && sprintMisses(c) >= SPRINT_TROUBLE) out.add(c);
  });
  leeches().forEach(c => out.add(c));
  return [...out]
    .filter(c => rightRun(c) < SPRINT_CLEAR && !(state.sprint.cleared || {})[c])
    .sort((a, b) => troubleScore(b) - troubleScore(a));
}

/* The other half of the same question, and the half that is nicer to be
   asked: what have you got cold? */
const sprintFluent = () => Object.keys(sprintState().marks)
  .filter(c => CHAR_INDEX[c] && rightRun(c) >= SPRINT_FLUENT)
  .sort((a, b) => rightRun(b) - rightRun(a) || sprintHits(b) - sprintHits(a));

/* "I know this one, stop showing me" — set by hand from the notebook, and
   undone by the next miss, which is the only honest way round. */
function sprintForget(c) {
  const s = sprintState();
  (s.cleared = s.cleared || {})[c] = dayKey();
  save();
}
function sprintRemember(c) {
  const s = sprintState();
  if (s.cleared) delete s.cleared[c];
  save();
}

/* ---------- finished sheets ----------

   A sheet is identified by what makes it hard: the mode, how many questions,
   how long, and — for writing, which has two input styles — which one. Bests
   are kept per sheet, because 40 questions in two minutes and 100 in two
   minutes are not the same test and one board for both would be nonsense. */

const sheetKey = run => `${run.mode}:${run.n}:${run.secs}${run.style ? ":" + run.style : ""}`;

/* More right beats faster; a tie goes to the quicker sheet. Finishing inside
   the time is not a separate ranking — a sheet you didn't finish has
   unanswered questions, and unanswered questions are not right answers. */
const beats = (a, b) => !b || a.right > b.right || (a.right === b.right && a.ms < b.ms);

function recordRun(run) {
  const s = sprintState();
  run.on = dayKey();
  run.at = Date.now();
  const key = sheetKey(run);
  const prev = s.best[key] || null;
  const best = beats(run, prev);
  if (best) s.best[key] = run;
  s.runs.unshift(run);
  s.runs = s.runs.slice(0, SPRINT_RUNS_KEPT);
  s.pick[run.mode] = { n: run.n, secs: run.secs, style: run.style };
  save();
  return { best, prev };
}

/* Every sheet of this mode you have a best for, hardest first — seconds per
   question is the honest ordering, since that is what the difficulty is. */
const sprintBests = mode => Object.keys(sprintState().best)
  .filter(k => k.startsWith(mode + ":"))
  .map(k => sprintState().best[k])
  .sort((a, b) => (a.secs / a.n) - (b.secs / b.n));

const sprintRecent = mode => sprintState().runs.filter(r => !mode || r.mode === mode);

/* Sprint answers keep a streak alive — they are real practice — but like Go
   deeper they stay out of today's checklist, which is a finishable list of
   the day's characters and not a place to pile up reps. */
function tallySprint(answers) {
  const t = today();
  t.sp = (t.sp || 0) + answers;
  t.spr = (t.spr || 0) + 1;
  touchStreak();
  save();
}
const sprintToday = () => (state.days[dayKey()] || {}).sp || 0;
const sprintTotal = () => Object.values(state.days).reduce((a, d) => a + (d.sp || 0), 0);
