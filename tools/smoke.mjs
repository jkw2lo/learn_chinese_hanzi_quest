/* Smoke test for Hanzi Quest.  Run: node tools/smoke.mjs

   data.js and srs.js are DOM-free, so they run here for real. app.js needs a
   browser, but it depends on these two through a shared global scope — and a
   name deleted from srs.js while app.js still calls it fails only on click.
   The CONTRACT list below pins those names so that can't happen quietly. */

import { readFileSync } from 'fs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };

/* Everything app.js reaches for across the file boundary. */
const CONTRACT = [
  'HQ', 'STAGES', 'CHAR_INDEX', 'FAMILIES', 'RADICALS', 'QUESTS',
  'TIERS', 'TIER_UNLOCK', 'tierOf', 'tierChars', 'tierFrom', 'tierProgress',
  'tierUnlocked', 'tierNeeds', 'unlockedCeiling', 'isLocked',
  'POS_LABEL', 'MENU', 'MENU_CHARS', 'EXTRA_GLOSS',
  'state', 'blank', 'load', 'save', 'dayKey', 'toneOf', 'connectRemote',
  'rec', 'isKnown', 'strength', 'grade', 'introduce', 'today', 'tally', 'liveStreak',
  'dueList', 'dueCount', 'nextNew', 'remainingNew', 'stageProgress', 'currentStage',
  'skillStanding', 'passesIn', 'PASSES_FOR_SOLID', 'reviewedToday', 'resetProgress',
  'tallyExtra', 'extraToday', 'extraTotal', 'extraBestDay', 'dayReps',
  'studyAhead', 'aheadToday', 'dayGoal', 'newLeftToday', 'GOAL_MIN', 'GOAL_MAX',
  'placeKnown', 'wasPlaced', 'PLACE_MISS_LIMIT', 'PLACED_REST',
  'wordOfWeek', 'weekKey', 'INTERESTS', 'INTEREST_KEYS', 'shownIn', 'shuffle',
  'FESTIVALS', 'festivalThisWeek', 'festivalDate', 'wotwEntry',
  'menuProgress', 'menuToday', 'menuLearned', 'menuKnown',
  'MENU_TIERS', 'practicePool', 'knownChars', 'daysStudied',
  'sprintState', 'sprintMark', 'sprintMarkOf', 'sprintHits', 'sprintMisses', 'sprintByMode',
  'sprintTrouble', 'sprintFluent', 'sprintForget', 'rightRun', 'troubleScore',
  'recordRun', 'sheetKey', 'sprintBests', 'sprintRecent', 'tallySprint', 'sprintTotal',
  'SPRINT_WINDOW', 'SPRINT_TROUBLE', 'SPRINT_CLEAR', 'SPRINT_FLUENT'
];

/* typeof guards so a missing name reports cleanly instead of crashing */
const api = new Function(
  read('js/data.js') + '\n' + read('js/srs.js') + '\n' +
  'return {' + CONTRACT.map(n => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(',') + '};'
)();

let failures = 0;
const ok = (label, cond, detail = '') => {
  if (cond) console.log('  ✓ ' + label);
  else { console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); failures++; }
};

console.log('\ncontract');
CONTRACT.forEach(n => ok(n, api[n] !== undefined));

