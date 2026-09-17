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
  'probeBlock', 'placeAt', 'wasPlaced', 'PROBE_WINDOW', 'PROBE_SIZE',
  'wordOfWeek', 'weekKey', 'INTERESTS', 'INTEREST_KEYS', 'shownIn', 'shuffle',
  'isUnchecked', 'uncheckedCount', 'CHECK_SPREAD',
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
ok('a probe block samples across its window', (() => {
  const b = api.probeBlock(0);
  return b.length === Math.min(api.PROBE_SIZE, api.PROBE_WINDOW) && new Set(b).size === b.length;
})());
ok('blocks past the end of the curriculum are empty', api.probeBlock(HQ.length).length === 0);
ok('the last block is clipped, not overrun',
   api.probeBlock(HQ.length - 3).every(c => api.CHAR_INDEX ? true : true) && api.probeBlock(HQ.length - 3).length <= 3);
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,state,load,placeAt,wasPlaced,rec,isKnown,dueCount,knownChars,dayKey,isUnchecked,uncheckedCount,grade};')();
  globalThis.localStorage._d = {};
  fresh.load();
  ok('nobody is placed to begin with', !fresh.wasPlaced());
  /* the quiz samples, so only some of the range was ever actually shown */
  const asked = new Set(fresh.HQ.slice(0, 100).filter((_, i) => i % 4 === 0).map(ch => ch.c));
  const out = fresh.placeAt(100, asked);
  ok('placing credits everything before the stopping point', fresh.knownChars().length === 100);
  ok('and reports how much of that was actually asked', out.checked === asked.size && out.added === 100);
  ok('an asked character carries evidence',
     fresh.HQ.slice(0, 100).filter(ch => asked.has(ch.c)).every(ch => fresh.rec(ch.c).lvl === 2));
  ok('an unasked one does not',
     fresh.HQ.slice(0, 100).filter(ch => !asked.has(ch.c)).every(ch => fresh.rec(ch.c).lvl === 0));
  ok('and is flagged unchecked rather than assumed',
     fresh.uncheckedCount() === 100 - asked.size);
  ok('asked characters are never flagged unchecked',
     [...asked].every(c => !fresh.isUnchecked(c)));
  ok('all of them are marked as placed rather than taught', Object.values(fresh.state.chars).every(r => r.placed));
  ok('reviews are fanned out, not dumped on day one', fresh.dueCount() === 0);
  const days = new Set(Object.values(fresh.state.chars).map(r => r.due));
  ok('across several days', days.size >= 4, days.size + ' distinct due dates');
  /* the whole point: an unchecked character settles the first time it is answered */
  const u = fresh.HQ.slice(0, 100).find(ch => !asked.has(ch.c)).c;
  ok('an unchecked character starts unchecked', fresh.isUnchecked(u));
  fresh.grade(u, true, 'r');
  ok('answering it settles the question', !fresh.isUnchecked(u));
  const u2 = fresh.HQ.slice(0, 100).filter(ch => !asked.has(ch.c))[1].c;
  fresh.grade(u2, false, 'r');
  ok('getting it wrong settles it too — as a character to teach', !fresh.isUnchecked(u2) && fresh.rec(u2).lvl === 0);
  ok('placing with no evidence at all leaves everything unchecked', (() => {
    const f2 = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
      '\nreturn {state,load,placeAt,uncheckedCount};')();
    globalThis.localStorage._d = {};
    f2.load();
    const r = f2.placeAt(20);
    return r.checked === 0 && f2.uncheckedCount() === 20;
  })());
  /* retaking must never undo study */
  const c = fresh.knownChars()[0];
  fresh.rec(c).lvl = 8; fresh.rec(c).due = '2099-01-01';
  const added = fresh.placeAt(40).added;
  ok('a lower retake adds nothing', added === 0);
  ok('and leaves studied characters alone', fresh.rec(c).lvl === 8 && fresh.rec(c).due === '2099-01-01');
  ok('the high-water mark is kept', fresh.state.placed.at === 100);
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

console.log('\ntiers gate the library');
{
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,TIERS,TIER_UNLOCK,state,load,introduce,tierProgress,tierUnlocked,tierNeeds,unlockedCeiling,isLocked,nextNew,remainingNew,tierFrom,tierChars,tierOf,placeAt};')();
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
  ok('and the ceiling moves with it', fresh.unlockedCeiling() === fresh.HQ.length);
  ok('what was locked no longer is', !fresh.isLocked(fresh.HQ[250].c));
  ok('tier 3 stays shut — nothing is written there', !fresh.tierUnlocked(fresh.TIERS[2]));
  ok('an unwritten tier reports nothing built', fresh.tierProgress(fresh.TIERS[2]).built === 0);
  ok('but still knows what it is aiming at', fresh.tierProgress(fresh.TIERS[2]).planned === 500);
}
{
  /* placement credits past a gate, and that is what opens it */
  const fresh = new Function(read('js/data.js') + '\n' + read('js/srs.js') +
    '\nreturn {HQ,TIERS,state,load,placeAt,tierUnlocked,unlockedCeiling};')();
  globalThis.localStorage._d = {};
  fresh.load();
  fresh.placeAt(300);
  ok('a placement past tier 1 opens tier 2', fresh.tierUnlocked(fresh.TIERS[1]));
  ok('and the ceiling follows', fresh.unlockedCeiling() === fresh.HQ.length);
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
