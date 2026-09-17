# Hanzi Quest

A practice notebook for learning to read Chinese characters. 302 characters
across seven core stages plus a kitchen topic pack, taught in an order where
each one makes the next easier.

## Picking this up again

**Published at:** https://claude.ai/code/artifact/204c1b76-7d3c-4d96-95dd-9287e82f9938

To keep updating that same page rather than creating a duplicate, the URL above
has to be passed explicitly when publishing — a fresh conversation has no memory
of it. Say something like:

> Update the Hanzi Quest artifact at
> https://claude.ai/code/artifact/204c1b76-7d3c-4d96-95dd-9287e82f9938 —
> publish index.html with css/app.css and the four js/ files.

Publishing without it makes a *new* artifact and you lose the link.

The rest of the context lives here: this README explains the reasoning behind
the decisions, not just what they are, and `git log` has the summary. Open a
session in this folder and both are readable.

Run the three checks before shipping anything (see **Before you ship a change**).
They exist because they caught real problems: the component checker found 32 of
302 "Built from" claims wrong.

## Running it

No build step, no dependencies. Clone it and:

    node tools/server.mjs         # open http://localhost:8731

Everything the page needs is committed, including `js/audio.js`. That file used
to be left out of the repo — it's 2.1 MB of macOS speech output and
redistributing Apple's synthesised voice is a grey area — but leaving it out
meant a clone, and anything published from one, served a 404 for it and went
silent, with nothing on screen to say why. A missing script fails quietly. It's
in the repo now; if you'd rather it weren't, add it back to `.gitignore` and
regenerate it locally with `node tools/make-audio.mjs` (macOS, about a minute).
Settings says plainly when the clips aren't loaded, so that path isn't a mystery
either. See **Audio** below.

## What's here

- **今天 Today** — the day's session, what you've learned today, and the
  menu side quest.
- **字库 Library** — every character, filterable; tap any to study or restudy.
- **部首 Radicals** — 27 radicals taught properly, each with the characters
  in your library that use it.
- **记录 Record** — the full calendar, the stage ladder, per-skill mastery,
  and settings.

Recognition, pronunciation, recall and handwriting are tracked as separate
skills, because they are separate knowledge: you will recognise 学 long
before you can write it from memory.

## The blocks on Today

1. **The invitation** — the session, and the characters you've picked up so
   far today. Anything learned from the Library lands here too.
2. **Today's practice** — a to-do list, everything scoped to *today's*
   characters so it's short and finishable: 学习 learn, 认读 recognise,
   阅读 read, 发音 say, 抄写 write out. Each ticks off when you finish it,
   learning included — see **What the numbers count** for why that row is on
   the list rather than above it, and why a locked row is now shown in the
   fraction as locked rather than left out of it.
   Ticks are **evidence-based**: a task completes when every one of today's
   characters has been answered correctly in that task's drill during a
   session — so doing pronunciation from *Go deeper* ticks 发音 just the same
   as doing it from the row. Each task declares which drill kinds prove it
   (`proves`), so 认读 and 阅读 can't tick each other.
3. **Go deeper** — the same skills over your *whole* library, shakiest first,
   each with a ring that fills with every clean pass and a bar showing how the
   characters are spread across nought, one, two and three of them. The
   optional extra. See **Go deeper, and what "solid" means**.
4. **Read a Menu** — the side quest.

Both flashcard decks sit together in the right-hand rail on wide screens,
today's above all characters; they stack under the main column otherwise.
Completion always reads green — red is reserved for the seal accent and for
"this is today's target", never for a tick.

Practice records skill progress and a miss still pulls a review forward, but a
correct answer does **not** push the review date out: drilling early shouldn't
delay the review you actually needed (`grade(..., {practice:true})`).

### Reading never outruns you

`readingMaterial()` returns the longest thing built from a character that the
learner can *actually read* — its example sentence if every glyph is known,
otherwise a word, otherwise nothing, in which case the reading drill isn't
offered at all. So a beginner with five characters is never shown a full
sentence; they get 大人 and 小心 first, and sentences arrive when they fit.

## The side quest

