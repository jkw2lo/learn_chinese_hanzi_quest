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
/* A squeezed radical and its free-standing character are the same part — and
   a part can be written in MORE than two ways, which is why this is a group
   per radical rather than one canonical form per variant.

   The single-form version mapped the flesh radical to its dictionary key and
   left the moon shape alone, so a claim of the one on a character whose
   decomposition says the other read as a mistake. It is not one: the two
   collapsed into a single shape, which is why RADICALS is named "moon /
   flesh" and why the curriculum claims both. A map that cannot hold every
   form of a part reports correct data as wrong, and a checker that does that
   stops being believed. */
const FORMS = [
  '人亻𠆢', '水氵氺', '手扌', '心忄㣺⺗', '言讠訁', '金钅釒', '糸纟糹', '食饣飠',
  '艸艹', '火灬', '小⺌⺍', '肉⺼月', '犬犭', '刀刂⺈', '示礻', '衣衤', '网罒',
  '辵辶⻌', '玉王𤣩', '攴攵', '卜⺊', '八丷龸', '土龶', '爪⺤爫', '阜阝⻖'
];
const group = new Map();
for (const g of FORMS) { const set = new Set([...g]); for (const f of set) group.set(f, set); }
/* the same part, however it happens to be written */
const same = (a, b) => a === b || !!group.get(a)?.has(b);

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
    !real.has(k) && ![...real].some(r => same(r, k)));
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