console.log('\nversion');
{
  /* The version is only useful if it can be trusted: a number on screen that
     doesn't match the query strings would tell you the cache had cleared when
     it hadn't. */
  const html = read('index.html');
  const declared = (html.match(/const APP_VERSION = "([^"]+)"/) || [])[1];
  ok('index.html declares a version', /^\d+\.\d+\.\d+$/.test(declared || ''), String(declared));
  ok('and a date', /^\d{4}-\d{2}-\d{2}$/.test((html.match(/APP_DATE = "([^"]+)"/) || [])[1] || ''));
  const stamped = [...html.matchAll(/\?v=([^"']+)/g)].map(m => m[1]);
  ok('every local asset is stamped', stamped.length >= 5, stamped.length + ' stamped');
  /* audio.js is fetched by app.js instead of being listed here, so it needs
     its own stamp — from APP_VERSION, or it would cache forever */
  const appjs = read('js/app.js');
  ok('the deferred audio bundle is stamped too',
     /js\/audio\.js\?v=\$\{appVersion\(\)\}/.test(appjs));
  ok('and index.html no longer blocks on it', !/src="js\/audio\.js/.test(html));
  ok('and all stamps match the declared version',
     stamped.every(v => v === declared), [...new Set(stamped.filter(v => v !== declared))].join(' '));
  /* a path with no query string at all is one the bump script will miss */
  const bare = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)"/g)].map(m => m[1]);
  ok('no local asset is left unstamped', !bare.length, bare.join(' '));
}

console.log('\ncurriculum');
const { HQ, CHAR_INDEX, MENU, MENU_CHARS, STAGES } = api;
ok(`${HQ.length} characters`, HQ.length > 0);
ok('no duplicates', new Set(HQ.map(c => c.c)).size === HQ.length);
const missing = HQ.filter(c => !c.c || !c.p || !c.m || !c.story || !c.o || !c.pos?.length || !c.words?.length || c.sent?.length !== 3);
ok('every character complete', !missing.length, missing.map(c => c.c).join(' '));
const badPos = [...new Set(HQ.flatMap(c => c.pos))].filter(p => !api.POS_LABEL[p]);
ok('grammar tags all labelled', !badPos.length, badPos.join(' '));
ok('every character lands in a stage', HQ.every(c => STAGES.some(s => s.n === c.stage)));

console.log('\nmenu');
const cjk = s => [...s].filter(c => /[一-鿿]/.test(c));
const onMenu = new Set([...cjk(MENU.title), ...cjk(MENU.name),
  ...MENU.sections.flatMap(s => [...cjk(s.head), ...s.items.flatMap(i => cjk(i[0]))])]);
const spoken = new Set(MENU.phrases.flatMap(p => cjk(p[0])));
ok('every printed glyph is a taught character', [...onMenu].every(c => CHAR_INDEX[c]),
   [...onMenu].filter(c => !CHAR_INDEX[c]).join(' '));
ok('every spoken glyph is a taught character', [...spoken].every(c => CHAR_INDEX[c]),
   [...spoken].filter(c => !CHAR_INDEX[c]).join(' '));
ok('quest covers the whole menu', [...onMenu, ...spoken].every(c => MENU_CHARS.includes(c)));
ok('printed characters come first', MENU_CHARS.slice(0, onMenu.size).every(c => onMenu.has(c)),
   'so day one lights up a visible dish');

console.log('\nscheduling');
api.load();
const first = api.nextNew(3);
ok('new characters follow curriculum order', first.join(' ') === HQ.slice(0, 3).map(c => c.c).join(' '), first.join(' '));
api.introduce(first[0]);
ok('a new character is not due again today', !api.dueList().includes(first[0]));
api.grade(first[0], false, 'r');
ok('a missed character comes back today', api.dueList().includes(first[0]));
api.grade(first[0], true, 'r');
ok('a correct answer schedules it forward', !api.dueList().includes(first[0]));
api.tally('new');
ok('studying starts a streak', api.liveStreak() === 1);

console.log('\nside quest');
const pick = api.menuToday();
ok('picks a character', !!pick.c);
ok('the pick is stable within the day', api.menuToday().c === pick.c);
ok('the pick is printed on the menu', onMenu.has(pick.c), pick.c);
const before = api.menuProgress().known;
api.menuLearned();
ok('learning it advances the quest', api.menuProgress().known === before + 1);
ok('and it joins the flashcard deck', api.menuKnown().includes(pick.c));

console.log('\npractice');
const someone = api.knownChars();
ok('practice pool draws on learned characters', api.practicePool('r', 5).every(c => someone.includes(c)));
const target = someone[0];
const dueBefore = api.rec(target).due;
api.grade(target, true, 'r', { practice: true });
ok('practice does not push the review date out', api.rec(target).due === dueBefore);
ok('but it still counts toward the skill', api.rec(target).skills.r > 0);
api.grade(target, false, 'r', { practice: true });
ok('failing in practice still pulls the review forward', api.rec(target).due === api.dayKey());

console.log('\nhandwriting is graded gently');
const hw = api.knownChars()[0];
api.rec(hw).lvl = 4;
api.rec(hw).due = api.dayKey();
const lvlBefore = api.rec(hw).lvl;
api.grade(hw, false, 'w', { gentle: true });
ok('a missed stroke never demotes the character', api.rec(hw).lvl === lvlBefore);
ok('and never drags it back to today', api.rec(hw).due > api.dayKey());
ok('but the attempt is recorded', api.rec(hw).wrong > 0);
ok('and no writing credit is given', (api.rec(hw).skills.w || 0) === 0);
const lvl2 = api.rec(hw).lvl;
api.grade(hw, false, 'r');
ok('a missed RECOGNITION still costs a level', api.rec(hw).lvl < lvl2);

console.log('\nmenu tiers');
ok('three tiers defined', api.MENU_TIERS.length === 3);
ok('tier 1 needs nothing', api.MENU_TIERS[0].at === 0);
ok('tiers ascend', api.MENU_TIERS.every((t, i, a) => !i || t.at > a[i - 1].at));
const withDesc = MENU.sections.flatMap(s => s.items).filter(i => i[4]);
ok('every dish has a description for tier 2', withDesc.length === MENU.sections.flatMap(s => s.items).length);
const tierGlyphs = [...withDesc.flatMap(i => cjk(i[4][0])),
                    ...MENU.specials.items.flatMap(i => cjk(i[0])),
                    ...cjk(MENU.specials.note[0]), ...cjk(MENU.specials.head)];
ok('every glyph in the grown-up menu is a taught character',
   tierGlyphs.every(c => CHAR_INDEX[c]), [...new Set(tierGlyphs.filter(c => !CHAR_INDEX[c]))].join(' '));

console.log('\nwhat today\'s numbers count');
/* "Reviewed today" read as a count of characters but incremented on every
   answer, so one character drilled four times read as four. */
const rc = api.knownChars()[0];
const revsBefore = api.reviewedToday().length;
api.tally('rev', rc);
api.tally('rev', rc);
api.tally('rev', rc);
ok('three answers on one character is one character revised',
   api.reviewedToday().length === revsBefore + 1, api.reviewedToday().join(' '));
ok('but every answer still counts as a card', api.today().rev >= 3);
const rc2 = api.knownChars()[1];
api.tally('rev', rc2);
ok('a second character is counted separately', api.reviewedToday().length === revsBefore + 2);

console.log('\nskill standing');
/* The tiles used to show only how many characters had crossed three clean
   passes, so a whole round of practice could leave the screen unchanged. */
api.nextNew(4).forEach(api.introduce);          /* make sure there are four to measure */
const sc = api.knownChars().slice(0, 4);
sc.forEach(c => { api.rec(c).skills.p = 0; });
const zero = api.skillStanding('p', sc);
ok('four characters to measure', sc.length === 4, `got ${sc.length}`);
ok('nothing practised reads as zero', zero.pct === 0 && zero.solid === 0 && zero.untouched === sc.length);
api.rec(sc[0]).skills.p = 1;
const one = api.skillStanding('p', sc);
ok('one clean pass moves the ring', one.pct > zero.pct, `${zero.pct} → ${one.pct}`);
ok('without claiming the character is solid', one.solid === 0 && one.partway === 1);
sc.forEach(c => { api.rec(c).skills.p = api.PASSES_FOR_SOLID; });
const full = api.skillStanding('p', sc);
ok('three passes each is a full ring', full.pct === 1 && full.solid === sc.length && full.untouched === 0);
sc.forEach(c => { api.rec(c).skills.p = 99; });
ok('extra reps never overflow it', api.skillStanding('p', sc).pct === 1);
ok('an empty set is not a division by zero', api.skillStanding('p', []).pct === 0);
ok('buckets account for every character',
   full.buckets.reduce((a, b) => a + b, 0) === full.total);

console.log('\nextra reps are their own count');
/* Today's list is finishable and ticks; Go deeper is unbounded and tallies.
   The two must not feed each other's numbers. */
const revStart = api.today().rev, extraStart = api.extraToday();
api.tallyExtra(); api.tallyExtra(); api.tallyExtra();
ok('reps accumulate', api.extraToday() === extraStart + 3);
ok('and never touch the review tally', api.today().rev === revStart);
ok('the lifetime total sees them', api.extraTotal() >= 3);
ok('so does the best day', api.extraBestDay() >= 3);
const revd0 = api.reviewedToday().length;
api.tallyExtra();
ok('a rep is not a character revised', api.reviewedToday().length === revd0);

console.log('\nwhat a practice round draws');
/* The old pool sorted the whole library by weakness and took the top N, so the
   same characters came round every time and the rest were never seen again. */
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,state,load,introduce,grade,practicePool,knownChars,rec,shownIn};')();
  globalThis.localStorage._d = {};
  fresh.load();
  fresh.HQ.slice(0, 200).forEach(ch => fresh.introduce(ch.c));
  fresh.knownChars().forEach((c, i) => { fresh.rec(c).first = i < 160 ? '2000-01-01' : '2030-01-01'; });
  const recent = new Set(fresh.knownChars().filter(c => fresh.rec(c).first === '2030-01-01'));
  let hits = 0, total = 0;
  const seen = new Map();
  for (let i = 0; i < 40; i++) for (const c of fresh.practicePool('r', 10)) {
    total++; if (recent.has(c)) hits++;
    seen.set(c, (seen.get(c) || 0) + 1);
    fresh.grade(c, true, 'r', { practice: true });
  }
  const share = hits / total;
  ok('about 70% of a round is recently learned', share > 0.6 && share < 0.8, (share * 100).toFixed(0) + '%');
  ok('the rest reaches back into older characters', [...seen.keys()].some(c => !recent.has(c)));
  ok('rotation spreads across the library', seen.size > 100, seen.size + ' distinct');
  const olderCounts = [...seen.entries()].filter(([c]) => !recent.has(c)).map(([, n]) => n);
  ok('and no old character is hammered', Math.max(...olderCounts) <= 3, 'max ' + Math.max(...olderCounts));
  ok('being asked is counted separately from being right',
     fresh.shownIn(fresh.knownChars()[0], 'r') >= fresh.rec(fresh.knownChars()[0]).skills.r);
  const small = fresh.practicePool('r', 10, fresh.knownChars().slice(0, 4));
  ok('a pool smaller than the round is returned whole', small.length === 4);
}

console.log('\nplacement');
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,state,load,placeKnown,wasPlaced,rec,isKnown,dueCount,knownChars,dayKey,nextNew,grade,PLACED_REST};')();
  globalThis.localStorage._d = {};
  fresh.load();
  ok('nobody is placed to begin with', !fresh.wasPlaced());

  /* someone who knew the first 60 apart from three they missed */
  const missed = new Set([fresh.HQ[7].c, fresh.HQ[22].c, fresh.HQ[51].c]);
  const got = fresh.HQ.slice(0, 60).map(ch => ch.c).filter(c => !missed.has(c));
  const added = fresh.placeKnown(got);

  ok('exactly what was answered is credited', added === got.length);
  ok('and nothing else', fresh.knownChars().length === got.length);
  ok('a missed character is not credited', [...missed].every(c => !fresh.isKnown(c)));
  ok('credited characters are marked as placed', got.every(c => fresh.rec(c).placed));
  ok('they carry the recognition they demonstrated', got.every(c => fresh.rec(c).skills.r === 1));

  /* the whole point of the rework: day one is not a backlog */
  ok('NOTHING is due today', fresh.dueCount() === 0);
  const soonest = Math.min(...got.map(c => fresh.rec(c).due).map(d => {
    const [y, m, dd] = d.split('-').map(Number);
    const [ty, tm, td] = fresh.dayKey().split('-').map(Number);
    return Math.round((new Date(y, m - 1, dd) - new Date(ty, tm - 1, td)) / 864e5);
  }));
  ok('nothing is due tomorrow either', soonest >= 2, soonest + ' days to the first');
  const spread = new Set(got.map(c => fresh.rec(c).due));
  ok('reviews are fanned across weeks', spread.size >= 15, spread.size + ' distinct dates');

  /* and day one is the ordinary first session */
  const five = fresh.nextNew(5);
  ok('day one still offers five new characters', five.length === 5);
  ok('starting at the first one you missed', five[0] === fresh.HQ[7].c, five.join(' '));
  ok('and never re-offers one you knew', five.every(c => !got.includes(c)));

  /* Placement credits land today, so `first` is today's date for all of them.
     learnedToday() in app.js filters on `placed` to tell "credited this
     morning" from "actually sat down and learnt it" — without that, being
     placed at 69 put 69 characters in the Learned today strip and asked you to
     write out and pronounce every one. This asserts the flag that hook needs. */
  const k = fresh.dayKey();
  const learntToday = got.filter(c => fresh.rec(c).first === k && !fresh.rec(c).placed);
  ok('placed characters all carry today as their first day', got.every(c => fresh.rec(c).first === k));
  ok('but none of them reads as learnt today', learntToday.length === 0);
  ok('while still counting as known', got.every(c => fresh.isKnown(c)));

  /* retaking only adds */
  const before = fresh.rec(got[0]).due;
  fresh.rec(got[0]).lvl = 8;
  const again = fresh.placeKnown([got[0], fresh.HQ[7].c]);
  ok('a retake credits only what is new', again === 1);
  ok('and leaves an existing record alone', fresh.rec(got[0]).lvl === 8 && fresh.rec(got[0]).due === before);
  ok('crediting nothing is harmless', fresh.placeKnown([]) === 0);
}

console.log('\nword of the week');
ok('no interests, no word', (() => { api.state.interests = []; api.state.wotw = null; return api.wordOfWeek() === null; })());
api.state.interests = ['food', 'tech'];
api.state.wotw = null; api.state.wotwPast = [];
const w1 = api.wordOfWeek();
ok('picking interests produces one', !!w1 && !!api.INTERESTS[w1.cat]);
ok('it comes from an interest you chose', api.state.interests.includes(w1.cat));
ok('and it is stable within the week', JSON.stringify(api.wordOfWeek()) === JSON.stringify(w1));
ok('every interest word is complete', api.INTEREST_KEYS.every(k =>
  api.INTERESTS[k].words.every(w => w.length === 4 && w.every(part => part && part.trim()))));
ok('every interest has an icon and a name', api.INTEREST_KEYS.every(k =>
  api.INTERESTS[k].icon && api.INTERESTS[k].name && api.INTERESTS[k].zh));
ok('week keys look like ISO weeks', /^\d{4}-W\d{2}$/.test(api.weekKey()));
ok('and change from week to week',
   api.weekKey(new Date(2026, 0, 5)) !== api.weekKey(new Date(2026, 0, 15)));

console.log('\neverything speakable has a clip');
{
  /* Clips used to be generated for the taught characters only, so 金 in 现金
     and 第 in 第一 were silent — and one gap made sayPhrase abandon the whole
     word to a system voice that may not exist. */
  const want = new Set();
  const add = t => [...String(t || '')].forEach(c => { if (/[\u4e00-\u9fff]/.test(c)) want.add(c); });
  HQ.forEach(ch => { add(ch.c); ch.words.forEach(w => add(w[0])); add(ch.sent[0]); });
  add(MENU.title); add(MENU.name);
  MENU.sections.forEach(x => { add(x.head); x.items.forEach(i => { add(i[0]); if (i[4]) add(i[4][0]); }); });
  (MENU.phrases || []).forEach(x => add(x[0]));
  add(MENU.specials.head);
  MENU.specials.items.forEach(i => add(i[0]));
  add(MENU.specials.note[0]);
  Object.values(api.INTERESTS).forEach(c => c.words.forEach(w => add(w[0])));
  api.FESTIVALS.forEach(f => f.words.forEach(w => add(w[0])));

  let bundled = null;
  try {
    const w = {};
    new Function('window', read('js/audio.js'))(w);
    bundled = new Set(Object.keys(w.HQ_AUDIO || {}));
  } catch { /* not generated in this checkout */ }

  if (!bundled) {
    console.log('  – js/audio.js not present, skipping (run tools/make-audio.mjs)');
  } else {
    const missing = [...want].filter(c => !bundled.has(c));
    ok(`${want.size} speakable characters`, want.size > HQ.length);
    ok('every one of them has a clip', !missing.length,
       missing.length + ' missing: ' + missing.slice(0, 30).join(''));
  }
}

console.log('\na meaning in brackets is not a translation');
{
  /* Seventeen of the 763 meanings open with a bracket — (measure: flat
     things), (completed action marker) — and they are exactly the characters
     with no English word behind them. In a recognition drill that fails twice
     over: against three plain meanings it is answerable by elimination, and
     against another bracketed one it asks the learner to tell 张 from 条 by a
     couple of words of somebody's English. */
  const jobs = HQ.filter(c => /^\(/.test(c.m));
  ok(`${jobs.length} meanings are a job description rather than a translation`,
     jobs.length > 0, jobs.map(c => c.c).join(''));
  ok('and there are enough of them to draw a full set of distractors from',
     jobs.length >= 4, jobs.length + ' of ' + HQ.length);

  const appSrc = read('js/app.js');
  ok('there is one test for that shape of gloss',
     /const isJobGloss = m => \/\^\\\(\/\.test\(String\(m\)\);/.test(appSrc));
  ok('a bracketed answer draws bracketed distractors',
     /const kin = isJobGloss\(ch\.m\) \? pool\.filter\(x => isJobGloss\(x\.m\)\) : pool;/.test(appSrc));
  ok('and falls back to the ordinary pool if there are not enough',
     /if \(others\.length < 3\) \{[\s\S]{0,200}?3 - others\.length\)/.test(appSrc));

  /* THE condition. Tagging a lone bracketed option would hand the answer
     over: one option carrying pinyin and three without is a tell, and a
     learner stops reading the options and starts looking for the pinyin. */
  ok('the reading rides along only when two or more options need it',
     /const say = ms\.filter\(isJobGloss\)\.length >= 2;/.test(appSrc));
  ok('and it is never attached on any weaker condition',
     !/isJobGloss\)\.length >= 1/.test(appSrc) && !/isJobGloss\)\.length > 0/.test(appSrc));
  ok('an option only carries a reading if its own meaning is bracketed',
     /say && o && isJobGloss\(m\)/.test(appSrc));

  /* the one place the same gloss stands alone, with nothing to compare it to */
  ok('the placement prompt gets the reading unconditionally',
     /class="place-q">\$\{esc\(ch\.m\)\}\$\{isJobGloss\(ch\.m\)/.test(appSrc));
  ok('and asks which character *is* it, not what it means',
     /Which character \$\{isJobGloss\(ch\.m\) \? "is" : "means"\}/.test(appSrc));
  ok('the reading is set quieter than the meaning it rides with',
     /\.opt-say \{ opacity: \.72/.test(read('css/app.css')));
}

console.log('\na character with no stroke data is still drawn');
{
  /* hanzi-writer fills an empty mount, so a character it has no data for
     leaves the 田字格 blank — a sound and a meaning attached to nothing, and
     no error anywhere to say why. Every character in this curriculum has data
     today; this is a guard, because the failure mode is silent and the fix
     costs nothing while the data is there. */
  const appSrc = read('js/app.js'), css = read('css/app.css');
  ok('there is one test for whether a character can be animated',
     /const drawable = c => !!\(window\.STROKE_DATA && window\.STROKE_DATA\[c\]\);/.test(appSrc));
  ok('the box sets the character in type when it cannot be built',
     /function writerBox[\s\S]*?drawable\(char\)[\s\S]*?tian-plain/.test(appSrc));
  ok('and the stylesheet sizes it to sit in the 田字格',
     /\.tian-plain \{[^}]*place-items: center/.test(css));
  ok('the stroke-order and writing buttons are hidden rather than left to fail',
     /\$\{drawable\(ch\.c\) \? `[\s\S]*?data-act="animate"[\s\S]*?data-act="practise"[\s\S]*?` : ""\}/.test(appSrc));
  ok('and a note under the card says why', /class="note no-strokes"/.test(appSrc)
     && /\.no-strokes \{/.test(css));

  /* the guard is dormant only as long as the data is complete — if that ever
     stops being true, tools/audit-strokes.mjs is what says so */
  let bundle = null;
  try { const w = {}; new Function('window', read('js/strokes.js'))(w); bundle = w.STROKE_DATA; } catch { /* not bundled */ }
  const gaps = bundle ? HQ.filter(c => !bundle[c.c]).map(c => c.c) : null;
  ok('every character in the curriculum has stroke data right now',
     gaps && !gaps.length, gaps ? gaps.join(' ') : 'strokes.js unreadable');
}

console.log('\na sentence gets to finish before the card moves');
{
  /* Read them in context plays the line back when you answer it, and the next
     card's renderStep() calls stopPhrase() — so a flat 1400ms advance was
     what silenced the audio. Timed in the app: 我可以问你一个问题吗？ is
     4957ms of clips, so 1400 cut it off after 2.8 characters of ten. */
  const appSrc = read('js/app.js');
  ok('there is a shorter tail for after a line has played',
     /const PHRASE_TAIL_MS = \d+;/.test(appSrc));
  const tail = +(appSrc.match(/const PHRASE_TAIL_MS = (\d+);/) || [])[1];
  const flat = +(appSrc.match(/const AUTO_ADVANCE_MS = (\d+);/) || [])[1];
  ok('and it is shorter than the plain one, because you have already heard the line',
     tail > 0 && tail < flat, tail + ' vs ' + flat);
  ok('sayPhrase can tell you when it has finished',
     /function sayPhrase\(text, force, onDone\)/.test(appSrc));
  ok('and something already playing can be attached to',
     /function onPhraseEnd\(fn\) \{[\s\S]*?if \(!phraseActive\) return false;/.test(appSrc));
  ok('the advance waits for it', /function armAdvance\(/.test(appSrc));
  ok('and settle arms through that rather than a bare timeout',
     /armAdvance\(next/.test(appSrc) && !/advanceTimer = setTimeout\(next, AUTO_ADVANCE_MS\)/.test(appSrc));

  /* the three details that make it safe */
  ok('clearing an advance bumps a generation counter',
     /function clearAdvance\(\) \{[^}]*advanceGen\+\+/.test(appSrc));
  ok('and anything queued behind a line checks it before firing',
     (appSrc.match(/if \(gen !== advanceGen\) return;/g) || []).length >= 1);
  ok('a chain cut short drops its callback, so skipping cannot advance the next card early',
     /function stopPhrase\(\) \{[^}]*phraseEnd = null;/.test(appSrc));
  /* While the line plays the button reads as a plain Next, which is true:
     nothing is ticking, and pressing it still works. */
  ok('the Next button is not born with a countdown on it',
     /<button class="btn" id="cont" style=/.test(appSrc));
  ok('and gets one only when an advance is actually armed',
     /classList\.add\("btn-timed"\)/.test(appSrc));

  /* the second bug found in there */
  ok('the verdict replays the line that was read, not one character of it',
     /if \(item\.said\) sayPhrase\(item\.said, true\); else say\(ch\.c, true\);/.test(appSrc));
  ok('and the reading drill records what it said',
     /item\.said = spoken \|\| ch\.c;/.test(appSrc));
}

console.log('\nToday is a dashboard, not a scroll');
{
  /* Everything on Today is a choice about what to do next, so a page you have
     to scroll to see the choices hides half of them. Measured on a 1280x720
     laptop before: 1808px of page against 629px below the bars. Layout cannot
     be measured here, so this pins the structure; the numbers are in the
     commit. */
  const appSrc = read('js/app.js'), css = read('css/app.css'), html = read('index.html');
  ok('Today is laid out as a dashboard', /<div class="dash">/.test(appSrc));
  ok('the day\'s characters and the day\'s practice share an enclosure',
     /<div class="dash-today">[\s\S]*?<div class="dash-col">\$\{hero\}[\s\S]*?<div class="dash-col">\$\{todoBlock\}/.test(appSrc));
  ok('the side rail puts the word of the week above the flashcards',
     /<div class="dash-col dash-side">\$\{wotw\}\$\{decks\}<\/div>/.test(appSrc));
  ok('and Go deeper reads across the foot rather than eating a column',
     /<div class="dash-wide">\$\{deeper\}/.test(appSrc));
  ok('the columns are equal-height, so nothing hangs below the shortest',
     /\.dash \{ grid-template-columns[^}]*align-items: stretch/.test(css)
     && /\.dash-today > \.dash-col \{ height: 100%/.test(css));
  ok('and a narrow screen keeps its ordinary stacked cards',
     /\.dash \{ display: flex; flex-direction: column/.test(css));

  /* the one block that grew without bound */
  ok('the day\'s characters are a rail, not a wall', /<div class="learned-rail">/.test(appSrc));
  ok('it scrolls in one row rather than wrapping',
     /\.learned-strip \{[^}]*flex-wrap: nowrap[^}]*overflow-x: auto/s.test(css));
  ok('with arrows once there are more than fit', /LT_VISIBLE/.test(appSrc)
     && /class="lt-arrow"/.test(appSrc));
  ok('and a See all that spans the whole enclosure',
     /class="today-all"/.test(appSrc) && /\.dash-today \.today-all \{ grid-column: 1 \/ -1/.test(css));
  ok('which is glance-state, not a saved preference',
     /^let todayOpen = false;/m.test(appSrc) && !/state\.todayOpen/.test(appSrc));

  /* the template it writes, not the comment above it explaining the change */
  const tracker = appSrc.slice(appSrc.indexOf('$("#tracker").innerHTML'), appSrc.indexOf('function tallyMark'));
  /* the tracker */
  ok('the four-week tracker hangs off the streak chip',
     /<div class="streak-pop">[\s\S]*?class="chip chip-streak[\s\S]*?id="tracker"/.test(html));
  ok('and is no longer a bar of its own', !/<div class="tracker" id="tracker"><\/div>/.test(html));
  ok('it sizes to its contents rather than cropping the row it exists to show',
     /\.tracker \{[^}]*width: max-content/s.test(css));
  ok('a second click closes it even with the pointer still on the chip',
     /\.streak-pop\.shut \.tracker \{ opacity: 0/.test(css) && /classList\.toggle\("shut", !opening\)/.test(appSrc));
  ok('and it spends its words on what the chip does not say',
     /in a row/.test(tracker) && /best \$\{state\.streak\.best\}/.test(tracker) && !/🔥/.test(tracker));
}

console.log('\nthe day\'s block: the ring, the headline and the labels');
{
  const appSrc = read('js/app.js'), css = read('css/app.css');
  /* Every other ring and tick in this app is left-aligned — the practice list,
     Go deeper — and this one sat on the right on its own. */
  ok('the progress ring leads the hero rather than trailing it',
     /<div class="hero-top">\s*\$\{ring\}/.test(appSrc));
  /* "You're clear for today, Jen." wrapped to two lines in a dashboard column */
  ok('the headline is short enough for one line', /`All clear\$\{who\}\.`/.test(appSrc));
  ok('and is held to one line at dashboard width',
     /\.dash \.hero-title \{[^}]*white-space: nowrap/.test(css));

  /* New and Due did not say what they meant */
  ok('the queue pills say what they are', /To learn <b>/.test(appSrc) && /To review <b>/.test(appSrc)
     && /Done <b>/.test(appSrc));
  ok('and neither is called New or Due any more',
     !/qpill new">New /.test(appSrc) && !/qpill due">Due /.test(appSrc));
  ok('each explains whose decision it is',
     /Your daily goal/.test(appSrc) && /schedule's decision, not yours/.test(appSrc));

  /* the hero's slack is distributed, not pooled under the last block */
  ok('the hero distributes its slack rather than pooling it',
     /\.dash-today \.hero \{ justify-content: space-between/.test(css));
  ok('and the practice list distributes its rows over the column',
     /\.dash \.todo-list \{[^}]*justify-content: space-between/.test(css));
  ok('with room above the bar so it reads as a bar, not an underline',
     /\.dash \.todo-block \.bar \{ margin-top/.test(css));
}

console.log('\nno block borrows a class name that already means something');
{
  /* Day one looked padded out: three empty flashcard decks at 178px each
     instead of 60. oneDeck() marked an empty deck ".empty" — and .empty is a
     general-purpose empty-state panel in this stylesheet (text-align: center;
     flex-direction: column; padding: 2.5rem 1rem). It read as a layout
     problem and was not one.

     This is the second class-name collision in this app; .menu-head was the
     first. So: every class the markup asks for, checked against what the
     stylesheet says it means. */
  const appSrc = read('js/app.js'), sprintSrc = read('js/sprint.js'), css = read('css/app.css');
  ok('an empty deck has a name of its own', /deck-bare/.test(appSrc) && /\.deck-bare \{/.test(css));
  ok('and does not borrow the empty-state panel',
     !/class="deck deck-\$\{tone\} \$\{deck\.length \? "" : "empty"\}/.test(appSrc));

  /* .empty is still the panel it always was, and only panels use it */
  ok('.empty is still a full empty-state panel', /\.empty \{[^}]*padding: 2\.5rem/.test(css));
  /* as a whole token in the class list — learned-empty and wotw-empty are
     their own names and are not this one */
  const borrowers = [...(appSrc + sprintSrc).matchAll(/class="([^"]*)"/g)]
    .map(m => m[1]).filter(c => c.split(/\s+/).includes('empty'));
  ok('nothing uses it as a modifier on something else',
     borrowers.every(c => c.trim() === 'empty'), borrowers.join(' | '));
}

console.log('\nthe teaching card fits the screen it teaches on');
{
  /* charCard() is six blocks in a 34rem column. Stacked, that measured 1313px
     of reading inside a 592px window at 1280x720 — every one of 763
     characters overflowed, while ~700px of screen sat empty either side. You
     met a new character by scrolling past it. Layout cannot be measured here,
     so this pins the structure the measurement depends on; the numbers are in
     the commit. */
  const appSrc = read('js/app.js'), css = read('css/app.css');
  ok('the card wraps its two parts', /<div class="cardx">/.test(appSrc));
  ok('and its text blocks separately', /<div class="cardx-blocks">/.test(appSrc));
  const card = appSrc.slice(appSrc.indexOf('function charCard'), appSrc.indexOf('function bindCard'));
  ok('every block in the card is inside the text wrapper',
     (card.match(/<div class="block sheet">/g) || []).length === 5,
     (card.match(/<div class="block sheet">/g) || []).length + ' blocks');
  ok('the wrappers are balanced',
     (card.match(/<div /g) || []).length === (card.match(/<\/div>/g) || []).length,
     (card.match(/<div /g) || []).length + ' open, ' + (card.match(/<\/div>/g) || []).length + ' close');

  /* the intro's header is the character's own label, so it rides in the hero
     column rather than as a band above the card — 66px of the difference */
  ok('charCard takes a topper', /function charCard\(ch, \{ writerId, topper = "" \}\)/.test(appSrc));
  ok('and the session intro passes one',
     /charCard\(ch, \{ writerId: wid, topper \}\)/.test(appSrc));
  ok('the intro no longer puts a band above the card',
     !/body\.innerHTML = `\s*<div class="stack"[^`]*charCard/s.test(appSrc));

  /* the wide-screen layout itself */
  ok('a wide screen splits the card into character and text',
     /@media \(min-width: 1000px\)[\s\S]*?\.cardx \{[\s\S]*?grid-template-columns: 17rem/.test(css));
  ok('and balances the text into two columns, not a grid',
     /\.cardx-blocks \{ display: block; columns: 2/.test(css));
  ok('with each block kept whole',
     /\.cardx-blocks > \.block \{ break-inside: avoid/.test(css));
  ok('the gap is a margin, because column-gap is horizontal only',
     /\.cardx-blocks > \.block \{[^}]*margin: 0 0 \.9rem/.test(css));
  ok('the character stays put while you read about it',
     /\.cardx > \.card-hero \{ position: sticky/.test(css));
  ok('and the session column widens to hold it',
     /\.ses-inner, \.ses-foot-inner \{ max-width: 64rem/.test(css));
  /* narrow screens keep the single column — scrolling is right there */
  ok('a narrow screen is left stacked',
     /\.cardx \{ display: flex; flex-direction: column/.test(css));
}

console.log('\nsection headings are one convention, and hoverable');
{
  /* Two conventions used to coexist: sprint.js put Chinese first — 错字本
     Mistake notebook — while Today put it last or left it out. The convention
     is English first, Chinese second, because in a section heading the English
     is the label and the Chinese is a gloss on it. That is deliberately the
     opposite of the nav tabs and drill labels, where the Chinese *is* the
     label and stays in front. */
  const appSrc = read('js/app.js'), sprintSrc = read('js/sprint.js');
  const both = appSrc + sprintSrc;
  const eyebrows = [...both.matchAll(/<span class="eyebrow"[^>]*>([\s\S]*?)<\/span>\s*(?:<\/span>|<\/div>|`|\n)/g)]
    .map(m => m[1]);
  ok('there are section headings to check', eyebrows.length > 15, eyebrows.length + ' found');
  /* no heading may open with Chinese, and none may carry a raw .han span */
  const chineseFirst = eyebrows.filter(t => /^\s*(?:<span class="han">)?\s*[\u4e00-\u9fff]/.test(t));
  ok('no heading leads with the Chinese', !chineseFirst.length, chineseFirst.join(' | '));
  const rawHan = eyebrows.filter(t => /<span class="han">/.test(t));
  ok('and none sets its Chinese by hand instead of through hanLabel()',
     !rawHan.length, rawHan.join(' | '));
  const glossed = eyebrows.filter(t => /hanLabel\(/.test(t));
  ok(`nearly every heading carries a Chinese gloss (${glossed.length} of ${eyebrows.length})`,
     glossed.length >= eyebrows.length - 1);

  /* the point of hanLabel is that the characters are hoverable */
  ok('hanLabel makes each character hoverable',
     /const hanLabel = str =>[\s\S]*?data-ch="\$\{esc\(c\)\}"/.test(appSrc));
  ok('and the stylesheet sets it quieter than the English it follows',
     /\.eyebrow \.han-label \{[^}]*text-transform: none/.test(read('css/app.css')));
  ok('with a cursor that says it can be looked up',
     /\.eyebrow \.han-label \[data-ch\] \{ cursor: help/.test(read('css/app.css')));

  /* every character used in a heading has to have something to say on hover */
  const inHeadings = new Set();
  for (const m of both.matchAll(/hanLabel\("([^"]+)"\)/g))
    [...m[1]].forEach(c => { if (/[\u4e00-\u9fff]/.test(c)) inHeadings.add(c); });
  ok('every heading character is a real character', inHeadings.size > 20, inHeadings.size + ' distinct');
  const silent = [...inHeadings].filter(c => !api.CHAR_INDEX[c] && !api.EXTRA_GLOSS[c]);
  ok('and every one of them has a gloss to show', !silent.length, silent.join(' '));
}

console.log('\nuntaught characters on screen still have something to say');
{
  /* The tooltip was built only from the curriculum, so anything printed
     without being taught — menu dishes, example words, sentences, the word of
     the week, the Chinese in the headings — had no tooltip at all. Hovering a
     dish and being told nothing reads as broken rather than as out of scope. */
  const EXTRA = api.EXTRA_GLOSS;
  ok('there is a generated gloss table', EXTRA && Object.keys(EXTRA).length > 200,
     EXTRA ? Object.keys(EXTRA).length + ' glosses' : 'missing');
  ok('and it is generated, not hand-written',
     /Generated by tools\/fetch-glosses\.mjs/.test(read('js/data.js')));
  ok('nothing in it is already taught',
     !Object.keys(EXTRA).some(c => api.CHAR_INDEX[c]),
     Object.keys(EXTRA).filter(c => api.CHAR_INDEX[c]).join(' '));
  ok('every entry has a reading and a sense',
     Object.values(EXTRA).every(v => Array.isArray(v) && v[0] && v[1]));
  ok('no gloss is longer than a tooltip line',
     Object.values(EXTRA).every(v => v[1].length <= 56),
     Object.entries(EXTRA).filter(([, v]) => v[1].length > 56).map(([c]) => c).join(' '));
  ok('and none of them explains Chinese with Chinese',
     !Object.values(EXTRA).some(v => /[\u4e00-\u9fff]/.test(v[1])),
     Object.entries(EXTRA).filter(([, v]) => /[\u4e00-\u9fff]/.test(v[1])).map(([c]) => c).join(' '));

  /* what the app actually prints without teaching it */
  const printed = new Set();
  const add = t => [...String(t || '')].forEach(c => { if (/[\u4e00-\u9fff]/.test(c)) printed.add(c); });
  add(MENU.title); add(MENU.name);
  MENU.sections.forEach(s => { add(s.head); s.items.forEach(i => { add(i[0]); if (i[4]) add(i[4][0]); }); });
  (MENU.phrases || []).forEach(p => add(p[0]));
  add(MENU.specials.head); MENU.specials.items.forEach(i => add(i[0])); add(MENU.specials.note[0]);
  HQ.forEach(ch => { ch.words.forEach(w => add(w[0])); add(ch.sent[0]); });
  Object.values(api.INTERESTS).forEach(c => c.words.forEach(w => add(w[0])));
  api.FESTIVALS.forEach(f => f.words.forEach(w => add(w[0])));
  const untaught = [...printed].filter(c => !CHAR_INDEX[c]);
  const mute = untaught.filter(c => !EXTRA[c]);
  ok(`${untaught.length} characters are printed without being taught`, untaught.length > 0);
  ok('and every one of them can be hovered for an answer', !mute.length, mute.join(' '));

  /* the code path that shows it */
  const appSrc = read('js/app.js');
  ok('gloss() consults the generated table', /EXTRA_GLOSS\[c\]/.test(appSrc));
  ok('and the tooltip falls back to it instead of bailing out',
     /if \(!ch\) \{[\s\S]{0,400}?Not in the curriculum/.test(appSrc));
}

console.log('\nthe display face draws an ordinary J');
{
  /* Fraunces draws a J that drops below the baseline and curls left, and the
     one heading that addresses the learner by name — "Ready when you are,
     Jen." — is display type, so it is exactly where it shows. Pinning the WONK
     axis does nothing: Google Fonts serves an instanced face per weight and
     the axis is not in the file, and the stylistic sets leave the J alone.
     The only fix is a different family, so the family is what is pinned. */
  const css = read('css/app.css'), html = read('index.html');
  ok('the display family is Newsreader', /--f-display:\s*"Newsreader"/.test(css));
  ok('and Fraunces is gone from the stylesheet and the page',
     !/Fraunces/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')) && !/Fraunces/.test(html));
  ok('the font request asks for the family the stylesheet names',
     /family=Newsreader:opsz,wght@6\.\.72,500;6\.\.72,600;6\.\.72,700/.test(html));
  ok('nothing tries to pin a variation axis that is not served',
     !/font-variation-settings/.test(css));
  /* the headline that made this visible */
  ok('a headline still addresses the learner by name',
     /Ready when you are\$\{who\}/.test(read('js/app.js')));
}

console.log('\nthe radical cards count the form they print');
{
  /* RADICALS[].strokes is prose beside a glyph, and the glyph is `form` — the
     squeezed shape, not the dictionary key. 心 is four strokes and 忄 is
     three; the card shows 忄, so "3 strokes" is the true statement and the
     entry said 4. tools/audit-strokes.mjs found that by deriving every count
     from Make Me a Hanzi; this pins the answers so the fix cannot quietly
     come undone between audits.

     23 of the 30 printed forms are characters in their own right and are
     checked against the bundle directly. The other seven are left-edge forms
     with no glyph entry anywhere — 亻 and 氵 are not characters — so their
     counts are pinned here, each one derived by the audit from a character
     built out of it (忄 from 忙, 氵 from 汉, and so on). Run
     `node tools/audit-strokes.mjs` to re-derive them from upstream. */
  const SQUEEZED = { "亻": 2, "氵": 3, "忄": 3, "扌": 3, "饣": 3, "刂": 2, "衤": 5 };
  let bundle = null;
  try { const w = {}; new Function('window', read('js/strokes.js'))(w); bundle = w.STROKE_DATA; } catch { /* not bundled */ }
  const wrong = [], unchecked = [];
  for (const [key, r] of Object.entries(api.RADICALS)) {
    const form = r.form || key;
    const n = bundle && bundle[form] ? bundle[form].strokes.length
            : SQUEEZED[form] !== undefined ? SQUEEZED[form] : null;
    if (n === null) { unchecked.push(key + ' ' + form); continue; }
    if (n !== r.strokes) wrong.push(`${key} prints ${form}, says ${r.strokes}, is ${n}`);
  }
  ok(`every radical card states the stroke count of the form it prints (${Object.keys(api.RADICALS).length} cards)`,
     !wrong.length, wrong.join('; '));
  ok('and every printed form has something to check it against', !unchecked.length, unchecked.join(' '));
  /* the audit is the thing that derives these from upstream — it has to exist */
  const audit = read('tools/audit-strokes.mjs');
  ok('the stroke audit covers all five passes',
     ['coverage', 'simplified forms', 'stated stroke counts', 'structure', 'components']
       .every(p => audit.includes(p)));
}

console.log('\nno drill shows a character you have not met');
{
  /* The build-the-word drill filtered its target on CHAR_INDEX — is this in
     the library — rather than isKnown, and drew its distractor tiles from the
     whole library regardless. Ninety-nine rounds in a hundred put at least one
     unseen character in front of the learner, which makes the wrong answers
     noise rather than choices. The gap drill had the same fault more quietly.

     This can only be checked properly in the browser, where renderDrill lives.
     What is asserted here is the data condition it relies on: that every
     character has a word it can be drilled with, and soon. */
  /* How long a character waits for a pairing it could actually be drilled
     with — not whether it waits at all.

     This used to ask a yes/no question, and count a single-character "word"
     as an answer to it. That cannot tell a wait of one character from a wait
     of sixteen, and a wait of one is not a problem in any sense: 你 and 好
     cannot both be first, and whichever loses is ready in the same session.
     Measuring the wait, over pairings that are genuinely two characters or
     more, says the thing worth knowing — and it came out stricter rather than
     looser.

     Stage 1 is excluded from the tight bound because at that point almost
     nothing has been taught and the question is meaningless — 目 waits 15 and
     could not do otherwise — but it is still held to the outer one, so
     nothing can be stranded there. */
  const cjk = t => [...String(t)].filter(c => /[\u4e00-\u9fff]/.test(c));
  const at = new Map(HQ.map((c, i) => [c.c, i]));
  const waitFor = ch => {
    const ready = ch.words
      .filter(w => cjk(w[0]).length > 1 && cjk(w[0]).every(x => at.has(x)))
      .map(w => Math.max(...cjk(w[0]).map(x => at.get(x))));
    return ready.length ? Math.max(0, Math.min(...ready) - at.get(ch.c)) : Infinity;
  };
  const DAY = 5;                       /* one session's worth of new characters */
  const all = HQ.map(waitFor);
  ok('every character eventually gets a word made only of taught characters',
     all.every(w => w < Infinity), HQ.filter((_, i) => all[i] === Infinity).map(c => c.c).join(' '));
  const slow = HQ.filter((_, i) => all[i] > DAY * 14);
  ok('and none waits more than a fortnight of sessions for it', !slow.length,
     slow.map(c => c.c).join(' '));

  const past = HQ.filter(ch => ch.stage > 1);
  const waits = past.map(waitFor);
  const within = waits.filter(w => w <= DAY).length;
  ok('past the first stage, nearly all are drillable within a session',
     within > past.length * 0.9, `${within} of ${past.length} wait ${DAY} characters or fewer`);
  {
    const worst = HQ.map((ch, i) => ({ c: ch.c, w: all[i] })).sort((a, b) => b.w - a.w).slice(0, 3);
    console.log(`    longest waits: ${worst.map(x => `${x.c} ${x.w}`).join(', ')}`);
  }
  /* a word is only useful as a drill if it actually contains its character */
  const off = HQ.filter(ch => ch.words.some(w => !w[0].includes(ch.c)));
  ok('every word listed under a character contains it', !off.length,
     off.slice(0, 8).map(c => c.c).join(''));
  /* a character listed as its own word teaches nothing as a pairing, and the
     gap and build drills both need two characters to work with */
  const selfy = HQ.filter(ch => ch.words.some(w => w[0] === ch.c));
  ok('and none is just the character over again', !selfy.length,
     selfy.map(c => c.c).join(''));
  const dupes = HQ.filter(ch => new Set(ch.words.map(w => w[0])).size !== ch.words.length);
  ok('no character lists the same word twice', !dupes.length,
     dupes.map(c => c.c).join(''));
  const multi = HQ.filter(ch => !ch.words.some(w => cjk(w[0]).length > 1));
  ok('every character has at least one multi-character pairing', !multi.length,
     multi.map(c => c.c).join(''));
  /* the pinyin should have roughly one syllable per character */
  const odd = [];
  HQ.forEach(ch => ch.words.forEach(w => {
    const n = cjk(w[0]).length;
    const v = (w[1].match(/[aeiou\u00e0-\u01dc]+/gi) || []).length;
    if (v && Math.abs(v - n) > 1) odd.push(ch.c + ' ' + w[0] + '=' + w[1]);
  }));
  ok('and pinyin syllables line up with characters', !odd.length, odd.slice(0, 6).join(' '));
}

console.log('\nthe trackpad lets go');
{
  /* Pointer lock is the browser's, not ours. padStop() used to tear down the
     brush, the hint and every listener while leaving the lock held, so the
     cursor stayed captured and the only way out was Escape — the key the
     browser handles itself. None of this can run under node, so what is
     asserted is the shape of the code that fixes it. */
  const app = read('js/app.js');
  const stop = app.slice(app.indexOf('function padStop()'));
  const body = stop.slice(0, stop.indexOf('\n}'));
  ok('padStop releases the pointer lock', /exitPointerLock/.test(body));
  ok('and detaches its change listener before doing so',
     body.indexOf('removeEventListener("pointerlockchange"') < body.indexOf('exitPointerLock'));
  /* Handing the brush to a new square must not drop the lock and ask for it
     back: browsers rate-limit a re-request landing in the cooldown after an
     unlock, and re-requesting a lock already held fires no event at all, so
     padArm never runs and the trackpad goes dead. */
  ok('a handoff retargets instead of restarting', /function padHandoff/.test(app));
  ok('and the notebook hands off rather than stopping',
     /padHandoff\(\$\("\.tian", sq\)/.test(app));
  const nbSwitch = app.slice(app.indexOf('data-nbsrc]').valueOf());
  ok('changing exercise no longer tears the lock down',
     !/padStop\(\); nb\.word = null/.test(app));
}

console.log('\npinyin on the pairings');
{
  /* A pairing's pinyin should be the readings of its own characters, in order.
     Typing 1,600-odd of them by hand, that is the kind of slip nothing else
     would catch — and the one thing a learner has no way to sanity-check. */
  const dict = new Map();
  for (const line of read('tools/.mmah-dictionary.txt').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    dict.set(o.character, o);
  }
  /* Characters with more than one reading, which neither our own entry nor the
     dictionary reliably lists in full. 儿 carries the empty string and "r" for
     erhua, where it fuses onto the syllable before it: 这儿 is zhèr. */
  const ALT = JSON.parse(read('tools/alt-readings.json'));
  const bare = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\u00fc/g, 'v').replace(/[^a-z]/g, '');
  const cjk = t => [...String(t)].filter(c => /[\u4e00-\u9fff]/.test(c));

  const readings = new Map();
  HQ.forEach(c => {
    const set = new Set([bare(c.p)]);
    (dict.get(c.c)?.pinyin || []).forEach(x => set.add(bare(x)));
    (ALT[c.c] || []).forEach(x => set.add(bare(x)));
    readings.set(c.c, set);
  });

  const bad = [];
  let checked = 0;
  HQ.forEach(ch => ch.words.forEach(w => {
    const gl = cjk(w[0]);
    if (!gl.every(g => readings.has(g))) return;      /* has an untaught character */
    let rest = bare(w[1]), ok = true;
    for (const g of gl) {
      const hit = [...readings.get(g)].sort((a, b) => b.length - a.length)
        .find(o => rest.startsWith(o));
      if (hit === undefined) { ok = false; break; }
      rest = rest.slice(hit.length);
    }
    checked++;
    if (!ok || rest.length) bad.push(ch.c + ' ' + w[0] + ' "' + w[1] + '"');
  }));
  ok(`${checked} pairings have checkable pinyin`, checked > HQ.length);
  ok('and every one reads as its own characters do', !bad.length, bad.slice(0, 6).join('  '));
}

console.log('\nnothing gives the answer away');
{
  const cjk = t => [...String(t)].filter(c => /[\u4e00-\u9fff]/.test(c));
  /* The recall and writing drills show a character's meaning as the hint and
     ask you to produce the character. A meaning with Chinese in it therefore
     hands over the answer — 什 was glossed "what (in 什么)". */
  const leaky = HQ.filter(ch => cjk(ch.m).length);
  ok('no character meaning contains Chinese', !leaky.length,
     leaky.map(c => c.c + '=' + c.m).join(' '));
  /* The build-the-word drill shows the English meaning and asks you to
     assemble the characters. */
  const wordy = [];
  HQ.forEach(ch => ch.words.forEach(w => { if (cjk(w[2]).length) wordy.push(w[0] + '=' + w[2]); }));
  ok('no pairing meaning contains Chinese', !wordy.length, wordy.slice(0, 6).join(' '));
  /* A definition that is only the romanisation teaches nothing: 北京 glossed
     "Beijing" says no more than the pinyin already showing above it. Proper
     nouns are allowed one, but should carry a literal sense as well. */
  const bareOf = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z]/g, '');
  const echo = [];
  HQ.forEach(ch => ch.words.forEach(w => {
    const p = bareOf(w[1]), m = bareOf(w[2]);
    if (p.length > 3 && m === p) echo.push(w[0] + ' ' + w[1] + ' = ' + w[2]);
  }));
  ok('and none is purely its own romanisation', !echo.length, echo.slice(0, 6).join('  '));

  /* A word is listed under every character it contains, so the same word is
     written out two or three times. Those copies drifted apart: 北京 was
     "Beijing (northern capital)" under 北 and plain "Beijing" under 京, and
     汉字 was capitalised under one and not the other. A learner meeting the
     same word twice should meet the same word. */
  const byWord = new Map();
  HQ.forEach(ch => ch.words.forEach(w => {
    const e = byWord.get(w[0]) || [];
    e.push({ under: ch.c, pin: w[1], mean: w[2] });
    byWord.set(w[0], e);
  }));
  const repeated = [...byWord.entries()].filter(([, v]) => v.length > 1);
  const pinSplit = repeated.filter(([, v]) => new Set(v.map(x => x.pin)).size > 1);
  const meanSplit = repeated.filter(([, v]) => new Set(v.map(x => x.mean)).size > 1);
  ok(`${repeated.length} words are listed under more than one character`, repeated.length > 0);
  ok('and each reads the same wherever it appears', !pinSplit.length,
     pinSplit.slice(0, 5).map(([w, v]) => w + ' ' + v.map(x => x.pin).join('/')).join('  '));
  ok('and means the same wherever it appears', !meanSplit.length,
     meanSplit.slice(0, 5).map(([w, v]) => w + ' ' + v.map(x => JSON.stringify(x.mean)).join('/')).join('  '));
}

console.log('\nseasonal words');
ok('every festival word is complete', api.FESTIVALS.every(f =>
  f.words.every(w => w.length === 4 && w.every(part => part && String(part).trim()))));
ok('every festival has enough words to not repeat for years',
   api.FESTIVALS.every(f => f.words.length >= 5),
   api.FESTIVALS.filter(f => f.words.length < 5).map(f => f.key).join(' '));
ok('a fixed-date festival resolves', !!api.festivalDate(api.FESTIVALS.find(f => f.key === 'christmas'), 2027));
ok('a lunar one resolves from its table', !!api.festivalDate(api.FESTIVALS.find(f => f.key === 'spring'), 2027));
ok('and declines to guess outside it', !api.festivalDate(api.FESTIVALS.find(f => f.key === 'spring'), 2099));
ok('christmas week is detected', api.festivalThisWeek(new Date('2026-12-25T12:00:00'))?.key === 'christmas');
ok('an ordinary week is not', !api.festivalThisWeek(new Date('2026-05-06T12:00:00')));
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {state,load,wordOfWeek,wotwEntry,FESTIVALS};')();
  globalThis.localStorage._d = {};
  fresh.load();
  fresh.state.interests = ['food'];
  const picks = [];
  for (let y = 2026; y <= 2031; y++) {
    fresh.state.wotw = null;
    const e = fresh.wotwEntry(fresh.wordOfWeek(new Date(y + '-12-25T12:00:00')));
    picks.push(e.word[0]);
    if (!e.festival) picks.push('NOT-A-FESTIVAL-WORD');
  }
  ok('christmas week teaches a christmas word', !picks.includes('NOT-A-FESTIVAL-WORD'));
  ok('and a different one every year', new Set(picks).size === picks.length, picks.join(' '));
  /* the interest pool may cycle; festival history may not be wiped */
  const hist = fresh.state.wotwPast.filter(x => x.startsWith('f:'));
  ok('festival history is kept', hist.length === 6);
}
ok('a festival word shows even with no interests picked', (() => {
  const f2 = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {state,load,wordOfWeek,wotwEntry};')();
  globalThis.localStorage._d = {};
  f2.load();
  f2.state.interests = [];
  const e = f2.wotwEntry(f2.wordOfWeek(new Date('2026-12-25T12:00:00')));
  return !!e && e.festival;
})());
ok('and no interests in an ordinary week means no word', (() => {
  const f3 = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {state,load,wordOfWeek};')();
  globalThis.localStorage._d = {};
  f3.load();
  f3.state.interests = [];
  return f3.wordOfWeek(new Date('2026-05-06T12:00:00')) === null;
})());

console.log('\ntiers gate the library');
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,TIERS,TIER_UNLOCK,state,load,introduce,tierProgress,tierUnlocked,tierNeeds,unlockedCeiling,isLocked,nextNew,remainingNew,tierFrom,tierChars,tierOf,placeKnown};')();
  globalThis.localStorage._d = {};
  fresh.load();
  ok('tiers run to the literacy milestones', fresh.TIERS.map(t => t.to).join() === '200,500,1000');
  ok('they tile the curriculum with no gaps',
     fresh.TIERS.every((t, i) => fresh.tierFrom(t) === (i ? fresh.TIERS[i - 1].to : 0)));
  ok('tier 1 is open from the start', fresh.tierUnlocked(fresh.TIERS[0]));
  ok('tier 2 is not', !fresh.tierUnlocked(fresh.TIERS[1]));
  ok('the ceiling starts at the first tier', fresh.unlockedCeiling() === 200);
  ok('a character past it is locked', fresh.isLocked(fresh.HQ[250].c));
  ok('one inside it is not', !fresh.isLocked(fresh.HQ[10].c));
  ok('new characters never come from beyond the gate',
     fresh.nextNew(500).every(c => fresh.HQ.find(x => x.c === c).i < 200));
  ok('and "remaining" counts only what you may start',
     fresh.remainingNew() === 200);
  ok('the gate says what would open it', (() => {
    const nd = fresh.tierNeeds(fresh.TIERS[1]);
    return nd && nd.tier.n === 1 && nd.more === Math.ceil(200 * fresh.TIER_UNLOCK);
  })());
  /* learn enough of tier 1 and the door opens */
  fresh.HQ.slice(0, Math.ceil(200 * fresh.TIER_UNLOCK)).forEach(ch => fresh.introduce(ch.c));
  ok('reaching the threshold unlocks the next tier', fresh.tierUnlocked(fresh.TIERS[1]));
  /* the ceiling stops at the end of the last OPEN tier, or the end of what is
     written — whichever comes first. Pinning it to HQ.length was only right
     while the library stopped inside tier 2. */
  ok('and the ceiling moves with it',
     fresh.unlockedCeiling() === Math.min(fresh.TIERS[1].to, fresh.HQ.length),
     String(fresh.unlockedCeiling()));
  ok('what was locked no longer is', !fresh.isLocked(fresh.HQ[250].c));
  ok('the tier after that stays shut', !fresh.tierUnlocked(fresh.TIERS[2]));
  ok('and anything inside it is still locked',
     fresh.HQ.length <= fresh.TIERS[1].to || fresh.isLocked(fresh.HQ[fresh.TIERS[1].to + 1].c));
  ok('a tier knows what it is aiming at even before it is written',
     fresh.tierProgress(fresh.TIERS[2]).planned === fresh.TIERS[2].to - fresh.TIERS[1].to);
  ok('and never reports more built than planned',
     fresh.TIERS.every(t => fresh.tierProgress(t).built <= fresh.tierProgress(t).planned));
}
{
  /* placement credits past a gate, and that is what opens it */
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,TIERS,state,load,placeKnown,tierUnlocked,unlockedCeiling};')();
  globalThis.localStorage._d = {};
  fresh.load();
  fresh.placeKnown(fresh.HQ.slice(0, 300).map(ch => ch.c));
  ok('a placement past tier 1 opens tier 2', fresh.tierUnlocked(fresh.TIERS[1]));
  ok('and the ceiling follows',
     fresh.unlockedCeiling() === Math.min(fresh.TIERS[1].to, fresh.HQ.length));
}

console.log("\nthe Library's stage chips reach every stage");
{
  /* The chips are "s" + the stage number, and the filter used to read that
     number as libFilter[1] behind a `length === 2` guard. With thirteen
     stages, s10 to s13 failed the guard, the clause never ran, and four chips
     lit up while showing the whole library. */
  const appjs = read('js/app.js');
  ok('the single-digit guard is gone', !/libFilter\.length === 2/.test(appjs));
  const lit = (appjs.match(/\/\^s\(\\d\+\)\$\//) || [])[0];
  ok('the stage key is matched by digits, not by length', !!lit, lit || 'not found');
  const re = new RegExp('^s(\\d+)$');

  /* the chip keys the page actually builds, checked against the curriculum */
  const keys = STAGES.map(st => 's' + st.n);
  const parsed = keys.map(k => (re.exec(k) || [])[1]);
  ok('every stage chip parses', parsed.every((n, i) => +n === STAGES[i].n),
     keys.filter((k, i) => +parsed[i] !== STAGES[i].n).join(' ') || 'all');
  ok('including the double-digit ones', STAGES.some(st => st.n >= 10) && +re.exec('s13')[1] === 13);
  /* and each one picks out its own stage rather than the whole library */
  const picked = STAGES.map(st => HQ.filter(ch => ch.stage === +re.exec('s' + st.n)[1]).length);
  ok('and selects only its own characters', picked.every((n, i) => n > 0 && n < HQ.length),
     picked.join(' '));
  ok('the stages between them account for the whole library',
     picked.reduce((a, b) => a + b, 0) === HQ.length, picked.reduce((a, b) => a + b, 0) + ' of ' + HQ.length);
  /* "strong" also begins with s, and must not be read as a stage */
  ok('a filter that merely starts with s is not a stage', !re.test('strong'));
}

console.log('\nthe tally stays in its corner');
{
  /* tallyRow(n, max) draws complete 正 up to `max` and then collapses to one
     mark and a multiplier. The default of 6 was chosen for a page that could
     scroll, and in a fixed corner it fails at *particular* counts rather than
     large ones: 50 reps came out as 正 × 10 and fitted, while 31 drew seven
     glyphs — measured at 209px against 117px for the capped row. */
  const appjs = read('js/app.js');
  const src = appjs.slice(appjs.indexOf('function tallyRow'));
  const body = src.slice(0, src.indexOf('\n}\n') + 3);
  const glyphs = new Function('tallyMark', body + '\nreturn tallyRow;')(n => '<m' + n + '>');
  const count = (n, max) => ((glyphs(n, max).match(/<m\d>/g) || []).length);

  ok('the Go deeper corner asks for a cap', /tallyRow\(exToday, 3\)/.test(appjs));
  /* the counts that used to draw a seventh glyph, and the ones that never did */
  const swept = [15, 16, 20, 26, 31, 34, 50, 120, 400];
  ok('no count draws more than four glyphs at the corner\'s cap',
     swept.every(n => count(n, 3) <= 4),
     swept.map(n => n + ':' + count(n, 3)).join(' '));
  ok('and 31 in particular is three marks and a multiplier, not seven marks',
     count(31, 3) === 1 && /× 6 \+ 1/.test(glyphs(31, 3)), glyphs(31, 3));
  ok('the uncapped default is what it used to be, for pages that can scroll',
     count(31) === 7);
  ok('a corner that fits is left as it is', count(15, 3) === 3 && count(5, 3) === 1);
  ok('and no reps at all still says so', /no reps yet today/.test(glyphs(0, 3)));
  /* CSS side: the corner is bounded and a mark never wraps onto a second line */
  const css = read('css/app.css');
  ok('the corner has a width it cannot exceed', /\.deeper-count \{[^}]*max-width:/.test(css));
  ok('and the row of marks never wraps', /\.tally-row \{[^}]*flex-wrap: nowrap/.test(css));
}

console.log('\nevery speakable button has something listening');
{
  /* `data-speak` was on the menu's five "Say it out loud" phrases from the
     start and nothing anywhere ever listened for it — a row of buttons that
     did nothing at all. app.js needs a browser, so this reads the source: the
     attribute and its reader have to travel together. */
  const appjs = read('js/app.js');
  const emitted = (appjs.match(/data-speak=/g) || []).length;
  ok('the markup still marks phrases as speakable', emitted > 0, emitted + ' emitted');
  ok('and a listener reads dataset.speak', /\bdataset\.speak\b/.test(appjs));
  ok('it is a delegated listener, so markup rendered later is covered',
     /document\.addEventListener\("click"[\s\S]{0,200}?closest\("\[data-speak\]"\)/.test(appjs));
  ok('it speaks even with audio off, because the click is the request',
     /sayPhrase\(text, true\)/.test(appjs));
  ok('and init wires it up', /^\s*initSpeakables\(\);/m.test(appjs));
  ok('a click that makes no sound still reads as a click',
     /classList\.add\("said"\)/.test(appjs) && /\.phrase\.said/.test(read('css/app.css')));
}

console.log('\nspace moves you on; it does not answer for you');
{
  /* app.js needs a browser, so this reads the source. #skipW was in the
     space-bar target list, which on a writing drill — the one that comes
     straight after meeting a character — meant two taps of space gave up on
     the quiz without a stroke being written: the first dismissed the card, the
     second hit "Show me the strokes". */
  const appjs = read('js/app.js');
  const adv = appjs.match(/const go2 = [^;]+;/g) || [];
  ok('the session has one space-bar target list', adv.length === 1, adv.length + ' found');
  ok('and the writing skip is not on it', !/#skipW/.test(adv[0] || '#skipW'), adv[0]);
  ok('it still advances the cards that are meant to advance',
     ['#cont', '#gotIt', '#fin', '#again'].every(id => (adv[0] || '').includes(id)), adv[0]);
  /* a held key must not run ahead into whatever renders next */
  ok('and space is swallowed while a drill is still open',
     /else if \(session\.queue\[session\.idx\]\?\.t === "drill"\) e\.preventDefault\(\);/.test(appjs));
  /* skipping is still available — on its own key, where it is a decision */
  ok('S is still how you ask for the strokes',
     (appjs.match(/=== "s"\) \{ e\.preventDefault\(\); \(\$\("#skipW"\) \|\| \$\("#againW"\)\)\?\.click\(\); \}/g) || []).length === 2);
}

console.log('\nstudying ahead: today only');
{
  const a = new Function(
    read('js/data.js') + '\n' + read('js/srs.js') + '\n' +
    'return {state,load,blank,save,today,dayKey,studyAhead,aheadToday,dayGoal,newLeftToday,goalMet,nextNew,introduce,tally,remainingNew};')();
  /* load() REASSIGNS the module-level `state`, so the object handed back in
     the harness snapshot goes stale the moment it is called. Always read the
     record load() returns, never `a.state`. */
  const reset = (over = {}) => {
    globalThis.localStorage._d['hanzi-quest-v1'] = JSON.stringify(Object.assign(a.blank(), over));
    return a.load();
  };

  let st = reset();
  const base = st.goalNew;
  ok('the day starts on the standing goal', a.dayGoal() === base);
  a.studyAhead(5);
  ok('asking for more deals more today', a.dayGoal() === base + 5);
  ok('but the setting is untouched', st.goalNew === base);
  a.studyAhead(5);
  ok('and twice is still the setting', st.goalNew === base && a.dayGoal() === base + 10);

  /* tomorrow: the same record, read on a different day */
  const tomorrow = new Date(a.dayKey() + 'T12:00:00');
  tomorrow.setDate(tomorrow.getDate() + 1);
  const k2 = a.dayKey(tomorrow);
  ok('the extra belongs to the day it was asked for', !(st.days[k2] && st.days[k2].ahead));

  /* a finished day stays finished */
  st = reset();
  a.nextNew(st.goalNew).forEach(c => { a.introduce(c); a.tally('new'); });
  const was = a.goalMet();
  a.studyAhead(5);
  ok('a day that was done is still done after asking for more', was && a.goalMet() === was);

  /* ---- the runaway ----

     The second half of the same bug, and the half that survives fixing the
     setting. nextNew(n) returns the next n characters you have NEVER seen, so
     it cannot see what today already taught you: dealing nextNew(dayGoal()) on
     a finished day of five handed out ten more. Click, finish, click, finish,
     and the day went 5 -> 15 -> 30 -> 50 while the hero counted down a
     different number from the one the session dealt. */
  st = reset();
  const round = () => {
    const owed = a.newLeftToday();
    a.nextNew(owed).forEach(c => { a.introduce(c); a.tally('new'); });
    return owed;
  };
  const first = round();
  ok('the first session deals the standing goal', first === base, 'dealt ' + first);
  ok('and the day is then clear', a.newLeftToday() === 0);

  const dealt = [];
  for (let i = 0; i < 4; i++) { a.studyAhead(5); dealt.push(round()); }
  ok('every study-ahead round deals exactly five', dealt.every(n => n === 5), dealt.join(','));
  ok('so four rounds taught 5 + 20, not 5 -> 15 -> 30 -> 50',
     st.days[a.dayKey()].new === base + 20, 'learned ' + st.days[a.dayKey()].new);
  ok('and the setting never moved through any of it', st.goalNew === base);
}

console.log('\nthe setting repairs itself');
{
  const a = new Function(
    read('js/data.js') + '\n' + read('js/srs.js') + '\n' +
    'return {load,blank,GOAL_MIN,GOAL_MAX};')();
  const stored = goalNew => {
    globalThis.localStorage._d['hanzi-quest-v1'] = JSON.stringify(Object.assign(a.blank(), { goalNew }));
    return a.load().goalNew;
  };
  /* what a record left by the old `goalNew += 5` actually looks like */
  ok('a goalNew the stepper cannot produce goes back to the default',
     stored(60) === a.blank().goalNew, 'got ' + stored(60));
  ok('but a number someone could have chosen is left alone', stored(12) === 12);
  ok('and neither is zero a setting', stored(0) === a.blank().goalNew);
  ok('the stepper range is the one the repair uses', a.GOAL_MIN === 1 && a.GOAL_MAX === 30);
}

console.log('\nstreak safety');
api.setState ? 0 : 0;
ok('days studied counts every active day', typeof api.daysStudied() === 'number' && api.daysStudied() >= 1);

console.log('\nreset leaves nothing behind');
/* Object.assign(state, blank()) only overwrites the keys blank() declares, so
   anything the record grew afterwards survived a "reset everything". */
api.nextNew(3).forEach(api.introduce);
api.state.menuPick = { d: api.dayKey(), c: api.MENU_CHARS[0], done: false };
api.state.lastBackup = 1;
api.state.somethingAddedLater = 'still here';
api.save();
ok('there is something to clear', Object.keys(api.state.chars).length > 0);
const fresh = api.resetProgress();
ok('characters are gone', Object.keys(fresh.chars).length === 0);
ok('days are gone', Object.keys(fresh.days).length === 0);
ok('the streak is gone', fresh.streak.cur === 0 && fresh.streak.last === null);
ok('settings are back to their defaults', fresh.goalNew === api.blank().goalNew);
const strays = Object.keys(fresh).filter(k => !(k in api.blank()));
ok('no key outlives the reset', !strays.length, strays.join(' '));
const stored = JSON.parse(globalThis.localStorage.getItem('hanzi-quest-v1'));
ok('and the stored copy matches', !Object.keys(stored).some(k => !(k in api.blank())));
ok('the tour is due again', fresh.tour === false);

/* ---------- sprint ----------

   js/sprint.js is DOM-free at the top level — every line of it that touches
   the page is inside a function — so it runs here alongside the other two,
   which is what lets the cross-file names be pinned rather than hoped for. */

console.log('\nsprint: the record behind the sheets');
{
  const sprintSrc = read('js/sprint.js');
  const appSrc = read('js/app.js');
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') + '\n' + sprintSrc +
    '\nreturn {HQ,state,load,save,introduce,grade,rec,dayKey,addDays,knownChars,' +
    'sprintState,sprintMark,sprintTrouble,sprintFluent,sprintForget,rightRun,sprintMisses,sprintHits,' +
    'sprintByMode,recordRun,sheetKey,sprintBests,sprintRecent,tallySprint,sprintToday,' +
    'SPRINT,WRITE_STYLES,SPRINT_WINDOW,SPRINT_CLEAR,SPRINT_TROUBLE,SPRINT_FLUENT,SPRINT_MINUTES,' +
    'SPRINT_COUNTS,SPRINT_MIN_POOL,sprintGrade,sprintPar,sprintDeal,fmtClock,sprintPick,liveStreak,today,' +
    'dayReps,daysStudied};')();
  globalThis.localStorage._d = {};
  fresh.load();
  const chars = fresh.HQ.slice(0, 20).map(c => c.c);
  chars.forEach(fresh.introduce);
  const a = chars[0], b = chars[1];

  ok('a fresh record carries a sprint block', !!fresh.state.sprint && !!fresh.state.sprint.marks);

  /* marks */
  fresh.sprintMark(a, 'r', false);
  fresh.sprintMark(a, 'r', false);
  ok('misses are counted per mode', fresh.sprintMisses(a) === 2);
  ok('and the recent string records them', fresh.sprintState().marks[a].s === '00');
  ok('two misses put it in the 错字本', fresh.sprintTrouble().includes(a));
  fresh.sprintMark(a, 'l', true);
  fresh.sprintMark(a, 'r', true);
  ok('two right answers are not enough to leave', fresh.sprintTrouble().includes(a));
  ok('and the run is counted across modes', fresh.rightRun(a) === 2);
  fresh.sprintMark(a, 'r', true);
  ok(`${fresh.SPRINT_CLEAR} in a row clears it`, !fresh.sprintTrouble().includes(a));
  ok('but the history is kept', fresh.sprintMisses(a) === 2 && fresh.sprintHits(a) === 3);
  ok('the per-mode split survives', fresh.sprintByMode(a).find(x => x.mode === 'l').hit === 1);

  /* the recent string is what keeps the record from growing without limit */
  for (let i = 0; i < 40; i++) fresh.sprintMark(b, 'r', i % 2 === 0);
  ok('the recent window is capped', fresh.sprintState().marks[b].s.length === fresh.SPRINT_WINDOW);

  /* dismissing, and the evidence against it */
  const c = chars[2];
  fresh.sprintMark(c, 'w', false); fresh.sprintMark(c, 'w', false);
  ok('a third character is on the page', fresh.sprintTrouble().includes(c));
  fresh.sprintForget(c);
  ok('dismissing takes it off', !fresh.sprintTrouble().includes(c));
  fresh.sprintMark(c, 'w', false);
  ok('and missing it again puts it back', fresh.sprintTrouble().includes(c));

  /* fluent */
  const d = chars[3];
  for (let i = 0; i < fresh.SPRINT_FLUENT; i++) fresh.sprintMark(d, 'r', true);
  ok('a long clean run reads as fluent', fresh.sprintFluent().includes(d));
  fresh.sprintMark(d, 'r', false);
  ok('and one miss ends that', !fresh.sprintFluent().includes(d));

  /* a sprint must never make tomorrow worse */
  const e = chars[4];
  const before = { lvl: fresh.rec(e).lvl, due: fresh.rec(e).due };
  fresh.grade(e, false, 'r', { speed: true });
  ok('a sprint miss leaves the level alone', fresh.rec(e).lvl === before.lvl);
  ok('and leaves the review date alone', fresh.rec(e).due === before.due);
  ok('but it is still counted as a miss', fresh.rec(e).wrong === 1);
  fresh.grade(e, true, 'r', { speed: true });
  ok('a sprint hit gives skill credit', fresh.rec(e).skills.r === 1);
  ok('without pushing the review out', fresh.rec(e).due === before.due);

  /* sheets and the board */
  const run1 = { mode: 'r', style: null, n: 40, secs: 120, right: 31, answered: 40, done: true, ms: 96000 };
  ok('the first run on a sheet is a best', fresh.recordRun(run1).best);
  const worse = { ...run1, right: 28, ms: 90000 };
  ok('a lower score is not', !fresh.recordRun(worse).best);
  const faster = { ...run1, ms: 80000 };
  ok('the same score, quicker, is', fresh.recordRun(faster).best);
  const bigger = { ...run1, right: 33, ms: 119000 };
  ok('and more right beats quicker', fresh.recordRun(bigger).best);
  ok('the board keeps the best of them', fresh.sprintState().best['r:40:120'].right === 33);
  ok('a different size is a different sheet',
     fresh.recordRun({ ...run1, n: 60 }).best && Object.keys(fresh.sprintState().best).length === 2);
  ok('and so is a different writing style',
     fresh.sheetKey({ mode: 'w', n: 40, secs: 120, style: 'type' })
     !== fresh.sheetKey({ mode: 'w', n: 40, secs: 120, style: 'spot' }));
  ok('the picker remembers the last sheet', fresh.sprintPick('r').n === 60);
  ok('recent runs are listed newest first', fresh.sprintRecent('r')[0].n === 60);

  /* the day, and the streak */
  const day = fresh.today();
  fresh.tallySprint(40);
  ok('sprint answers keep a streak alive', fresh.liveStreak() >= 1);
  ok('and are counted', fresh.sprintToday() === 40);
  ok('a sprint-only day counts as a day studied', fresh.daysStudied() === 1);
  ok("but stay out of today's checklist", day.new === 0 && day.rev === 0);
  ok('and still ink the day', fresh.dayReps(day) === 40);

  /* dealing a sheet */
  const pool = chars.slice(0, 5);
  const dealt = fresh.sprintDeal(pool, 100);
  ok('a sheet is always the length asked for', dealt.length === 100);
  ok('and never repeats a character back to back',
     dealt.every((x, i) => i === 0 || x !== dealt[i - 1]));
  const counts = pool.map(c => dealt.filter(x => x === c).length);
  ok('and spreads them evenly', Math.max(...counts) - Math.min(...counts) <= 1,
     counts.join(' '));

  /* difficulty is relative to the mode, which is the whole point of having par */
  ok('the same pace is harder to type than to read',
     fresh.sprintPar('w', 'type') > fresh.sprintPar('r'));
  ok('a generous sheet reads as steady', fresh.sprintGrade('r', 20, 300).zh === '慢');
  ok('and a brutal one does not', fresh.sprintGrade('r', 100, 60).zh === '狂');
  ok('the clock formats as minutes and seconds', fresh.fmtClock(95000) === '1:35');

  /* ---- every button goes somewhere ----

     Cantonese Quest's Menu had a "Learn 個" button calling openMenuLesson(), a
     name that appeared exactly once in the whole repository: at the call site.
     The click threw a ReferenceError and the button did nothing, and nothing
     caught it — smoke can load srs.js and data.js because they are DOM-free,
     but app.js is not.

     A general "is every called name declared" scan was tried there and
     abandoned: it read prose inside string literals as calls (o:"A person (人)
     with..." is person(); CSS var(--seal) is var()) and cried wolf 132 times.
     Scoped to handler bodies — which is where a dead name actually hides — it
     is exact and has no false-positive surface.

     The whole handler body, not just its first call. The first version
     matched one call per handler, which is fine for `onclick = () => foo()`
     and blind to everything after the first line of a braced body; the
     function it was meant to catch was called on line three. */
  const OPEN = /(?:\.onclick\s*=|addEventListener\(\s*["'][a-z]+["']\s*,)\s*(?:async\s*)?(?:\(\s*[\w$,\s]*\)|[\w$]+)?\s*=>\s*/g;
  const DIRECT = /\.onclick\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
  const called = new Set();
  for (const m of appSrc.matchAll(DIRECT)) called.add(m[1]);
  for (const m of appSrc.matchAll(OPEN)) {
    let i = m.index + m[0].length;
    let body;
    if (appSrc[i] === "{") {
      /* walk to the matching brace so the whole body is covered */
      let depth = 0, j = i;
      for (; j < appSrc.length; j++) {
        if (appSrc[j] === "{") depth++;
        else if (appSrc[j] === "}") { depth--; if (!depth) break; }
      }
      body = appSrc.slice(i, j + 1);
    } else {
      body = appSrc.slice(i, appSrc.indexOf("\n", i) + 1 || undefined);
    }
    for (const c of body.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) called.add(c[2]);
  }
  /* `if` and friends open a handler body and are not calls; the rest the
     browser supplies. */
  const NOT_A_CALL = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'await', 'catch',
                              'function', 'else', 'do', 'new', 'delete', 'void', 'in', 'of', 'try', 'throw',
                              'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'confirm',
                              'alert', 'fetch', 'requestAnimationFrame', 'Promise', 'Object', 'Array',
                              'Math', 'JSON', 'Set', 'Map', 'Date', 'Number', 'String', 'Boolean', 'Error',
                              'RegExp', 'KeyboardEvent', 'CustomEvent', 'Event', 'IntersectionObserver',
                              'getComputedStyle', 'addEventListener', 'removeEventListener', 'scrollTo',
                              'SpeechSynthesisUtterance', 'matchMedia', 'structuredClone', 'queueMicrotask']);
  /* A name declared in any of the four counts: app.js is loaded last and
     shares the global scope with data.js, srs.js and sprint.js. */
  const declaredIn = appSrc + sprintSrc + read('js/srs.js') + read('js/data.js');
  const isDeclared = n => new RegExp(
    `(?:const|let|var|function)\\s+${n.replace(/\$/g, '\\$')}(?![\\w$])`).test(declaredIn);
  const dead = [...called].filter(n => !NOT_A_CALL.has(n) && !isDeclared(n));
  ok(`every handler in app.js calls something that exists (${called.size} checked)`,
     !dead.length, dead.join(' '));

  /* the cross-file contract, both ways */
  const needsFromApp = ['startRepair', 'REPAIR_SIZE', 'esc', 'bare', 'searchable', 'optionSet',
                        'say', 'stopPhrase', 'toneMark', 'clipFor', 'clipCount', 'openChar',
                        'renderAll', 'celebrate', 'one', 'pick'];
  const missingInApp = needsFromApp.filter(n =>
    !new RegExp(`(const|let|function)\\s+${n}\\b`).test(appSrc));
  ok('everything sprint.js calls in app.js is declared there', !missingInApp.length, missingInApp.join(' '));
  const needsFromSprint = ['renderSprint', 'sprintOpen', 'sprintClose', 'sprintPause', 'sprintResume', 'sp'];
  const missingInSprint = needsFromSprint.filter(n =>
    !new RegExp(`(const|let|function)\\s+${n}\\b`).test(sprintSrc));
  ok('and everything app.js calls in sprint.js is declared there', !missingInSprint.length, missingInSprint.join(' '));
  ok('app.js renders the sprint tab', /RENDER = \{[^}]*sprint: renderSprint/.test(appSrc));
  ok('index.html loads sprint.js before app.js', (() => {
    const h = read('index.html');
    /* the tags, not the prose — index.html explains the cache in a comment
       that names js/app.js long before anything loads it */
    return h.indexOf('src="js/sprint.js') > 0
        && h.indexOf('src="js/sprint.js') < h.indexOf('src="js/app.js');
  })());
  ok('and gives it a tab in both navs', (read('index.html').match(/data-nav="sprint"/g) || []).length === 2);
  ok('the mistake notebook has somewhere to send you',
     /function startRepair/.test(appSrc) && /REPAIR_MODE/.test(appSrc));
}

console.log(failures ? `\nFAILED — ${failures} check(s)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
