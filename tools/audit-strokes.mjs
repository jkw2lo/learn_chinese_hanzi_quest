/* An audit of the stroke data, beyond "does it match upstream".

   tools/check-strokes.mjs already compares js/strokes.js byte-for-byte with
   Make Me a Hanzi's graphics.txt, which settles stroke ORDER: the order is the
   array order, and the array is upstream's. That check cannot see the things
   that go wrong *around* the data, which is what this one looks for:

     1. coverage — every character the app offers to teach writing for
     2. the right GLYPH — a simplified curriculum must not be carrying a
        traditional character, which would silently teach the wrong hand
     3. stroke COUNTS we state in prose (RADICALS[].strokes) against the data
     4. structural sanity — one median per stroke, points inside the viewbox,
        no truncated paths
     5. the 部件 claims in the curriculum against Make Me a Hanzi's own
        decomposition, as a second opinion on tools/check-components.mjs

   Run: node tools/audit-strokes.mjs

   Notes and problems are different things. A note is something to read; only
   a problem fails the run. */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

const { HQ, RADICALS } =
  new Function(readFileSync(root + 'js/data.js', 'utf8') + '\nreturn {HQ,RADICALS};')();
const win = {};
new Function('window', readFileSync(root + 'js/strokes.js', 'utf8'))(win);
const bundle = win.STROKE_DATA;

/* Make Me a Hanzi's dictionary: decomposition, radical, and the character's
   own identity. Same corpus the graphics come from, so a disagreement between
   them would itself be news. Shared with tools/check-components.mjs. */
