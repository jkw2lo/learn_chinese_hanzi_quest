# Hanzi Quest

A practice notebook for learning to read Chinese characters. 302 characters
across seven core stages plus a kitchen topic pack, taught in an order where
each one makes the next easier.

## Running it

No build step, no dependencies. Clone it and:

    node tools/make-audio.mjs     # generates js/audio.js (macOS only, ~1 min)
    node tools/server.mjs         # then open http://localhost:8731

`js/audio.js` is not in the repo — it's 2.1 MB of macOS speech output, and
redistributing Apple's synthesised voice is a grey area. Without it the app
falls back to the browser's speech engine, which is unreliable inside an
embedded frame (see **Audio** below). On a Mac, generating it takes a minute.

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
   阅读 read, 发音 say, 抄写 write out. Each ticks off when you finish it.
   The counter only counts tasks that are actually *available*, so a locked
   row (reading, before you can read anything) never blocks a clean sweep.
   Ticks are **evidence-based**: a task completes when every one of today's
   characters has been answered correctly in that task's drill during a
   session — so doing pronunciation from *Go deeper* ticks 发音 just the same
   as doing it from the row. Each task declares which drill kinds prove it
   (`proves`), so 认读 and 阅读 can't tick each other.
3. **Go deeper** — the same skills over your *whole* library, shakiest first,
   each with a ring showing how solid that skill is. The optional extra.
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
the first real click so later programmatic plays are allowed.

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

Settings → Backup exports progress *and* the practice diary as one JSON file.
The artifact sandbox blocks downloads a page starts for itself, so it asks the
host to save via the `downloads` capability and falls back to copyable text
where that isn't available. Restore takes a file or pasted text, and refuses
anything that isn't a Hanzi Quest backup before touching your data.

## Sticking points

A character missed five or more times, and more often than it's been right,
is flagged as a leech (`isLeech`). Record lists them, and missing one in a
drill says so and pushes you to the card rather than offering another
identical repetition.

## Settings and the tour

Settings used to sit at the bottom of the Record tab, where nobody would look
for them. They're now their own sheet behind the **gear in the top bar**,
grouped as Studying / Sound / Your data, and reachable from any tab. Record is
progress only.

A five-step tour runs on the first visit (`state.tour`) and can be replayed
from Settings.

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

## Licensing

The code is yours to license as you see fit — there's no LICENSE file, which
means all rights reserved by default. Two things in here aren't yours to
relicense, though:

- **Stroke data** (`js/strokes.js`) comes from Make Me a Hanzi, under the
  Arphic Public License. Keep the attribution below if you publish this.
- **Speech clips** (`js/audio.js`, generated) are macOS system voice output.
  Fine for personal study; think twice before distributing them.

## Credits

Stroke-order data from [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)
(Arphic Public License), rendered with [hanzi-writer](https://hanziwriter.org).
