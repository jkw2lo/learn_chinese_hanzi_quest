/* Regenerate the EXTRA_GLOSS block at the foot of js/data.js.

   Every Chinese character on screen is hoverable, and the tooltip was built
   only from the curriculum — so anything printed without being taught had no
   tooltip at all. On the restaurant menu that is most of what is on it, and
   hovering a dish and being told nothing reads as broken rather than as out of
   scope.

   These are reference glosses, not teaching material. They carry a reading and
   a short sense and nothing else: no mnemonic, no etymology, no drills, and
   they never enter the curriculum, the review queue or any count. What they do
   is answer "what is that one?" for a character you can see but have not been
   taught.

   Readings and senses both come from Unihan — kMandarin for the reading,
   kDefinition for the sense. Unihan is authoritative for a character in
   isolation, terse, and consistent, which is what a hover wants. (The
   Cantonese fork of this tool had a second source, CC-Canto, whose
   single-character entries lean toward the colloquial sense — it returned 牛
   as "stubborn and unreasonable" when the character on the menu means cow.
   There is no equivalent worth adding here.)

   Run:  node tools/fetch-glosses.mjs
   Needs tools/.unihan-mandarin.txt, fetched on demand.
*/

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const CACHE = here('.unihan-mandarin.txt');

if (!existsSync(CACHE)) {
  process.stdout.write('fetching Unihan readings… ');
  const r = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip');
  if (!r.ok) { console.error('could not fetch it — check your connection'); process.exit(2); }
  const { execFileSync } = await import('child_process');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const zip = join(tmpdir(), 'unihan.zip');
  writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  execFileSync('unzip', ['-o', '-q', zip, 'Unihan_Readings.txt', '-d', tmpdir()]);
  writeFileSync(CACHE, readFileSync(join(tmpdir(), 'Unihan_Readings.txt'), 'utf8')
    .split('\n').filter(l => /\tkMandarin\t|\tkDefinition\t/.test(l)).join('\n'));
  console.log('cached');
}

const READING = {}, DEFINE = {};
for (const line of readFileSync(CACHE, 'utf8').split('\n')) {
  if (!line.startsWith('U+')) continue;
  const [cp, field, ...rest] = line.split('\t');
  const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
  /* kMandarin can carry two readings — mainland first, Taiwan second. The
     first is the one this app teaches. */
  if (field === 'kMandarin') READING[ch] = rest.join('\t').trim().split(/\s+/)[0];
  if (field === 'kDefinition') DEFINE[ch] = rest.join('\t').trim();
}

const file = here('../js/data.js');
const src = readFileSync(file, 'utf8');
const { CHAR_INDEX, MENU, INTERESTS, FESTIVALS, HQ } =
  new Function(src + '\nreturn {CHAR_INDEX,MENU,INTERESTS,FESTIVALS,HQ};')();

/* Everything the app can put on screen as a hoverable glyph. */
const want = new Set();
const add = s => [...String(s || '')].forEach(c => { if (/[\u4e00-\u9fff]/.test(c)) want.add(c); });
add(MENU.title); add(MENU.name);
MENU.sections.forEach(s => { add(s.head); s.items.forEach(i => { add(i[0]); if (i[4]) add(i[4][0]); }); });
MENU.phrases.forEach(p => add(p[0]));
add(MENU.specials.head); MENU.specials.items.forEach(i => add(i[0])); add(MENU.specials.note[0]);
Object.values(INTERESTS).forEach(c => c.words.forEach(w => add(w[0])));
FESTIVALS.forEach(f => f.words.forEach(w => add(w[0])));
HQ.forEach(ch => { ch.words.forEach(w => add(w[0])); add(ch.sent[0]); (ch.comp || []).forEach(add); });

/* The interface is written in Chinese too — 加练, 每周一词, 错字本, every drill
   label — and those characters are hoverable like any other. Scanning the
   source rather than listing them by hand means a heading added later is
   covered without anybody remembering to come back here. */
['../js/app.js', '../js/sprint.js', '../index.html'].forEach(f => add(readFileSync(here(f), 'utf8')));

/* A dictionary entry is not a tooltip. Unihan writes for lexicographers, so
   glosses arrive with measure-word notes, numbered senses and cross-references
   — 鸡 as "fowl; chicken M: 隻zhī [隻]", 钱 leading with "a surname". All of
   that is noise at hover size, and the surname sense in particular is almost
   never the one being asked about. */
const tidy = g => g
  .replace(/\s*\d+\s*[.、)]\s*/g, ' ')                    /* "1. grill, 2. barbeque" */
  .replace(/\s*KangXi radical.*$/i, '')
  .replace(/^\((?:noun|verb|adjective|adverb|pronoun|measure word|particle|classifier)\)\s*/i, '')
  .replace(/\s*M:\s*.*$/, '')                            /* measure-word notes */
  .replace(/\s*CL:\s*.*$/, '')
  .replace(/\s*see also.*$/i, '')
  .replace(/\s*used in.*$/i, '')
  .replace(/\s*\[[^\]]*\]\s*/g, ' ')                     /* "zhī [隻]" */
  .replace(/\s*\([^)]*\)\s*/g, ' ')                      /* parenthetical asides */
  .replace(/\s*#.*$/, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

/* Useless, not merely long — length is the output slice's job below, and the
   two limits have to agree. At 42 this threw away 乎's "interrogative or
   exclamatory final particle" for being one character over a cap that the
   final slice would not have applied. 56 is that slice; it recovers 乎 and
   changes nothing else in the set. */
const dull = g => !g || g.length > 56
  || /^(a |the )?surname$/i.test(g)
  || /^(variant|used in|abbr|same as|interchangeable)/i.test(g)
  || /[\u4e00-\u9fff]/.test(g);                          /* a gloss in Chinese explains nothing */

function senseFor(c) {
  const d = DEFINE[c];
  if (!d) return null;
  const senses = d.split(/[;,]/).map(tidy).filter(g => !dull(g));
  return senses.length ? senses.slice(0, 2).join('; ').slice(0, 56) : null;
}

const out = {};
const noReading = [], noSense = [];
for (const c of [...want].filter(c => !CHAR_INDEX[c])) {
  const p = READING[c];
  if (!p) { noReading.push(c); continue; }
  const m = senseFor(c);
  if (!m) { noSense.push(c); continue; }
  out[c] = [p, m];
}

const pairs = Object.entries(out).sort((a, b) => a[0].localeCompare(b[0]))
  .map(([c, [p, m]]) => `"${c}":["${p}","${m.replace(/["\\]/g, '')}"]`);
const block = `/* ---------- reference glosses ----------
   Generated by tools/fetch-glosses.mjs from Unihan's kMandarin and
   kDefinition. Do not hand-edit. These characters appear on screen — in the
   menu, example words, sentences, the word of the week, and the section
   headings — without being taught, and this is what their hover tooltip says.
   They are never drilled, counted or scheduled. ${pairs.length} of them. */
const EXTRA_GLOSS = {${pairs.join(',')}};
`;

const marked = /\/\* ---------- reference glosses ----------[\s\S]*?\nconst EXTRA_GLOSS = \{[^}]*\};\n/;
writeFileSync(file, marked.test(src) ? src.replace(marked, block) : src + '\n' + block);
console.log(`${pairs.length} reference glosses written`);
if (noReading.length) console.log(`no Unihan reading (${noReading.length}): ${noReading.join(' ')}`);
if (noSense.length) console.log(`no usable sense (${noSense.length}): ${noSense.join(' ')}`);
