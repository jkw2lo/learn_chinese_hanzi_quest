// Downloads hanzi-writer stroke data for every character in the curriculum
// (plus every component it references) and bundles it into js/strokes.js,
// so the app never needs a network fetch at runtime.
import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const { HQ } = eval(src + '\n({HQ})');

const chars = new Set();
HQ.forEach(ch => { chars.add(ch.c); ch.comp.forEach(k => chars.add(k)); });

const out = {};
const missing = [];
const list = [...chars];

for (let i = 0; i < list.length; i += 12) {
  await Promise.all(list.slice(i, i + 12).map(async c => {
    const url = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`;
    try {
      const r = await fetch(url);
      if (!r.ok) { missing.push(c); return; }
      const d = await r.json();
      out[c] = { strokes: d.strokes, medians: d.medians };
    } catch { missing.push(c); }
  }));
  process.stdout.write(`\r  ${Math.min(i + 12, list.length)}/${list.length}`);
}

writeFileSync(
  new URL('../js/strokes.js', import.meta.url),
  '/* Stroke data from hanzi-writer-data (MIT / Make Me a Hanzi, ' +
  'Arphic Public License). Bundled so the app works offline. */\n' +
  'window.STROKE_DATA = ' + JSON.stringify(out) + ';\n'
);

console.log(`\n  bundled ${Object.keys(out).length} characters`);
if (missing.length) console.log(`  no data for: ${missing.join(' ')}`);
