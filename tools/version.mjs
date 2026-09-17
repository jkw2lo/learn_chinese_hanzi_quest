/* Bump the app version.

   The version exists for one reason: a browser that has cached js/app.js keeps
   serving it until something about the URL changes, so a push can be live and
   invisible at the same time. Stamping ?v=<version> on every local asset makes
   the URL change, which forces the fetch.

   It lives in index.html and nowhere else — in an inline script for the app to
   read, and in the query string of every asset it loads. Both have to move
   together or the version on screen stops meaning anything, which is what this
   script is for and what the smoke check enforces.

     node tools/version.mjs              show the current version
     node tools/version.mjs 1.1.0        set it
     node tools/version.mjs patch        1.0.0 -> 1.0.1
     node tools/version.mjs minor        1.0.3 -> 1.1.0
     node tools/version.mjs major        1.4.2 -> 2.0.0
*/

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const FILE = fileURLToPath(new URL('../index.html', import.meta.url));
const src = readFileSync(FILE, 'utf8');

const cur = (src.match(/const APP_VERSION = "([^"]+)"/) || [])[1];
if (!cur) { console.error('no APP_VERSION in index.html'); process.exit(2); }

const arg = process.argv[2];
if (!arg) {
  const date = (src.match(/APP_DATE = "([^"]+)"/) || [])[1];
  const stamped = [...src.matchAll(/\?v=([^"']+)/g)].map(m => m[1]);
  const odd = stamped.filter(v => v !== cur);
  console.log(`version ${cur}  (${date})`);
  console.log(`${stamped.length} asset${stamped.length === 1 ? '' : 's'} stamped`);
  console.log(odd.length ? `MISMATCHED: ${[...new Set(odd)].join(' ')}` : 'all match');
  process.exit(odd.length ? 1 : 0);
}

const bump = (v, part) => {
  const [a, b, c] = v.split('.').map(Number);
  if (part === 'major') return `${a + 1}.0.0`;
  if (part === 'minor') return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
};

const next = ['major', 'minor', 'patch'].includes(arg) ? bump(cur, arg) : arg;
if (!/^\d+\.\d+\.\d+$/.test(next)) {
  console.error(`"${next}" is not a version — use x.y.z, or major|minor|patch`);
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
let out = src
  .replace(/const APP_VERSION = "[^"]+"/, `const APP_VERSION = "${next}"`)
  .replace(/APP_DATE = "[^"]+"/, `APP_DATE = "${today}"`)
  .replace(/\?v=[^"']+/g, `?v=${next}`);

writeFileSync(FILE, out);
const n = [...out.matchAll(/\?v=/g)].length;
console.log(`${cur} -> ${next}  (${today})`);
console.log(`stamped ${n} asset URL${n === 1 ? '' : 's'}`);
console.log('\ncommit, push, then check Settings -> Version on the live site.');
