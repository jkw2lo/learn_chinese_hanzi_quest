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
  padAuto: false,
  hailed: [],           /* milestones already celebrated — see MILESTONES */
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

/* ---------- optional cross-device sync ---------- */

let remoteDoc = null;

async function connectRemote() {
  if (!window.claude?.use) return false;
  try {
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db) return false;
    const uid = user ? await user.id() : null;
    remoteDoc = db.doc(`data/users/${uid || "me"}/progress`);
    const snap = await remoteDoc.get();
    if (snap.exists) {
      const remote = snap.data();
      /* Last write wins — the record is one person's, not a shared document. */
      if (remote && remote.updated > (state.updated || 0)) {
        state = Object.assign(blank(), remote);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        return true;
      }
    }
    pushRemote();
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
const hailed = () => (state.hailed = state.hailed || []);

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

/* ---------- the menu side quest: one character a day ---------- */

function menuQuest() { return QUESTS.find(q => q.id === "menu"); }

function menuProgress() {
  const known = MENU_CHARS.filter(isKnown).length;
  return { known, total: MENU_CHARS.length, pct: known / MENU_CHARS.length,
           done: known === MENU_CHARS.length };
}

/* Today's menu character, fixed once chosen so it can't shift underfoot. */
function menuToday() {
  const k = dayKey();
  if (state.menuPick && state.menuPick.d === k) return state.menuPick;
  const next = MENU_CHARS.find(c => !isKnown(c)) || null;
  state.menuPick = { d: k, c: next, done: !next };
  save();
  return state.menuPick;
}

function menuLearned() {
  const p = menuToday();
  if (!p.c) return;
  introduce(p.c);
  tally("new");
  p.done = true;
  save();
}

/* The menu characters you can already read — the flashcard deck. */
const menuKnown = () => MENU_CHARS.filter(isKnown);

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

/* Summed across the three modes. */
function sprintCount(c, i) {
  const m = sprintMarkOf(c);
  if (!m) return 0;
  return ["r", "w", "l"].reduce((a, k) => a + (m[k] ? m[k][i] : 0), 0);
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
  return ["r", "w", "l"].map(k => ({ mode: k, hit: m && m[k] ? m[k][0] : 0, miss: m && m[k] ? m[k][1] : 0 }));
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
