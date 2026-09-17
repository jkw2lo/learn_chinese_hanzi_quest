/* Verify every "Built from" claim against Make Me a Hanzi's decompositions.

   The comp arrays in js/data.js are hand-written, and hand-written
   decompositions drift: 口 (mouth) gets claimed where the glyph really has
   囗 (enclosure), and 月 (moon) where it really has ⺼ (flesh). This checks
   all of them against an authoritative source.

   Run after adding characters:  node tools/check-components.mjs
   The dictionary is cached beside this file after the first run. */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const CACHE = fileURLToPath(new URL('.mmah-dictionary.txt', import.meta.url));
if (!existsSync(CACHE)) {
  process.stdout.write('fetching decomposition dictionary… ');
  const r = await fetch('https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt');
  if (!r.ok) { console.error('could not fetch it — check your connection'); process.exit(2); }
  writeFileSync(CACHE, await r.text());
  console.log('cached');
}

const dict = new Map();
for (const line of readFileSync(CACHE, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  dict.set(o.character, o);
}

const src = readFileSync(fileURLToPath(new URL('../js/data.js', import.meta.url)), 'utf8');
const { HQ } = new Function(src + '\nreturn {HQ};')();

const IDS = /[⿰-⿻]/g;
/* a squeezed radical and its free-standing character are the same part */
const VAR = {
  '氵':'水','氺':'水','亻':'人','𠆢':'人','扌':'手','忄':'心','㣺':'心','⺗':'心',
  '讠':'言','訁':'言','钅':'金','釒':'金','纟':'糸','糹':'糸','饣':'食','飠':'食',
  '艹':'艸','灬':'火','⺌':'小','⺍':'小','⺼':'肉','犭':'犬','刂':'刀','礻':'示',
  '衤':'衣','罒':'网','辶':'辵','辵':'辶','⻌':'辶','王':'玉','𤣩':'玉','攵':'攴',
  '⺊':'卜','⺈':'刀','丷':'八','龸':'八','龶':'土','⺤':'爪','爫':'爪','⻖':'阜','阝':'阜'
};
const norm = c => VAR[c] || c;

function parts(ch, seen = new Set(), depth = 0) {
  const out = new Set();
  if (depth > 6) return out;
  const e = dict.get(ch);
  if (!e || !e.decomposition) return out;
  for (const c of e.decomposition.replace(IDS, '')) {
    if (c === '？' || c === ch) continue;
    out.add(c);
    if (!seen.has(c)) { seen.add(c); for (const g of parts(c, seen, depth + 1)) out.add(g); }
  }
  return out;
}

const bad = [], missing = [];
for (const ch of HQ) {
  const e = dict.get(ch.c);
  if (!e) { missing.push(ch.c); continue; }
  const real = parts(ch.c);
  const wrong = (ch.comp || []).filter(k =>
    !real.has(k) && ![...real].some(r => norm(r) === norm(k)));
  if (wrong.length) bad.push(`${ch.c}  claims ${ch.comp.join('+')} — ${wrong.join(' ')} isn't there (real: ${e.decomposition})`);
}

console.log(`checked ${HQ.length} characters`);
if (missing.length) console.log(`not in the dictionary: ${missing.join(' ')}`);
if (bad.length) {
  console.error(`\nFAIL — ${bad.length} claim(s) don't hold up:`);
  bad.forEach(b => console.error('  ' + b));
  process.exit(1);
}
console.log('every component claim checks out.');