const mmah = new Map();
if (existsSync(here('.mmah-dictionary.txt'))) {
  for (const line of readFileSync(here('.mmah-dictionary.txt'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    mmah.set(o.character, o);
  }
}

/* Unihan's variant table, for the simplified/traditional question. Cached
   beside this file after the first run, like the other two sources. */
const VARIANTS = here('.unihan-variants.txt');
if (!existsSync(VARIANTS)) {
  process.stdout.write('fetching Unihan variants… ');
  try {
    const r = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const { execFileSync } = await import('child_process');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const zip = join(tmpdir(), 'unihan.zip');
    writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    execFileSync('unzip', ['-o', '-q', zip, 'Unihan_Variants.txt', '-d', tmpdir()]);
    writeFileSync(VARIANTS, readFileSync(join(tmpdir(), 'Unihan_Variants.txt'), 'utf8')
      .split('\n').filter(l => /kSimplifiedVariant|kTraditionalVariant/.test(l)).join('\n'));
    console.log('cached');
  } catch (e) {
    console.log('could not (' + e.message + ') — the glyph pass will be skipped');
  }
}
const simplifiedOf = new Map(), traditionalOf = new Map();
if (existsSync(VARIANTS)) {
  for (const line of readFileSync(VARIANTS, 'utf8').split('\n')) {
    if (!line.startsWith('U+')) continue;
    const [cp, field, ...rest] = line.split('\t');
    const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
    const targets = rest.join(' ').trim().split(/\s+/)
      .filter(t => t.startsWith('U+'))
      .map(t => String.fromCodePoint(parseInt(t.replace(/<.*/, '').slice(2), 16)));
    if (!targets.length) continue;
    if (field === 'kSimplifiedVariant') simplifiedOf.set(ch, targets);
    if (field === 'kTraditionalVariant') traditionalOf.set(ch, targets);
  }
}

let notes = 0, problems = 0;
const say = (lvl, msg) => { console.log(`  ${lvl === 'x' ? '✗' : lvl === '!' ? '·' : '✓'} ${msg}`); };
const bad = msg => { problems++; say('x', msg); };
const note = msg => { notes++; say('!', msg); };

/* ---------- 1. coverage ---------- */
console.log('\ncoverage');
const missing = HQ.filter(c => !bundle[c.c]).map(c => c.c);
const have = HQ.length - missing.length;
say('.', `${have} of ${HQ.length} characters carry stroke data`);
if (missing.length) {
  note(`${missing.length} without: ${missing.join(' ')}`);
  /* they are only acceptable if upstream genuinely has nothing */
  const upstreamHas = missing.filter(c => mmah.has(c));
  if (upstreamHas.length) bad(`but Make Me a Hanzi HAS these: ${upstreamHas.join(' ')} — the bundle is short, not the source`);
  else say('.', 'and Make Me a Hanzi has none of them either — a real gap, not a bundling miss');
}

/* ---------- 2. the right glyph ---------- */
console.log('\nsimplified forms');
/* The inverse of the same question in Cantonese Quest, which teaches
   traditional and asks whether a character is secretly simplified. This
   curriculum is simplified throughout, so what would be wrong here is a
   character that Unihan says has a simplified form of its own — 學 where 学
   is meant. The stroke data would then teach a hand nobody on the mainland
   writes, and nothing else in the repository would notice. */
let wrongForm = 0;
if (!simplifiedOf.size) {
  note('no Unihan variant table — run again with a connection to check the glyphs');
} else {
  for (const ch of HQ) {
    /* deliberately not gated on bundle[ch.c], unlike the passes below: a
       traditional character that slipped into the curriculum is exactly the
       one least likely to have stroke data bundled for it, so skipping the
       ones we could not draw would skip the case this pass exists for. */
    const simp = simplifiedOf.get(ch.c);
    /* Unihan lists a simplified variant only where the two genuinely differ,
       so a character that is its own simplification never appears here. */
    if (simp && !simp.includes(ch.c)) {
      bad(`${ch.c} is a traditional form; simplified is ${simp.join(' ')}`);
      wrongForm++;
    }
  }
  if (!wrongForm) say('.', `no character in the curriculum is a traditional form wearing a simplified label`);
  /* the other direction, as a count rather than a complaint: how much of the
     curriculum is written differently in traditional script */
  const differs = HQ.filter(ch => traditionalOf.has(ch.c)).length;
  say('.', `${differs} of ${HQ.length} are written differently in traditional script`);
}

/* Make Me a Hanzi's decomposition is a prefix expression — ⿱艹⿱人木 — and its
   `matches` array says which top-level part each stroke belongs to. Together
   they give the stroke count of a component that has no glyph entry of its
   own, which is exactly the case for the left-edge radical forms: 氵, 艹, 钅
   and 纟 are not characters and are not in the graphics file. */
const IDC = /[⿰-⿻]/;
function topParts(decomp) {
  const chars = [...decomp];
  let i = 0;
  const read = () => {
    const c = chars[i++];
    if (c === undefined) return null;
    if (IDC.test(c)) {
      const n = (c === '⿲' || c === '⿳') ? 3 : 2;   /* ⿲ and ⿳ take three */
      const kids = [];
      for (let k = 0; k < n; k++) kids.push(read());
      return { kids };
    }
    return { leaf: c };
  };
  const top = read();
  return top && top.kids ? top.kids : top ? [top] : [];
}
/* how many strokes the component `form` takes, learned from any character
   built out of it */
function strokesOfForm(form) {
  for (const [c, d] of mmah) {
    if (!d.decomposition || !d.matches || !bundle[c]) continue;
    const parts = topParts(d.decomposition);
    const idx = parts.findIndex(p => p.leaf === form);
    if (idx < 0) continue;
    const n = d.matches.filter(m => Array.isArray(m) && m[0] === idx).length;
    if (n) return { n, from: c };
  }
  return null;
}

/* ---------- 3. stroke counts stated in prose ---------- */
console.log('\nstated stroke counts');
let countWrong = 0;
for (const [key, r] of Object.entries(RADICALS)) {
  /* Count the form the card actually prints. 水 is four strokes and 氵 is
     three; the card shows 氵 and says three, and checking that against the
     dictionary key 水 is how a correct entry gets reported as a bug. */
  const form = r.form || key;
  let n = bundle[form] ? bundle[form].strokes.length : null;
  let via = n !== null ? 'the glyph itself' : null;
  if (n === null) {
    const derived = strokesOfForm(form);
    if (derived) { n = derived.n; via = `its strokes in ${derived.from}`; }
  }
  if (n === null) { note(`${key} (${r.name}): nothing to check "${r.strokes} strokes" against`); continue; }
  if (n !== r.strokes) {
    bad(`${key} (${r.name}) prints ${form} and says ${r.strokes} strokes; ${via} says ${n}`);
    countWrong++;
  }
}
if (!countWrong) say('.', `every RADICALS stroke count matches the form the card prints`);

/* ---------- 4. structural sanity ---------- */
console.log('\nstructure');
let structural = 0;
for (const ch of HQ) {
  const g = bundle[ch.c];
  if (!g) continue;
  if (!Array.isArray(g.strokes) || !g.strokes.length) { bad(`${ch.c}: no strokes array`); structural++; continue; }
  if (!Array.isArray(g.medians) || g.medians.length !== g.strokes.length) {
    bad(`${ch.c}: ${g.strokes.length} strokes but ${g.medians ? g.medians.length : 0} medians`); structural++; continue;
  }
  g.medians.forEach((m, i) => {
    if (!m.length) { bad(`${ch.c} stroke ${i + 1}: empty median`); structural++; return; }
    /* Make Me a Hanzi draws in a 1024-unit box with a 124-unit descender */
    const out = m.filter(([x, y]) => x < -200 || x > 1224 || y < -324 || y > 1124);
    if (out.length) { bad(`${ch.c} stroke ${i + 1}: ${out.length} median point(s) outside the glyph box`); structural++; }
  });
  if (g.strokes.some(s => typeof s !== 'string' || s.length < 8)) {
    bad(`${ch.c}: a stroke path is empty or truncated`); structural++;
  }
}
if (!structural) say('.', `every glyph has one median per stroke, inside the box, with a real path`);

/* ---------- 5. components, second opinion ---------- */
console.log('\ncomponents, against Make Me a Hanzi');
/* One squeezed radical per key is not enough, and a map that allows only one
   reports correct data as wrong: 肉 is written 月 in 有 and 服 and ⺼ in the
   fuller forms, and a map that knows only ⺼ calls every 月 claim a mistake.
   Every key here holds every form the part is written in, the free-standing
   character included where it differs from the key. */
const VARIANT = { "人": "亻𠆢", "水": "氵氺", "火": "灬", "心": "忄㣺⺗", "手": "扌",
                  "言": "訁讠", "食": "飠饣", "艸": "艹", "辵": "辶⻌", "犬": "犭",
                  "玉": "王𤣩", "示": "礻", "衣": "衤", "肉": "月⺼", "刀": "刂⺈",
                  "金": "釒钅", "糸": "糹纟", "八": "丷龸", "攴": "攵", "阜": "阝⻖",
                  "竹": "⺮𥫗", "小": "⺌⺍", "网": "罒", "爪": "爫⺤", "土": "龶",
                  "卜": "⺊", "月": "⺼肉", "讠": "言訁", "钅": "金釒", "纟": "糸糹",
                  "饣": "食飠", "氵": "水氺", "忄": "心㣺", "扌": "手", "亻": "人",
                  "艹": "艸", "辶": "辵⻌", "刂": "刀", "礻": "示", "衤": "衣",
                  "犭": "犬", "阝": "阜⻖", "王": "玉𤣩" };
let compNotes = 0;
for (const ch of HQ) {
  const d = mmah.get(ch.c);
  if (!d || !ch.comp || !ch.comp.length) continue;
  /* One level is not enough: 谢 decomposes to ⿰讠射 and the 身 it claims is
     inside 射. But expansion has to ADD, not replace — Make Me a Hanzi bottoms
     out in ？ for anything unanalysable, so substituting 讠 for its own
     decomposition deletes the 讠 the claim is about. Replacing turned 8 honest
     notes into 104 useless ones in the other app.

     Depth is the other half of it. Two levels was enough for a curriculum of
     300; at 763 the compounds run deeper, and two levels reported 11 claims
     as unfound that are simply further down — 整's 十 is inside 束 inside 敕.
     Four clears all 11 and keeps its teeth: appending the same parts over and
     over grows the string but barely the set, so the distinct characters
     reachable go from a median of 10 at depth 2 to 10 at depth 4 (max 18 to
     21). Swept 3,978 deliberately wrong claims against the curriculum at
     depths 2 to 5: none slipped through at any of them. */
  const expand = (t, depth) => {
    let out = t;
    for (let k = 0; k < depth; k++) {
      let next = out;
      for (const c of [...out]) {
        const sub = mmah.get(c);
        if (sub && sub.decomposition && sub.decomposition !== c) next += sub.decomposition;
      }
      if (next === out) break;
      out = next;
    }
    return out;
  };
  const decomp = expand(d.decomposition || '', 4);
  const unseen = ch.comp.filter(k => !decomp.includes(k));
  if (unseen.length) {
    /* variants are the usual reason: 亻 in the decomposition, 人 in the claim */
    const still = unseen.filter(k =>
      !(VARIANT[k] && [...VARIANT[k]].some(v => decomp.includes(v))));
    if (still.length) { note(`${ch.c}: claims ${still.join(' ')}, decomposition is ${decomp}`); compNotes++; }
  }
}
if (!compNotes) say('.', 'every 部件 claim appears in the upstream decomposition');

console.log(`\n${problems ? `${problems} problem(s)` : 'no problems'}${notes ? `, ${notes} note(s) to read` : ''}.`);
process.exit(problems ? 1 : 0);