`Read a Menu` teaches **one character a day** from a real restaurant menu.
Characters you know are inked in; the rest stay grey. Hover any glyph for its
pinyin and meaning — that's the hint when you're stuck. `MENU_CHARS` is
derived from the menu itself and ordered so characters actually *printed* on
it come first, with the ordering-phrase characters last: learning one should
light up a dish you can see.

The menu grows up with you (`MENU_TIERS`): dish names only, then descriptions
under each dish, then a specials board with longer names and a line from the
kitchen. Every glyph at every tier is a character the library teaches, which
`tools/smoke.mjs` enforces.

## Writing

Writing drills are **sticky**: once a character has had one, it keeps getting
them until three land. You learn a character's strokes by writing it several
times in a short window, not once every thirty-five days — and without this
the reps scatter across the library and no single character ever becomes
solid. A 150-day simulation went from 4 characters solid in writing to 55.

### Writing, in two places

These are deliberately separate — one is practice on what you're learning,
the other is a blank page.

**抄写 Write it out** — guided copying of **every** character you learned
today, shuffled, so you're recalling them rather than reciting the order you
met them in. Five squares at a time; finishing a line slides straight into the
next without breaking stride, and finishing the deck offers another round
(reshuffled) or hands you on to the next outstanding exercise. A word you can
fully write is the other option.

The pointer lock is held on the **stage**, not on the active square. Releasing
and re-requesting it per square raced with the browser's own lock change and
tore the pad down — which is why the first squares misbehaved while later ones
were fine. `padRetarget()` now moves the brush between squares without
touching the lock. **T** toggles the trackpad.

**练字 Write** (its own tab) — a Chinese exercise book. Dozens of 米字格
squares, one sheet of ink that persists until you clear it, three nib widths,
and *Add more rows* when you fill it.

The character to trace is chosen from a panel beside the page, not a dropdown
— a `<select>` of hundreds of characters is unusable, and it only gets worse
as you learn more. Characters are grouped by **the day you learned them** by
default, and can be sorted by stage, alphabetically, or shakiest-first. Search
ignores tone marks, so "shui" finds 水 and "lv" finds 绿 (the library search
does the same). Nothing is checked. Mouse, finger or trackpad.

Pages can be saved to a **practice diary**, kept by date with thumbnails you
can reopen. They're stored as stroke vectors in IndexedDB, not as images: a
densely filled page is about 30 KB of points against 333 KB as a PNG, vectors
redraw crisply at any size, and they re-ink themselves correctly when the
theme changes. localStorage would have held about fifteen pages as PNGs;
IndexedDB holds years of vectors.

The page is built once and `renderWrite()` no-ops thereafter — rebuilding it
would wipe whatever is on it, which is exactly the bug the first version had.
Resizing preserves the ink by copying it through an offscreen canvas.

### Handwriting is scored differently, on purpose

A trackpad is not a brush, and a stroke can simply fail to register. So the
writing drill:

- allows slips in proportion to the character — `ceil(strokes / 3)`, so one
  for 大 and three for 学 — and says so before you start;
- **never demotes the character or drags it back to today** when you miss
  (`grade(..., {gentle:true})`). Failing to produce 学 from memory says
  little about whether you can *read* it, so it withholds the 笔 credit and
  records the attempt, and leaves the review schedule alone;
- doesn't requeue a miss, because you've just been shown the strokes.

A missed *recognition* answer still costs two levels and comes back the same
day. That asymmetry is the point: the review schedule tracks reading, and
handwriting is its own skill kept alongside it.

### Trackpad mode

A browser cannot read a trackpad's actual contacts — no API exposes finger
positions. What it can do is Pointer Lock: hide the cursor and hand the page
raw, unbounded movement deltas. Integrating those into a brush position turns
the trackpad into a relative drawing surface, so strokes come from moving your
finger instead of dragging a held click.

hanzi-writer reads `mousedown`/`mousemove` on its SVG and `mouseup` on the
document, positioning from `clientX`/`clientY`. So while locked, a capture-phase
listener swallows every real pointer event and the brush feeds it synthetic
ones instead — all of its stroke matching, ordering and hinting keeps working.

Ink is down while **space** is held, or toggled by a **tap**. Escape exits.

`Try writing` on a character card starts a fresh attempt and goes straight into
trackpad mode, then drops out of it the moment the character is finished — so a
second go is one click. In the notebook the trackpad follows whichever square is
active, re-attaching as you advance.

