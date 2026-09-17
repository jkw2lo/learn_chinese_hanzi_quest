/* Verify the bundled stroke data against Make Me a Hanzi's own graphics file.

   js/strokes.js is generated from hanzi-writer-data, which is itself built
   from Make Me a Hanzi. Checking the bundle against the upstream source
   catches a corrupted download, a version drift, or a character whose strokes
   and medians disagree — and because stroke ORDER is just the array order,
   matching the source is what makes the order correct.

   Run: node tools/check-strokes.mjs */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const CACHE = fileURLToPath(new URL('.mmah-graphics.txt', import.meta.url));
if (!existsSync(CACHE)) {
  process.stdout.write('fetching upstream stroke graphics (~30 MB)… ');
  const r = await fetch('https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt');
  if (!r.ok) { console.error('could not fetch it'); process.exit(2); }
  writeFileSync(CACHE, await r.text());
  console.log('cached');
}

const root = fileURLToPath(new URL('../', import.meta.url));
const { HQ } = new Function(readFileSync(root + 'js/data.js', 'utf8') + '\nreturn {HQ};')();
const win = {};
new Function('window', readFileSync(root + 'js/strokes.js', 'utf8'))(win);
const bundle = win.STROKE_DATA;

const upstream = new Map();
for (const line of readFileSync(CACHE, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  upstream.set(o.character, o);
}

const problems = [];
let checked = 0, exact = 0;

for (const ch of HQ) {
  const mine = bundle[ch.c];
  if (!mine) { problems.push(`${ch.c}  no stroke data bundled at all`); continue; }

  /* structural: every stroke needs a median, and nothing may be empty */
  if (!Array.isArray(mine.strokes) || !mine.strokes.length)
    problems.push(`${ch.c}  no strokes`);
  else if (!Array.isArray(mine.medians) || mine.medians.length !== mine.strokes.length)
    problems.push(`${ch.c}  ${mine.strokes.length} strokes but ${mine.medians ? mine.medians.length : 0} medians — they must pair up`);
  else if (mine.strokes.some(p => typeof p !== 'string' || !p.trim()))
    problems.push(`${ch.c}  contains an empty stroke path`);
  else if (mine.medians.some(m => !Array.isArray(m) || m.length < 2))
    problems.push(`${ch.c}  a median has fewer than two points`);

  const up = upstream.get(ch.c);
  if (!up) { problems.push(`${ch.c}  not in the upstream graphics file`); continue; }
  checked++;

  if (up.strokes.length !== mine.strokes.length) {
    problems.push(`${ch.c}  ${mine.strokes.length} strokes bundled, upstream says ${up.strokes.length}`);
    continue;
  }
  /* order matters: compare stroke by stroke, in sequence */
  const drift = mine.strokes.findIndex((p, i) => p !== up.strokes[i]);
  if (drift >= 0) problems.push(`${ch.c}  stroke ${drift + 1} differs from upstream`);
  else exact++;
}

console.log(`\n${HQ.length} characters, ${checked} compared against upstream`);
console.log(`${exact} match the source exactly, stroke for stroke and in order`);

const counts = HQ.map(c => bundle[c.c] && bundle[c.c].strokes.length).filter(Boolean).sort((a, b) => a - b);
console.log(`stroke counts: ${counts[0]}–${counts[counts.length - 1]}, median ${counts[counts.length >> 1]}`);

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} problem(s):`);
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}
console.log('every stroke order checks out.\n');
