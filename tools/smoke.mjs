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
  'HQ', 'STAGES', 'CHAR_INDEX', 'FAMILIES', 'RADICALS', 'QUESTS', 'LOCKED_STAGES',
  'POS_LABEL', 'MENU', 'MENU_CHARS',
  'state', 'blank', 'load', 'save', 'dayKey', 'toneOf', 'connectRemote',
  'rec', 'isKnown', 'strength', 'grade', 'introduce', 'today', 'tally', 'liveStreak',
  'dueList', 'dueCount', 'nextNew', 'remainingNew', 'stageProgress', 'currentStage', 'skillPct',
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

console.log('\nstreak safety');
api.setState ? 0 : 0;
ok('days studied counts every active day', typeof api.daysStudied() === 'number' && api.daysStudied() >= 1);

console.log(failures ? `\nFAILED — ${failures} check(s)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