The guards are only armed once the lock is actually granted, so a refused lock
can never leave the writer deaf to a real hand. Pointer lock is commonly
refused inside an embedded frame that wasn't granted it — the page says so and
suggests opening in its own tab.

## Audio

**Characters play bundled clips, not synthesised speech.** `speechSynthesis`
turned out to be unusable here for two compounding reasons: it is blocked in
the cross-origin frame an artifact is embedded in, and several Chinese voices
macOS lists have no voice data at all — `say -v Eddy` produces 0.016s of
silence where `say -v Tingting` produces 0.84s. In both cases `speak()`
queues, `speaking` goes true, and `start` never fires, with no error. Four
attempts at fixing the engine failed because the engine was never the fix.

So `tools/make-audio.mjs` records all 302 characters with macOS `say` and
bundles them as base64 AAC in `js/audio.js` (1.6 MB of audio, 2.1 MB encoded).
They play through one shared `<audio>` element, unlocked with a muted play on
the first real click so later programmatic plays are allowed. **That file is
committed**, because the app is only as good as its sound and a clone without
it is silent in a way nothing on screen explains — see **Running it**.

If the bundle is missing altogether — a clone that hasn't regenerated it,
a deploy that dropped the file — `clipCount()` is zero and the Sound panel in
Settings says so and gives the command to fix it, rather than leaving someone
turning the volume up at a page that was never going to make a sound.

Words and sentences aren't bundled — they'd multiply the weight — so
`sayPhrase()` reads them **one character at a time from the clips** instead.
Not connected speech, but every character is actually spoken, which the system
voice can't be trusted to do here. Only if a character has no clip does it
fall back to the system voice, with a picker and a Test button in Settings that
reports honestly when a voice is listed but silent. If sound is off or a play
is refused, the session bar says so and is one tap to fix.

## Session flow

A correct answer shows its verdict, runs a short countdown on the Next button
and then moves on by itself (`AUTO_ADVANCE_MS`). A **wrong** answer never
does — that's the one moment you need to read what's on screen — and pressing
replay cancels the countdown, since wanting to hear it again means wanting to
stay. Space still skips the wait, and the timer is cleared on every render and
on leaving, so a stray advance can't fire into a closed session.

The writing drill keeps its Trackpad and "Show me the strokes" controls
directly beneath the box rather than in the footer: they act on the box, so
they belong next to it. Showing the strokes doesn't end the question — that's
the moment you most want to try it — so it offers *Now you try*, *Show again*
and *Move on*. Writing it after peeking still counts as practice but withholds
the 笔顺 credit.

## The question timer

A bar drains across the top of each question over `QUICK_MS` (6s). Answering
while it still has length earns a 快 badge with your time, and the finish
screen reports your average and how many were quick. **Running out costs
nothing** — no auto-fail, no penalty; it's there for pace, not pressure. It
doesn't run on cards you're reading rather than answering, and it's off
entirely for handwriting: the input is slow by nature, and reaching for the
Trackpad button shouldn't look like hesitation. Settings has a
switch.

## Keyboard

On screens from 820px the four short-answer options sit in **one row**, so
`1`–`4` runs left to right the way the numbers read. Below that they fall back
to two-up, still numbered in order.

`1`–`9` answer (options are numbered on screen), `space` or `enter` moves on,
`esc` leaves. In flashcards `space` flips and the arrows navigate. Space is
ignored while the trackpad holds it for inking.

## Backup

The **⤓ button in the top bar** saves progress *and* the practice diary as one
JSON file, and loads one back. See **Progress storage** for why it's in the top
bar and how the three save paths differ.

## What the numbers count

Every counter on Today is a count of **characters**, because the queues it sits
beside — New, Due — are counts of characters. Mixing the two units made the
page argue with itself, so three things changed:

- **Revised today** was `days[today].rev`, which increments on every answer.
  A character drilled four times in one session read as four characters
  revised, and the number ran ahead of the queue next to it. `tally()` now also
  records *which* character (`days[k].revC`), and `reviewedToday()` counts
  those. The rep count is still kept, and is still what the activity heatmap
  and the "cards done" total use — a day of forty reps *was* a bigger day than
  one of four. It's just not what "revised today" means.
