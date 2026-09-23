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

---

# Batch 2: songs, the notebook, sprint's board, and everything around them

`e04b100..e632b38` — five commits, version 1.11.10 to 1.12.0. The version
was only bumped once, on the first of the five (`62c3b8b`); the other four
shipped their asset changes under the same `?v=1.12.0` query string, so a
browser that had already fetched 1.12.0 before the later commits landed may
be running stale JS or CSS until something else busts its cache. Bump the
version again (`node tools/version.mjs patch` or similar) as part of
finishing this port, whichever app it lands in first.

Fourteen changes below. Two of them — **C1 and C2** — are bugs that predate
this session and, as far as I can tell, predate the fork too; start there.
Everything else is new feature work, each written up with its own "watch
for" note where building it surfaced a trap, the same way M1–M3 carry their
own gotchas instead of a shared bug entry. None of it has been applied to
the Cantonese version yet. New strings are listed under
[Strings to convert, batch 2](#strings-to-convert-batch-2); verification
checks for this batch are under
[Verifying batch 2](#verifying-batch-2).

## Checklist

| | Change | Files | Kind |
|---|---|---|---|
| **C1** | `mergeDay` merged some counters and let others fall to last-write-wins | `js/srs.js` | bug, data-corrupting |
| **C2** | A stacked settings row borrowed a width rule as a height | `css/app.css` | bug, cosmetic |
| **C3** | The burger button was fixed to its header, not the viewport | `index.html`, `css/app.css` | bug (introduced and fixed this batch), mobile |
| **C4** | The mobile nav loops instead of dead-ending | `index.html`, `css/app.css`, `js/app.js` | new, mobile |
| **C5** | A two-character writing drill | `js/app.js`, `css/app.css` | new |
| **C6** | Build the word: a Practice mode and a Sprint mode | `js/app.js`, `js/sprint.js`, `js/srs.js`, `css/app.css` | new |
| **C7** | The notebook: one box, "Add to page" | `js/app.js`, `index.html`, `css/app.css` | new, mobile only |
| **C8** | Pen: nib thickness and four styles | `js/app.js`, `index.html`, `css/app.css` | new |
| **C9** | A writing sensitivity slider | `js/app.js`, `js/srs.js`, `index.html`, `css/app.css` | new |
| **C10** | Weekly character analytics: a trend chart and a weakness report | `js/srs.js`, `js/app.js`, `css/app.css` | new |
| **C11** | Sprint's board: a spider chart, top 5, latest 10 | `js/sprint.js`, `css/app.css` | new |
| **C12** | Songs | new file `js/songs.js`, `index.html`, `css/app.css`, `js/app.js` | new |
| **C13** | The save icon's nudge, quiet once sync is on | `js/app.js` | polish |
| **C14** | Four answer tiles across, two on narrow phones | `css/app.css` | bug fix, mobile |

---

## C1 — mergeDay's field list didn't match what it was merging

`mergeDay` is supposed to keep the larger side of every counter on a day
record, field by field, so that two devices which each logged separate
activity before syncing add up instead of one overwriting the other. `sp`
and `spr` (sprint counts) were being written onto the day record but were
missing from the merge function's field list — so they fell through to
`Object.assign`'s plain behavior, last write wins, and a sprint logged on
one device could vanish the moment the other device's day record synced
over it.

```js
// js/srs.js
function mergeDay(x, y) {
  if (!x) return y;
  if (!y) return x;
  const out = Object.assign({}, x, y);
  ["new", "rev", "ahead", "extra", "sp", "spr", "ms", "sessions"].forEach(k => {
    if (x[k] !== undefined || y[k] !== undefined) out[k] = bigger(x[k], y[k]);
  });
  return out;
}
```

`ms` and `sessions` are new this batch (time tracking, see [C10](#c10--weekly-character-analytics-a-trend-chart-and-a-weakness-report)) and were added to the list correctly from the start — `sp`/`spr` were the
pre-existing gap. It's the same bug class as B1: a field the record actually
carries, absent from the one place that decides how two copies combine.

### For the Cantonese app

Diff this list against whatever fields the fork's own day record actually
holds — don't just copy the array verbatim, since a fork that tracks its own
extra per-day counters needs them added here too, or it inherits this exact
bug for its own fields.

## C2 — a stacked settings row borrowed a width rule as a height

```css
/* css/app.css */
.settings-row.stacked > label { flex: none; }
```

`.settings-row > label` carries a `flex-basis` written for the normal,
row-direction settings layout — a width. `.settings-row.stacked` switches
that one row to `flex-direction: column` (used for the Voice row, which
needs its control on its own line), and in a column flex container the same
`flex-basis` is read as a *height* instead. The label was being given a
tall minimum height meant for a completely different axis, which pushed the
whole row far taller than its siblings. `flex: none` on the stacked variant
drops the inherited basis and lets the label size to its content.

### For the Cantonese app

Any settings row there using the same stacking pattern for a
control-needs-its-own-line case has the identical trap: `flex-direction:
column` on a child that inherited a row-basis from its parent selector.

## C3 — the burger button was fixed to its header, not the viewport

Introduced and fixed within this batch, not a shared bug, but worth naming
in case the fork's own mobile nav has the same shape: the burger button
lived inside `<header class="topbar">`, and `.topbar` carries a
`backdrop-filter: blur(12px)`. Any `filter`/`backdrop-filter` on an ancestor
becomes the containing block for a `position: fixed` descendant — so the
button, meant to be fixed to the viewport, was actually fixed to `.topbar`'s
own box, which scrolls off-screen with the header. On a tall page the
button ended up rendered above the visible viewport entirely.

Fixed by moving the button's markup out of `.topbar` to be a direct sibling
of `.app`:

```html
<!-- index.html -->
<!-- Deliberately NOT inside .topbar: that element's backdrop-filter makes it
     a containing block for position:fixed children, which pins this button
     to the header's own box instead of the viewport. Keep it a sibling of
     .app so `bottom`/`right` are relative to the screen. -->
<button class="icon-btn burger" id="burgerBtn" aria-label="Menu">☰</button>
```

```css
/* css/app.css, under the mobile breakpoint */
.icon-btn.burger {
  position: fixed;
  z-index: 45;
  right: calc(1rem + env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

### For the Cantonese app

Check what the fork's mobile burger sits inside. If it's anywhere under an
element with a `backdrop-filter` or `filter`, it has this bug regardless of
whether the port copies this exact markup change — `getBoundingClientRect()`
on the button at a tall scroll position is the fast way to confirm.

## C4 — the mobile nav loops instead of dead-ending

The nav strip (`.drawer-nav`) is now a rounded, bottom-center capsule —
scroll-snapped, one destination centered at a time — and it loops: scrolling
past the last item continues into the first, in both directions, instead of
stopping.

```js
// js/app.js
function initDrawerLoop() {
  const nav = $("#drawerNav");
  if (!nav || nav._loopOriginal) return;
  const original = [...nav.children];
  nav._loopOriginal = original;
  nav._loopLen = original.length;
  // Triple the strip: [clone][original][clone]. Land in the middle third
  // and silently jump back to it whenever a scroll carries you into either
  // outer third — that's what reads as "continuous."
  original.forEach(el => nav.appendChild(el.cloneNode(true)));
  original.forEach(el => nav.insertBefore(el.cloneNode(true), nav.firstChild));
  centerDrawerNav(nav, original.length);
  nav.addEventListener("scroll", () => drawerNavTick(nav));
}
```

Repositioning back into the middle third happens on a debounced `scroll`
listener (`clearTimeout`/`setTimeout(reposition, 120)` — wait for scrolling
to actually stop before silently snapping `scrollLeft`, or the jump itself
fires another scroll event and fights the user's gesture). A second,
`requestAnimationFrame`-throttled tick scales and fades items by distance
from center for the wheel-like visual.

### The one trap

The tripled children are clones (`cloneNode(true)`) — event listeners bound
to the original nav items by reference (rather than delegated from the
`.drawer-nav` container) will not exist on the clones the user actually taps
most of the time. Bind nav taps at the container level, or rebind after the
tripling, not on the original elements before `initDrawerLoop()` runs.

### For the Cantonese app

This is the same shape as the "skincare inventory tracker" rolodex pattern
the design was modeled on — if a similar looping picker gets built for the
Cantonese app independently rather than ported, the clone-and-recenter
structure here is the one to match rather than reinventing a different
looping approach.

## C5 — a two-character writing drill

A new drill kind, `x`, sits next to the existing single-character `w`:
write a two-character word from memory, one canvas, both characters in
sequence.

```js
// js/app.js
const write2Words = ch => (ch.words || []).filter(w =>
  cjkOf(w[0]).length === 2 && [...w[0]].every(c => canRead(c) && window.STROKE_DATA[c])
);
```

Both characters need stroke data, not just the headword — a word can be
"known" for reading purposes while one of its two characters has never had
a writing quiz written for it, and this filters those out before they can
be offered as a two-character writing question.

`KIND_LABEL.x`, `SKILL_OF.x = "w"` (it trains the same skill as single-char
writing — same SRS bucket, same weakness reporting), and
`REPAIR_MODE.x = "w"` slot `x` in next to `w` everywhere the existing kind
is switched on. `grades()`'s writing check widened from
`item.kind === "w"` to `item.kind === "w" || item.kind === "x"` so the
writing-specific grading path (leniency, stroke checking) picks up the new
kind too.

### For the Cantonese app

The filter's assumption — `cjkOf(w[0]).length === 2` — is specific to
two-syllable compound words being written as exactly two characters. If the
fork's word list carries words of other lengths that should also get a
multi-character writing drill, this filter needs generalizing rather than
copying verbatim.

## C6 — build the word: a Practice mode and a Sprint mode

`buildWords` picks the same kind of multi-character word data as C5, but
for tile assembly rather than stroke writing — a much smaller bar to clear,
which is why it only requires the headword's characters to be *readable*,
not writable:

```js
// js/app.js
const buildWords = ch => (ch.words || []).filter(w =>
  cjkOf(w[0]).length > 1 && canRead(w[0])
);
```

The Practice-mode drill (kind `a`) already existed before this batch and was
refactored to call `buildWords(ch)` rather than duplicating its own filter.
What's new is the same activity as a Sprint mode:

```js
// js/sprint.js
SPRINT.a = { zh: "组词", name: "Build the word", skill: "c", verb: "build", ... };
```

`sprintPool()` gained an `a`-mode branch filtering to characters with at
least one `buildWords` result; `sprintQuestion()` builds `q.word`/`q.tiles`
for that mode; `sprintRenderQ()` renders a tap-to-assemble UI — tiles tapped
in order into `.slots`, a `filled` array tracking progress, `sprintAnswer()`
called with the assembled string once every slot is filled. The
wrong-answer review row (`sprintSaid()`) checks for `q.word` first and shows
the word directly, instead of doing a fresh `CHAR_INDEX` lookup that assumes
a single-character question.

### For the Cantonese app

Same note as C5: `cjkOf(w[0]).length > 1` bakes in an assumption about how
compound words are represented in the word list. Confirm the fork's data
shape matches before porting the filter as-is.

## C7 — the notebook: one box, "Add to page"

Mobile-only. The notebook (the free-writing diary/journal feature) gained a
dedicated mobile flow: one writing box, and an "Add to page" button that
appends whatever's in the box onto today's page and clears the box for the
next character, rather than requiring the desktop grid-writing gesture on a
touch screen.

```js
// js/app.js
const WP_COLS_DEFAULT = 6;
const wpPageCols = page => Math.max(1, Math.round((page.w || WP_COLS_DEFAULT * wp.cell) / wp.cell));
const wpPageCap  = page => (page.rows || wp.rows) * wpPageCols(page);

async function wpTodayPage() {
  // Finds today's page if it isn't full yet, otherwise starts a new one.
  // Guards against pre-existing freeform pages (created before this flow
  // existed) via `typeof p.count === "number"` — a legacy page has no
  // `count` field and is never auto-continued into, only new pages created
  // through this mobile flow are.
}

async function wpmAdd() {
  // Computes the next col/row from page.count, scales the box's captured
  // strokes from box-pixel-space into wp.cell-space, appends to
  // page.strokes, saves via diaryPut(), clears the box, advances count.
}
```

A full parallel set of mobile-scoped helpers mirrors the desktop
write-page functions but bound to the mobile box's own canvas:
`wpmDraw`/`wpmBindInk`/`wpmSetPen`/`wpmSizeInk`/`wpmClear`/`wpmPad`/
`wpmStatus`, next to the desktop `wp*` equivalents.

Page records gained a `count` field, present only on pages created through
this mobile flow. That's the mechanism the legacy-page guard above depends
on — don't backfill `count` onto old pages when porting, or they become
eligible for auto-continuation despite predating the box-scaling logic
that assumes it.

### The two bugs found building this (both fixed here, watch for both independently)

**Box rendering at roughly twice its intended height.** The mobile ink
canvas (`#wpmInk`) had no explicit CSS `width`/`height`, so it rendered at
its raw pixel-buffer size (the `width`/`height` *attributes*, which get
DPR-scaled) rather than its laid-out CSS size — a canvas always does this
unless told otherwise. Fixed with:

```css
#wpmInk { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; }
```

**The page growing longer on every failed swipe.** Two compounding causes:
first, the box had no `touch-action: none`, so a drag gesture on the canvas
was also interpreted as a page scroll by the browser; second, the box's
size uses `dvh` units, which recompute as the mobile browser's chrome
(address bar, etc.) hides on scroll — so each leaked scroll grew the
viewport-relative box, which grew the page, which allowed more scroll room
next time, compounding. Fixed with:

```css
.wp-mobile .writer-box .tian { touch-action: none; }
```

### For the Cantonese app

Both CSS fixes above are general — any custom canvas ink-capture surface on
mobile needs `touch-action: none` regardless of which feature it belongs
to, and any canvas sized via CSS rather than its `width`/`height`
attributes needs those set explicitly or it renders at the wrong scale. If
the fork has its own touch-drawing surface anywhere (not just a ported
notebook), check both independently.

## C8 — pen: nib thickness and four styles

```js
// js/app.js
const PEN_STYLES = {
  pen:    { zh: "钢笔",  name: "Pen",    alpha: 1,   widthMul: 1,    cap: "round" },
  brush:  { zh: "毛笔",  name: "Brush",  alpha: .92, widthMul: 1.7,  cap: "round" },
  pencil: { zh: "铅笔",  name: "Pencil", alpha: .62, widthMul: .65,  cap: "round" },
  marker: { zh: "马克笔", name: "Marker", alpha: .4,  widthMul: 2.4,  cap: "square" }
};

function applyPenTo(ctx) {
  // Shared setter: reads wp.penStyle / wp.pen (nib thickness) and applies
  // alpha, line width and cap to the given canvas context. Called by both
  // the desktop and mobile drawing paths so they can't drift apart.
}
```

`applyPenSettings()` keeps both the desktop and mobile `<select>` elements
(`#wpPen`/`#wpmPen` for nib, `#wpStyle`/`#wpmStyle` for style) and both
canvases in sync whenever either changes.

### Two bugs found building this

**Resizing while using a translucent style compounded its own transparency.**
`wpSizeInk()` preserves existing ink across a resize by drawing the old
canvas onto the new one — but that `drawImage` call ran under whatever
`globalAlpha` `applyPenTo` had just set, so every resize while pencil or
marker was active made the already-drawn ink a little more transparent
again, on top of itself. Fixed by blitting the preserved snapshot at
`globalAlpha = 1`, then restoring the pen's actual alpha afterward.

**A loaded page never showed a marker's square cap.** `wpPaint()` hardcoded
`ctx.lineCap = "round"` internally, silently overriding whatever style the
context had just been set to. Removed the hardcode from `wpPaint()` itself
— the caller is responsible for context state now — and added it explicitly
only where it's actually needed: the diary-thumbnail rendering loop, which
draws onto a fresh canvas with no prior pen state of its own.

### For the Cantonese app

If the fork's writer already has its own hardcoded `lineCap`/`lineWidth`
anywhere inside a shared paint function, that's the same trap waiting for
whenever a per-style pen setting gets added later — worth checking even
without porting the pen-style feature itself.

## C9 — a writing sensitivity slider

Not a change to the writing philosophy — the strictness stays, on purpose,
because guessing loosely is exactly what stroke practice shouldn't reward.
What's new is a Settings slider that scales HanziWriter's own `leniency`
quiz option (it multiplies `averageDistanceThreshold`, default 350; default
leniency is 1) across five named steps rather than a raw number:

```js
// js/app.js
const LENIENCY_LEVELS = [
  { v: 0.7,  label: "Strict" },
  { v: 0.85, label: "A little stricter" },
  { v: 1,    label: "As it's always been" },
  { v: 1.3,  label: "A little more forgiving" },
  { v: 1.6,  label: "Forgiving" }
];
```

`state.writeLeniency` (default `1`) is read into `leniency:
state.writeLeniency` at every `.quiz({...})` call site — there are four:
the teach-one flow, the single-character write drill, the two-character
write drill from C5, and the notebook's quest writer. Missing one of these
silently leaves that surface at the old fixed strictness while the rest of
the app honors the slider.

### For the Cantonese app

Grep for `.quiz({` in the fork rather than trusting a fixed count of four —
any additional writing entry point (a different drill mode, a different
review surface) needs the same `leniency: state.writeLeniency` argument or
it won't respect the slider.

## C10 — weekly character analytics: a trend chart and a weakness report

Two related additions, both explicitly aggregated rather than event-logged
— a per-character-per-event log was ruled out up front as unbounded and
not worth the storage, so both features are built on top of existing or
newly-bucketed summaries instead.

**Weekly trend.** A new `charWeeks` state map, keyed by ISO week
(`weekKey()`, pre-existing, format `"YYYY-Wnn"`), each week a small
per-character tally rather than a per-event list:

```js
// js/srs.js
function tallyCharWeek(c, ok) {
  const wk = weekKey();
  const w = state.charWeeks[wk] || (state.charWeeks[wk] = {});
  const r = w[c] || (w[c] = { seen: 0, right: 0, wrong: 0 });
  r.seen++; ok ? r.right++ : r.wrong++;
}
```

Called from exactly one place — `grade()`, the single low-level SRS
function both regular drills and `sprintAnswer()` funnel through — so every
answer anywhere in the app, drill or sprint, is captured without needing a
second call site:

```js
// js/srs.js, inside grade(c, correct, skill, opts)
r.seen++; r.last = dayKey();
tallyCharWeek(c, correct);
```

`charWeekTrend(weeks = 8)` reads that map back out, zero-padding any week
with no data so the chart always has a full, contiguous x-axis, and sums
`seen`/`right`/`wrong`/`chars` across every character for each week —
that's what makes it "weekly activity" rather than a per-character
breakdown; the per-character detail stays in `charWeeks` for the weakness
report below, but the trend view only needs the aggregate. Rendered as a
hand-built SVG bar chart (`weeklyRepsChartHtml()`, no charting library),
next to a `timeTotal()`/`timeToday()` note for the "fun metric" — total and
today's study time.

**Weakness report.** Deliberately reuses data that already existed rather
than adding a new bucket: lifetime `state.chars[c].skills` and `.shown`,
already tracked per skill (`r`/`p`/`c`/`w` — reading, sound, recall,
writing) for the SRS scheduler itself.

```js
// js/srs.js
const WEAKNESS_SKILLS = ["r", "p", "c", "w"];
const WEAKNESS_MIN_SHOWN = 3;
const WEAKNESS_MIN_GAP = 0.34;

function weaknessReport(limit = 10) {
  // For each character with enough attempts on at least two of the four
  // skills (WEAKNESS_MIN_SHOWN each), compares accuracy across skills and
  // surfaces characters where one skill lags another by more than
  // WEAKNESS_MIN_GAP — "reads fine, writes badly" is exactly this shape.
}
```

Rendered via `weaknessesHtml()`, reusing the existing `.leech`/`.leech-list`
CSS from the pre-existing "Sticking points" section rather than introducing
new list styling. Both new sections drop into `renderRecord()`'s sidebar
after the existing Skills section; a fourth stat tile,
`fmtStudyTime(timeTotal())` / "Time studied", was added to the stats strip
at the top of the same page.

### For the Cantonese app

`grade()` (or whatever the fork's equivalent single choke-point function is
named) is the right and only place to add the `tallyCharWeek` call — if the
fork's SRS grading isn't similarly centralized (i.e. drills and sprints
each grade independently rather than sharing one function), the call needs
adding at every one of those sites instead of one, and it's easy to miss
one.

## C11 — sprint's board: a spider chart, top 5, latest 10

The sprint results board was rebuilt more compact, with a spider/radar
chart above the record lists:

```js
// js/sprint.js
const SPRINT_RADAR_MODES = ["r", "w", "l", "a"];

function sprintRadarHtml() {
  // One spoke per sprint mode. Radius per spoke is the grade index + 1 out
  // of 5 rings (SPRINT_GRADES.indexOf(sprintGrade(...)) + 1) — a mode with
  // no runs yet sits at the center (0), not at an arbitrary default ring,
  // so "never attempted" reads visually distinct from "attempted and did
  // poorly."
}
```

`sprintTopHtml()` sorts `Object.values(sprintState().best)` by accuracy
descending, then pace ascending, and shows the top 5 of all time above
`sprintRecentHtml()`'s latest-10 scrollable list (`.sp-board-scroll`,
capped height, `overflow-y: auto`) — both built on a shared row renderer,
`sprintRowHtml(r, showAccuracy)`, so the two lists can't drift apart in
formatting. `sprintBoardHtml()` composes radar + top 5 + recent + a
lifetime-total note into the full board.

### For the Cantonese app

`SPRINT_RADAR_MODES` is hardcoded to this app's four sprint modes
(`r`/`w`/`l`/`a`) — if the fork's sprint has a different set of modes (more,
fewer, or different letters), that array needs to match, and the radius
mapping assumes exactly `SPRINT_GRADES.length` rings, so a differently-sized
grade scale needs the ring count adjusted too, not just relabeled.

## C12 — songs

A new file, `js/songs.js`, and a new top-level section (`歌词` / Songs) —
learn through imported lyrics rather than the flashcard/SRS deck. A song is
a title, an optional artist, and a block of lyric text split into lines;
known characters (checked against the same main-library `isKnown()` used
everywhere else in the app, not a separate side list) are visually
distinguished as the user progresses.

```js
// js/songs.js
function addSong(title, artist, text) {
  // id = String(Date.now()) + a random two-character suffix — rapid
  // successive calls in the same millisecond otherwise collide on id and
  // silently overwrite each other in state.songs.
}
function updateSong(id, title, artist, text) {
  // Sets `edited: Date.now()`, kept separate from `added`, specifically so
  // sync merge (below) can tell an edited copy from an untouched one.
}
```

Sort order (by name, artist, character count, or characters known) is a
module-level variable, not persisted — matches the pre-existing pattern
already used for the notebook's own sort setting.

**Character interaction**, reusing and extending shared tip-popup
infrastructure rather than duplicating it:

```js
// js/songs.js
// SONG_PRESS_MS = 420, SONG_PRESS_TOL = 10
// Long-press a character → showTip(g), the same small popup used
// elsewhere in the app. Tap (not a long-press) → openCharPeek(c), a full
// definition card stacked on top of the lyrics rather than navigating away
// from the song.
```

`openCharPeek`/`closeCharPeek` reuse the existing `charCard()`/`bindCard()`
rendering rather than building a second definition-card renderer, but they
render into a *second*, stacked overlay (`#charPeek`, its own `.sheetview`,
`z-index: 92` — above the base sheet layer's `55`) instead of the app's one
shared `#charView`. That's the fix for a real bug found building this:
originally both features used the single shared sheet, so tapping a
character while a song was open replaced the song with the character card,
and closing the character card returned to the song *list*, not back to
the song that had been open — the shared sheet has no concept of "what was
under this."

### Two more bugs found building this

**Tip popup randomly persisting, sometimes surviving a refresh.** Touch has
no `mouseout` equivalent, so the tip's `.on` class was never reliably
cleared on touch devices, and it could resurface after whatever had been
drawn over it (a sheet, a new session) closed. Fixed with a global
click-outside listener plus explicit `hideTip()` calls as safety nets in
`go()`, `openSheet()`, and `closeSheet()` — not scoped to songs, since the
tip is shared infrastructure and the bug applied everywhere it's used.

**Sync merge tie-break using `added` instead of `edited`.** Two synced
copies of the same song with identical `added` timestamps (the common case
— one device edits a song it hasn't touched on the other since import)
were being resolved by argument order in the merge call rather than by
which side actually held the edit, which could silently discard an edit on
sync:

```js
// js/srs.js
const songStamp = s => s.edited || s.added || 0;
out.songs = mergeBy(a.songs, b.songs, (x, y) => (songStamp(y) >= songStamp(x) ? y : x));
```

Covered by a two-directional regression test in `tools/smoke.mjs` — same
edit landing on either side of the comparison must win.

### The copyright constraint

The feature ships with an **empty** default song roster, not the "5 most
popular 2000s Mandarin hits" originally asked for — reproducing real song
lyrics isn't something this app can ship, so import-your-own is the whole
feature; there's no bundled content to port here, no matter which app it's
built for.

### For the Cantonese app

This is the biggest single port in this batch — expect it to be closer to
"build the equivalent feature" than "port the diff," since `isKnown()`,
`charCard()`/`bindCard()`, `showTip()`, and the whole tip-popup
infrastructure it leans on all need their Cantonese-app equivalents to
already exist and have matching signatures first. The two bugs above are
worth re-checking independently even if the feature is rebuilt rather than
ported line-for-line — the tip-persistence bug in particular is general to
any touch tooltip, not specific to songs.

## C13 — the save icon's nudge, quiet once sync is on

The save icon previously always carried a small notification-style dot,
regardless of sync state — which reads as "you have something to do" even
right after a device has just synced. `renderStreakChip()` now checks
`sync.status === "in"` and suppresses the `.nudge` class when sync is
actively connected; `onSyncChange` calls `renderStreakChip()` so the icon
updates live the moment sync status changes, not just on next render.

### For the Cantonese app

Check the fork's sync status values match `"in"` — if its sync module
reports connection state under different strings, this check needs
updating to match rather than being copied verbatim and silently never
firing.

## C14 — four answer tiles across, two on narrow phones

The Records page stats strip went from 3 tiles to 4 (adding the "Time
studied" tile from C10). At 4 columns, the longest label/value pair
("Time studied" / "under a minute") wrapped to three lines on phones
narrower than 480px. Fixed with the same fallback pattern already used
elsewhere in the stylesheet for a 4-across row on narrow screens:

```css
/* css/app.css */
.stats { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 479.98px) {
  .stats { grid-template-columns: 1fr 1fr; }
}
```

### For the Cantonese app

Only relevant if the fork's Records page also gains a 4th stat tile — if it
stays at 3, this isn't needed. If it does grow a 4th tile for any reason
(this one or a different one), check the narrowest supported phone width
against the actual longest label in the fork's own tiles, since the
480px breakpoint here was picked against this app's specific "Time
studied" label length, not a universal number.

---

## Strings to convert, batch 2

| Chinese | English | Where |
|---|---|---|
| 双字默写 | Writing two characters | Practice mode label, C5 |
| 双字笔顺 | Write the word from memory | Drill kind label, C5 |
| 组词 | Build the word | Practice mode label and Sprint mode name, C6 |
| 每周 | Weekly | Weekly activity section gloss, C10 |
| 差距 | Gap | Uneven skills / weakness section gloss, C10 |
| 最好 | Best | "Top 5, all time" gloss, C11 |
| 最近 | Recent | "Latest 10" gloss, C11 |
| 歌词 | Lyrics | Songs section heading and nav tab, C12 |
| 加歌 | Add a song | Add-song sheet title and shortcut, C12 |
| 改歌 | Edit song | Edit-song sheet title, C12 |
| 题 | Title | Song title field label, C12 |
| 词 | Lyrics | Song lyrics field label, C12 |
| 删除 | Delete | Delete-song confirmation, C12 |
| 钢笔 | Pen | Pen style, C8 |
| 毛笔 | Brush | Pen style, C8 |
| 铅笔 | Pencil | Pen style, C8 |
| 马克笔 | Marker | Pen style, C8 |

Same rule as the first batch: any new `hanLabel()` call needs a character
covered by `CHAR_INDEX` or `EXTRA_GLOSS`, or the smoke suite's gloss-coverage
check fails it. Two attempted glosses this batch needed substituting for
exactly that reason — "佳" (from an initial "最佳") and "偏" (from an initial
"偏科") weren't covered, so "最好" and "差距" were used instead. Check
coverage before committing to a string, not after:
`grep -o '{c:"X"' js/data.js` and `grep -o '"X":\[' js/data.js`.

## Verifying batch 2

The smoke suite sits at 782 passing checks as of `e632b38`, all of the growth
from this batch's own new regression tests (song merge in both tie-break
directions, day-record merge keeping the bigger side of `sp`/`spr`/`ms`/
`sessions`, and `charWeeks` nested merge — same-week-same-character
per-field, same-week-different-character, and whole-week-only-one-side).
Copy those tests' shape wherever the fork carries the equivalent merge
functions. Beyond the suite:

- **The burger button is actually fixed to the viewport.** At any scroll
  position on a tall page, `#burgerBtn.getBoundingClientRect()` must report
  a `top` within the visible viewport height, not off-screen negative or
  past it.
- **The nav loop is silent.** Scroll the mobile nav strip rapidly past
  either end; `scrollLeft` should snap back without any visible flash,
  jump, or flicker in the items themselves.
- **The mobile writer box is square.** At a phone width,
  `#wpmInk.getBoundingClientRect()` width and height should match (within a
  pixel or two) — not the roughly 2:1 mismatch the original sizing bug
  produced.
- **A translucent pen style doesn't drift on resize.** Draw a stroke with
  the pencil or marker style, trigger several box resizes (e.g. via
  `resize_window` at different widths), and confirm the stroke's rendered
  opacity is unchanged rather than fading further each time.
- **Leniency actually reaches every writer.** Set `state.writeLeniency` to a
  visibly different value (e.g. `1.6`) and confirm all four writing entry
  points (teach-one, single-character drill, two-character drill, notebook
  quest writer) pass it through to their `.quiz({...})` call — grep is
  faster than clicking through all four by hand.
- **Songs: closing a character peek returns to the song, not the list.**
  Open a song, tap a character to open the full card, close it — the song
  itself, not the song list, should still be open underneath.
- **Songs: the tip popup never survives a refresh.** Long-press a character,
  reload the page without explicitly dismissing the tip — it must not
  reappear.

## Still not done anywhere

Nothing carried over from batch 1 is still outstanding — the notebook's
one-box "Add to page" flow (batch 1's open item) shipped this batch as
[C7](#c7--the-notebook-one-box-add-to-page). As of `e632b38`, the
stroke-recognition-as-an-alternate-capture-method idea raised alongside the
sensitivity slider in C9 is the one deliberately deferred item: floated as
worth considering later, not specced or started, and the leniency slider
was built instead as the smaller, immediately useful piece of that request.
