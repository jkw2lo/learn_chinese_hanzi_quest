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
  'POS_LABEL', 'MENU', 'MENU_CHARS',
  'state', 'blank', 'load', 'save', 'dayKey', 'toneOf', 'connectRemote',
  'rec', 'isKnown', 'strength', 'grade', 'introduce', 'today', 'tally', 'liveStreak',
  'dueList', 'dueCount', 'nextNew', 'remainingNew', 'stageProgress', 'currentStage',
  'skillStanding', 'passesIn', 'PASSES_FOR_SOLID', 'reviewedToday', 'resetProgress',
  'tallyExtra', 'extraToday', 'extraTotal', 'extraBestDay',
  'placeKnown', 'wasPlaced', 'PLACE_MISS_LIMIT', 'PLACED_REST',
  'wordOfWeek', 'weekKey', 'INTERESTS', 'INTEREST_KEYS', 'shownIn', 'shuffle',
  'FESTIVALS', 'festivalThisWeek', 'festivalDate', 'wotwEntry',
  'menuProgress', 'menuToday', 'menuLearned', 'menuKnown',
  'MENU_TIERS', 'practicePool', 'knownChars', 'daysStudied'
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

console.log(failures ? `\nFAILED — ${failures} check(s)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