- **The hero ring** measured answers against a queue of characters, so it
  outran itself for the same reason. It's `learnedToday() + reviewedToday()`
  over that plus what's left.
- **Today's practice** counted only the four drills, and silently dropped any
  that couldn't be started yet — so a day where no sentence in your library
  used today's characters read "3 of 3 done" while five rows sat on screen with
  two unticked. Learning the day's characters is the first step *on* that list,
  so it counts like the others; a step that genuinely can't be done yet is
  shown with a lock and a reason, and reported separately (`2 of 4 done · 1
  locked`) instead of shrinking the denominator until the list looks finished.

## Go deeper, and what "solid" means

A character is **solid** in a skill after `PASSES_FOR_SOLID` (3) clean answers
in that mode. That threshold is still right — one correct answer can be a lucky
guess — but reporting *only* it was wrong, in two ways:

- The ring moved on the third correct answer and not before, so a whole round
  of practice could change nothing on screen. It now fills with **every clean
  pass**: `skillStanding().pct` is passes (capped at three each) over the
  three-passes-each goal. Going back over the same characters and getting them
  right again is what makes them stick, so it should be visible while it's
  happening.
- "5 of 5 solid" was measured against every character known, which **writing
  can never reach** — a character with no stroke data can't be drilled, so the
  ring sat permanently short of full. Each mode is now measured against
  `practiceChars(mode)`, the characters it can actually ask about.

Under each tile is a bar split by how many passes each character has had —
solid, two, one, untouched. Two passes on everything looks different from three
on half of it, and both look different from nothing; a single fraction showed
all three as the same. Record's Skills panel uses the same maths, over the
characters you know rather than the whole 302-character library — a bar reading
3% when everything you've met is solid is describing the syllabus, not you.

## Asking before something irreversible

**Never use `window.confirm()` here.** The artifact this is published as runs
in a cross-origin frame with no `allow-modals` in its sandbox, and a sandbox
without it makes `confirm()` **return `false` immediately** — no dialog, no
error, nothing in the console. Every guard written as
`if (!confirm(...)) return;` therefore silently became `return;`:

- **Reset everything** did nothing at all.
- **Restore from a backup** did nothing at all.
- Closing a session part-way through was **impossible** — the guard could
  never be satisfied.

`askConfirm({k, title, body, yes, no, danger})` draws the question in the page
and returns a promise, so it behaves the same in a frame, in a tab and on
GitHub Pages. Cancel is focused by default and Escape and a backdrop click both
cancel, because every caller so far is destructive. It sits above the tour in
the stacking order (`z-index: 90`) since it can be raised from a settings sheet.

## Reset

`resetProgress()` replaces the `state` binding outright. It used to be
`Object.assign(state, blank())`, which only overwrites the keys `blank()`
declares — so everything the record grew afterwards survived a "reset
everything": `menuPick`, `lastBackup`, and whatever the next feature adds. A
smoke check now asserts that no key outlives a reset, so this can't rot again.

Three things live outside `state` and have to be cleared by hand:

- the **practice diary**, which is IndexedDB (`diaryClear()`),
- the **exercise book on screen** — `renderWrite()` deliberately no-ops once
  built, so `wpReset()` clears the canvas and re-renders the diary strip,
- and the **tour**, which only runs at boot, so the reset re-runs it rather
  than dropping you into a blank app with no explanation.

The theme is deliberately *not* reset: it's a display preference in its own
localStorage key, not progress.

## Sticking points

A character missed five or more times, and more often than it's been right,
is flagged as a leech (`isLeech`). Record lists them, and missing one in a
drill says so and pushes you to the card rather than offering another
identical repetition.

## Settings and the tour

Settings used to sit at the bottom of the Record tab, where nobody would look
for them. They're now their own sheet behind the **gear in the top bar**,
grouped as Studying / Sound / Your data, and reachable from any tab. Record is
progress only. Saving progress has its own button (⤓) beside the gear, because
it's the one thing worth doing before you know you needed it.

A six-step tour runs on the first visit (`state.tour`) and can be replayed
from Settings. The last step is about saving to a file, because that's the one
thing the app can't do for you and the one thing you only miss once it's gone.

## A note on the streak

A missed day draws an **empty box** in the tracker — the row is built from
calendar dates, so nothing you've done is ever cleared. Only the 🔥 counter
resets. The tracker also shows total days studied, which never resets.

