# Porting this session to the Cantonese app

Everything between `0e00d90` and `e04b100` — versions 1.11.3 → 1.11.10. None
of it has been applied to the Cantonese version yet.

Nine changes in four groups. They are independent of each other except where
noted, so they can be taken one at a time, and three of them are bugs rather
than improvements: **B1, B2 and B3 are live faults that the Cantonese app
almost certainly shares**, because they are all in code that predates the
fork. Start there.

Every Chinese string added is listed under [Strings to convert](#strings-to-convert)
— this app writes Simplified, and every one of them needs checking against
whatever the Cantonese app writes.

---

## Checklist

| | Change | Files | Kind |
|---|---|---|---|
| **B1** | A list merged as if it were a map | `js/srs.js` | bug, data-corrupting |
| **B2** | The button reset left the browser's border | `css/app.css` | bug, cosmetic |
| **B3** | Chips hidden in rows with no stepper | `css/app.css` | bug, control invisible |
| **D1** | The black box (`js/diag.js`) | new file, `index.html`, `js/app.js`, `js/srs.js` | new |
| **D2** | Crash guards and a way out | `js/app.js` | resilience |
| **D3** | Report a problem | `js/app.js` | new |
| **M1** | The mobile drill pass | `css/app.css`, `js/app.js` | mobile only |
| **M2** | The verdict wash | `css/app.css`, `js/app.js`, `js/sprint.js`, `js/srs.js` | mobile only |
| **M3** | Sprint picker tidy | `css/app.css`, `js/sprint.js` | mostly mobile |
| **X1** | Repair rounds actually write | `js/app.js` | behaviour, all platforms |
| **X2** | `startTodayDrill` left `session.repair` set | `js/app.js` | bug |

---

## B1 — a list merged as if it were a map

**The most important thing in this document.** It corrupts the saved record,
it is triggered by signing in, and it takes down most of the app.

`state.menuTaught` is a list of characters. `mergeState` unioned it with
`unionKeys`, which is for keyed flag objects: it walks `Object.keys` and
returns a plain object. So `["菜"]` came back from a sync as `{"0":"菜"}` and
`[]` came back as `{}` — meaning **signing in was on its own enough to break
it, with nothing taught and nothing to lose.**

Everything downstream reads that list with `.includes`, so:

```
(state.menuTaught || []).includes is not a function
  at taughtHere → menuCanRead → menuProgress → startTodayDrill
```

`menuProgress()` is the first line of `startTodayDrill`, `startPractice` and
`renderDone`. The visible result: today's practice rows do nothing when
tapped, Go deeper does nothing, and **the last card of a session freezes**,
because `renderDone` throws before it reaches `markDone`.

The app could not heal itself either — `load()` normalises on load, and the
merge runs after it.

### The fix

In `js/srs.js`, beside `unionKeys`:

```js
const asList = v => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
```

Then:

```js
// in mergeState — by value, like `hailed` on the next line
out.menuTaught = [...new Set([...asList(a.menuTaught), ...asList(b.menuTaught)])];
out.hailed = [...new Set([...asList(a.hailed), ...asList(b.hailed)])].sort((x, y) => x - y);

// in load() — repair what is already written, do not reset it
state.menuTaught = asList(state.menuTaught);
state.hailed = asList(state.hailed);

// the two readers, so a bad shape can never reach a render path again
const taughtHere = c => asList(state.menuTaught).includes(c);
const hailed = () => (state.hailed = asList(state.hailed));

// in menuLearn
state.menuTaught = asList(state.menuTaught);
```

### For the Cantonese app

- If it has **no menu quest**, `menuTaught` may not exist — but check every
  array field in `blank()` against `mergeState`. The bug is the pattern, not
  the field.
- Records and remote documents that are already broken heal on next load, and
  the remote heals on the next pull, because `useRemote` merges then pushes.
- The regression check is deliberately general and worth copying:

```js
const fresh = blank(), merged = mergeState(blank(), blank());
const lists = Object.keys(fresh).filter(k => Array.isArray(fresh[k]));
ok('every list in the record survives a merge as a list',
   lists.every(k => Array.isArray(merged[k])));
```

---

## B2 — the button reset left the browser's border

A black rectangle appeared behind the rounded sprint category cards, its
corners clipped by the rounding.

`.sp-panel-head` is a `<button>` that never declares a border, so it kept the
browser's default `2px outset`, which paints black. The reset took the
*background* away, which is what made it visible, and did not take the border.

```css
/* css/app.css, the global reset */
button { font: inherit; color: inherit; cursor: pointer; background: none; border: 0; }
```

An element selector loses to every class, so this changes nothing that had
already decided for itself. Before porting, scan the fork the same way — this
finds any button relying on the default:

```js
document.querySelectorAll("button").forEach(b => {
  const c = getComputedStyle(b);
  if (parseFloat(c.borderTopWidth) > 0 && c.borderTopColor === "rgb(0, 0, 0)") console.log(b.className);
});
```

In this app exactly one button was affected, across all six tabs.

---

## B3 — chips hidden in rows with no stepper

On a phone the sprint chip rows stand down and a stepper replaces them. The
rule was `.sp-row .sp-chips { display: none }`, which is right for Questions
and Minutes — the chips are a shortcut to a number the stepper also reaches —
and wrong for any row whose chips **are** the choice. Such a row rendered as a
label and an explanation with no control between them.

```css
/* in the mobile block */
.sp-row:has(.sp-step) .sp-chips { display: none; }
.sp-row .sp-step { display: flex; }
```

This replaces both the old rule and the hand-written `.sp-row-style` exemption
that used to paper over it.

---

## D1 — the black box

New file `js/diag.js`, **copied verbatim**. A recorder: breadcrumbs and errors,
written to `localStorage` so a reload cannot take them away, keeping the
current run and the one before it. It calls nothing in the app.

Load it **before every other script**, including the CDN one — the error it
most needs to catch is one thrown while the data file is still parsing:

```html
<script>const APP_VERSION = "…", APP_DATE = "…";</script>
<script src="js/diag.js?v=…"></script>
```

### The one trap

A top-level `const` in a classic script is a **global lexical binding and never
a property of `window`**. The first version of this exported
`const HQDIAG = (() => {…})()`, so every `window.HQDIAG && …` guard in the app
read as "missing" and the whole recorder silently no-opped. It must be:

```js
const HQDIAG = window.HQDIAG = (() => { … })();
```

### Breadcrumbs

In `js/app.js`, beside the other tiny helpers:

```js
const hqNote = (kind, text) => { try { window.HQDIAG && HQDIAG.note(kind, text); } catch { /* never */ } };
```

Called at: each session starter (`startSession`, `startPractice`, `teachOne`,
`startRepair`, `startTodayDrill`), `endSession`, each card in `drawStep`,
`renderDone`, and `go(v)`. In `js/srs.js`, `markDone` uses
`window.HQDIAG` directly — that file loads before `app.js`.

---

## D2 — crash guards and a way out

A session is a full-screen overlay. A card that throws halfway through drawing
leaves no buttons and a page underneath that cannot be reached: the app looks
frozen. Three places produced exactly that, all within a second of the last
click of a session.

1. **`renderStep`** — renamed its body to `drawStep()` and wrapped it:

```js
function renderStep() {
  try { drawStep(); }
  catch (e) {
    if (window.HQDIAG) HQDIAG.fail("error", "card " + session.idx + "/" + session.queue.length
      + " " + JSON.stringify(session.queue[session.idx] || null) + "\n" + (e && e.stack || e));
    stepCrashed(e);
  }
}
```

`stepCrashed` draws a 故障 panel with **Try the next card / Close / Report it**,
built from a string and bound by hand so it depends on nothing that might be
the thing that broke.

2. **`settle`** — renamed its body to `grades()` and wrapped it the same way.
   The options are already disabled when it runs, so a throw there is a
   question with no answer and nothing to press. The fallback names the right
   answer and offers Next.

3. **`openHail`** — the milestone overlay, on a timer after the last card.
   It revealed itself and locked the page scroll **three lines before** wiring
   its own close button. Bind first:

```js
$("#hailOk").onclick = closeHail;
$("#hail").hidden = false;
document.body.style.overflow = "hidden";
$("#hailOk").focus();
```

   Its radical count also did `CHAR_INDEX[c].comp` unguarded, which throws on
   any character in the record that is not in the library (an old curriculum,
   a backup from a newer version). Guard it: `(CHAR_INDEX[c] || {}).comp || []`.
   And wrap the whole `setTimeout(() => openHail(m))` in a try/catch that logs
   and calls `closeHail()` — it is outside every other guard.

---

## D3 — Report a problem

A settings row (`#reportBtn`) opening a sheet that copies out one pasteable
block of JSON: the black box, a reading of the app's own arithmetic
(`learnedToday()`, what each task row's pool computes to, what is ticked),
every overlay's class and `hidden` flag, `document.body.style.overflow`, the
session's position and current card, and a week of days.

Deliberately **not** a backup: no answers, no diary, no full character record —
only the characters first seen today. Copy falls back to selecting the text
when the clipboard is refused.

This is the thing that found B1 in one round trip. Port it early.

For the Cantonese app the only edits needed are field names — if its task list
or day record is shaped differently, the `today:` and `record:` blocks of
`problemReport()` change; everything else is generic.

---

## M1 — the mobile drill pass

All inside `@media (max-width: 859.98px)`. Desktop was measured before and
after: 88px character, 268px writing box, 56px option rows, 24px sentence.

```css
/* the prompt centres in the space above the options, the way .sp-q already did.
   :has, because a handwriting card has no options to be pushed away from and
   would take its box down the page. */
.drill:has(> .opts) > .drill-prompt { margin-top: auto; }

/* two sizes, and only two: a character is a picture, a word is a line of text */
:root { --q-char: 5rem; --q-text: 1.5rem; }
.drill-char, .sp-char { font-size: var(--q-char); }
.drill-q, .drill-sen { font-size: var(--q-text); }
.drill-sen.short { font-size: var(--q-char); line-height: 1.15; }
.drill-q .pin { font-size: inherit; }
.drill-hint { font-size: .86rem; }

/* targets a thumb can hit; the gap is what stops a miss becoming a wrong answer */
.opts, .sp-opts { gap: .8rem; }
.opts .opt, .sp-opts .sp-opt { min-height: 4.6rem; }
.opts.grid2 .opt, .sp-opts.grid2 .sp-opt { min-height: 6rem; font-size: 1.25rem; }
.opts.grid2 .opt .big, .sp-opts.grid2 .sp-opt .big { font-size: 3.6rem; }
.opts .opt .pin, .sp-opts .sp-opt .pin { font-size: 1.45rem; }
.opts:not(.grid2) .opt { font-size: 1.05rem; line-height: 1.3; padding: .85rem .6rem; }

/* the writing box takes the width. .tian is square, so width is also height —
   48dvh is the limit that stops a full-width box pushing the prompt off the top */
.writer-box { width: min(100%, 24rem, 48dvh); }
```

CSS cannot count characters, so `renderDrill` marks short material:

```js
prompt = `<div class="drill-sen ${cjkOf(mat.zh).length <= 2 ? "short" : ""}">${renderZh(mat.zh)}</div>`;
// and for the gap-fill word, <= 3
```

**Cantonese note:** `--q-char` at 5rem assumes one or two glyphs. If the
Cantonese app shows longer prompts in `.drill-sen.short`, raise the threshold
or lower the size. Writing drills here are always one character — if that is
not true in the fork, `min(100%, 24rem, 48dvh)` has to be revisited, since two
squares side by side will not fit a phone at that size.

---

## M2 — the verdict wash

The verdict lived in the footer, which sits outside the scrolling body. It
appearing shoved the options up the screen and it going away on the next card
dropped them back down — and the move lands between deciding and tapping.

**One rule on a phone, no exceptions: right is a wash, wrong is the bar.** The
first attempt carved out the kinds whose footer had something worth keeping,
and because Reading practice alternates `r` and `d` the bar came back every
second or third card: the same jumping layout, arriving less predictably.

```js
const PHONE_MQ = matchMedia("(max-width: 859.98px)");   // must equal the CSS breakpoint
const FLASH_MS = 520;
let flashEl = null, flashTimer = null;

function washEl() { /* creates a fixed, pointer-events:none, aria-hidden div once */ }
function clearWash() { clearTimeout(flashTimer); if (flashEl) flashEl.className = "vflash"; }

// a sheet: a pulse, because the next question is already on screen
function flashVerdict(ok) { /* className = "vflash on" + (ok ? "" : " no"), cleared after FLASH_MS */ }

// a drill: held, for exactly as long as the wait lasts
function holdWash(ok) { /* className = "vflash hold" + (ok ? "" : " no"), no timer */ }
```

In `grades()`, before the footer is built:

```js
if (ok && PHONE_MQ.matches) {
  holdWash(true);
  foot.innerHTML = "";
  armAdvance(next);
  return;
}
flashVerdict(ok);
```

`clearWash()` goes at the top of `drawStep()` and in `endSession()` — the next
card arriving is what takes the wash away.

```css
.vflash { position: fixed; inset: 0; z-index: 70; pointer-events: none; opacity: 0;
          background: var(--jade); transition: opacity .16s ease; }
.vflash.no { background: var(--seal); }
.vflash.on { animation: vflash .52s ease both; }
@keyframes vflash { 0% { opacity: 0 } 18% { opacity: .22 } 100% { opacity: 0 } }
.vflash.hold { opacity: .17; }
@media (prefers-reduced-motion: reduce) {
  .vflash { transition: none; }
  .vflash.on { animation: none; opacity: .17; }
}
```

### The trap worth knowing

The held wash was first written as an animation holding its end frame, and it
**was observed not to paint** — `playState` stuck at `running`, opacity 0. A
declaration is true the instant the class lands; an animation has to be started
and can be throttled or dropped. The wash is the entire feedback, so it cannot
be the thing that does not happen. Use the declaration.

### The sprint setting

A sheet was built to withhold its marking — you hand it in and find out, which
is most of what makes it a test. The wash makes telling you possible, so it is
a choice: `spTell: true` in `blank()`, read as `state.spTell !== false` so an
absent field means yes, a `[data-sp-tell]` handler beside the `[data-sp-set]`
one, and `if (sprintTells()) flashVerdict(q.ok);` in `sprintAnswer`.

The switch renders only under `PHONE_MQ.matches` — on a laptop the wash never
happens and a switch that did nothing would be worse than no switch.

---

## M3 — sprint picker tidy

- Category panels go flat on a phone: `.sp-panel, .sp-panel.open { box-shadow: none; border-color: transparent; }`.
  A `.sheet` carries a border *and* a drop shadow; stacked down a narrow screen
  the two read as a hard rim on a page where nothing else is outlined.
- The How blurb moves onto the row, to the right of the buttons, so the row
  reads across: what the choice is, the choice, what you just chose. Add a
  short `tip` beside each style's `blurb`; the long one is no longer rendered.
- Marking gets the same shape. All four rows are one line each.
- Every `.sp-row-lbl` keeps its 4.6rem width, so all four controls start at the
  same x (115px at 375, 174 on a laptop). Do **not** set these labels to
  `width: auto` to make room — that was tried, and it left four rows with two
  left edges.
- The tip is what gives way: capped to one line, and `display: none` below
  480px, where "Pinyin, then …" is worse than nothing.

```css
.sp-row-wide .sp-chips { flex: none; }
.sp-row-tip { flex: 1; min-width: 0; font-size: .74rem; color: var(--ink-3);
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 479.98px) { .sp-row-tip { display: none; } }
```

The inline tip is the one change in M1–M3 that is not phone-only: it is one
piece of markup and cannot be two.

---

## X1 — repair rounds actually write

The 错字本 round said it approached a character from every side and stopped one
short: `r` read it, `l` heard it, `c` picked its shape out of four. Choosing a
character from a row of four is not writing it, and with one character in the
book the whole repair was three taps.

```js
// in startRepair, last, after the c pass
if (state.writeDrills)
  shuffle(cs.filter(c => window.STROKE_DATA[c])).forEach(c => items.push({ t: "drill", c, kind: "w" }));
```

Not mobile-only — the same round everywhere.

---

## X2 — `startTodayDrill` left `session.repair` set

Every other session starter clears every flag; this one did not clear
`repair`. A repair round earlier in a visit made a row of today's list grade as
one — marking the 错字本, counting as extra reps, and finishing with "Repair
round done" over the wrong screen. Add `session.repair = null;`.

Worth a check in the fork, since starters are easy to add and easy to forget:

```js
['startPractice', 'teachOne', 'startRepair', 'startTodayDrill'].every(fn => {
  const body = app.slice(app.indexOf('function ' + fn), app.indexOf('function ' + fn) + 1600);
  return ['session.menu', 'session.practice', 'session.todo', 'session.repair']
    .every(f => body.includes(f + ' ='));
});
```

---

## Strings to convert

This app writes Simplified. Check each against the Cantonese app's convention,
and check the readings — anything labelled *pinyin* is jyutping there.

| Where | String | Meaning |
|---|---|---|
| `stepCrashed` | 故障 | breakdown — the crash panel's seal |
| Report sheet | 报告 / 经过 / 副本 / 清除 | report / what happened / copy / clear |
| Sprint picker | 即时 / 交卷 | as you go / handed in |
| M1 CSS comments | 认读 阅读 发音 抄写 | existing drill labels, unchanged — listed so they are not missed if the fork differs |

Also: `.drill-q .pin` and `.opts .opt .pin` are sized as **the answer itself,
not an annotation of it** (1.45rem). If the Cantonese app renders jyutping with
tone digits rather than diacritics, check the two-up option boxes still fit.

---

## Verifying a port

The smoke suite gained 29 checks across these changes; they are worth
copying wherever the fork has the same code. Beyond those, measure rather than
look:

- **Desktop is untouched.** At 1280×800: character 88px, writing box 268px,
  option rows 56px, sentence 24px, `.drill-prompt` margin-top 0, and
  `document.querySelector('.vflash')` must be `null` — the element should never
  even be created.
- **No layout shift.** Record `.opts` `getBoundingClientRect().top` before the
  tap and after; it must be identical.
- **The wash holds.** Read `opacity` at 300ms and at 1800ms into a
  sentence-length wait; both must be `0.17`.
- **Nothing scrolls.** At 375×812 and 537×905, `#sesBody.scrollHeight` must not
  exceed `clientHeight` on a writing card.
- **The breakpoints agree.** The number in `PHONE_MQ` and the number opening
  the mobile block in the stylesheet are the same number written twice.

## Still not done anywhere

`TODO.md` carries the notebook's one-box "Add to page" flow, specced end to
end. It was never started here, so there is nothing to port — but it is worth
building once and porting rather than twice.