## Files

    index.html        page shell
    css/app.css       the whole design system
    js/data.js        curriculum, radicals, the menu — all the content
    js/strokes.js     bundled stroke-order data (generated, do not hand-edit)
    js/audio.js       bundled spoken clips (generated, do not hand-edit)
    js/srs.js         scheduling, streaks, the menu day-pick, storage
    js/app.js         views, the study session, flashcards
    tools/fetch-strokes.mjs   regenerates js/strokes.js
    tools/make-audio.mjs      regenerates js/audio.js (needs macOS say/afconvert)
    tools/server.mjs          dev server (UTF-8; `node tools/server.mjs`)
    tools/smoke.mjs           run this after touching js/ — see below

## Before you ship a change

    node tools/smoke.mjs
    node tools/check-components.mjs
    node tools/check-strokes.mjs

There is no build step, so the four scripts share one global scope: a function
removed from `srs.js` while `app.js` still calls it fails only at runtime, on
click. The `CONTRACT` list at the top of `tools/smoke.mjs` pins every name that
crosses a file boundary — if you delete or rename one, the test says so. It
also checks curriculum completeness, that every glyph on the menu is a taught
character, and that scheduling and the side quest behave.

`check-strokes.mjs` compares every bundled stroke against Make Me a Hanzi's
own graphics file — stroke count, each path, and in sequence. Because stroke
*order* is simply the array order, matching the source is what makes the order
right; it also catches a corrupted download and any character whose strokes
and medians disagree. All 302 currently match exactly.

`check-components.mjs` verifies every "Built from" claim against Make Me a
Hanzi's decomposition dictionary. Hand-written decompositions drift in two
directions especially: 口 (mouth) gets claimed where the glyph really has
囗 (enclosure), and 月 (moon) where it really has ⺼ (flesh). It caught 32
such claims across the library.

## Adding characters

Append entries to the array in `js/data.js` and extend `STAGES` so the new
indices fall inside a stage. Each entry needs `c p m comp story o pos words
sent`. Then regenerate the stroke bundle:

    node tools/fetch-strokes.mjs

Radical families, the trees, quest coverage and the progress maths all derive
from the data, so nothing else needs touching. Editing `MENU` likewise
re-derives the quest — but re-check that every glyph you add is a character
the library actually teaches.

## Progress storage

Progress lives in `localStorage`, so the app works offline and starts
instantly. Published as an Artifact with the `db` capability it also syncs to
the viewer's private store, so one streak follows you between devices.

`localStorage` is not a safe place to keep months of work: clearing browser
data, switching browsers or studying in a private window loses all of it, and
the app can't recover it afterwards. So saving a copy is a **top-bar button**
(⤓, next to the gear), not a setting three screens down — it was buried under
Settings → Your data → Backup before, where nobody would find it before they
needed it. It grows a gold dot once there are five characters' worth of
progress and no saved copy, or when the last one is a fortnight old.

`doExport()` writes one JSON file — `state` plus every diary page out of
IndexedDB — and has three ways to hand it over, because the two contexts this
runs in allow different things. On an ordinary page a `Blob` and a synthetic
click on a download link puts it straight in Downloads. Inside the artifact
sandbox that is blocked outright and silently, so there it asks the host's
`downloads` capability to save it. If neither lands, the JSON is shown in a
textarea to copy. Restoring takes a file or pasted text, checks the `app` field
so a stray JSON file doesn't wipe a streak, asks (via `askConfirm`, not
`confirm` — see **Asking before something irreversible**) and reloads.

## Licensing

The code is yours to license as you see fit — there's no LICENSE file, which
means all rights reserved by default. Two things in here aren't yours to
relicense, though:

- **Stroke data** (`js/strokes.js`) comes from Make Me a Hanzi, under the
  Arphic Public License. Keep the attribution below if you publish this.
- **Speech clips** (`js/audio.js`, generated) are macOS system voice output,
  and they *are* committed here so the app makes a sound wherever it's served.
  Fine for personal study; if you publish this somewhere public, that's the one
  file worth a second thought — `.gitignore` it and regenerate locally instead.

## Credits

Stroke-order data from [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)
(Arphic Public License), rendered with [hanzi-writer](https://hanziwriter.org).
