# Hanzi Quest

A practice notebook for learning to read Chinese characters. 364 characters
across eight core stages plus a kitchen topic pack, taught in an order where
each one makes the next easier.

## Picking this up again

**Live at:** https://jkw2lo.github.io/learn_chinese_hanzi_quest/
**Repo:** https://github.com/jkw2lo/learn_chinese_hanzi_quest — `main`, over SSH
(`git@github.com:...`). HTTPS has no credentials on this machine; the SSH key
does.

GitHub Pages serves `main` directly. There is no build step and no CI: pushing
is deploying, and it goes live in under a minute.

### Shipping a change

    node tools/smoke.mjs
    node tools/check-components.mjs
    node tools/check-strokes.mjs
    node tools/version.mjs patch      # or minor / major
    git add -A && git commit && git push

**Bump the version every time.** A browser that has cached `js/app.js` keeps
serving it until the URL changes, so without a bump a push is live and invisible
at the same time — which wasted real time twice before the version existed, once
on a changed icon and once on a keyboard shortcut. After pushing, open **Settings
→ Version** on the live site: if it doesn't match, you are looking at a cache.

Run the three checks first, not last. They exist because they caught real
problems: the component checker found 32 of 302 "Built from" claims wrong, and
the smoke test has since caught a mute audio bundle, a placement quiz that
credited characters it never asked about, and a version bump applied to half
the assets.

### Where the reasoning lives

This README explains *why* the decisions are what they are, not just what they
are — most sections lead with the thing that went wrong. `git log` carries the
same in commit form. Open a session in this folder and both are readable.

An early version of this was also published as a Claude Artifact. That copy is
many versions stale and is not maintained; the GitHub Pages link above is the
one that is.

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
- **字库 Library** — every character, grouped into three tiers and filterable;
  tap any to study or restudy. Tiers past the one you're in stay shut.
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

Three flashcard decks sit together in the right-hand rail on wide screens, and
stack under the main column otherwise: today's characters, all characters, and
**Words you can read**.

That third deck exists because characters are only half of reading — knowing 大
and 人 separately does not get you 大人. It is every multi-character word in the
library whose characters are *all* already yours, deduplicated (a word is listed
under each character it contains, so 大人 appears under both) and ordered by the
last character to fall into place, newest first: it opens on what you have only
just become able to read rather than on 一个 forever. It fills itself as you go —
72 characters gives 78 words, 140 gives 212.

The back names the parts (大 big + 人 person), because seeing what a word is made
of is what makes it stick. Deck entries are a character (a plain string) or a
word (its `[hanzi, pinyin, meaning]` triple) and `flashFace()` reduces either to
the same shape, so the renderer never branches. Word cards carry no tone glyph:
the mark draws one contour and 大人 has two syllables with two different ones.
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

**Settings → Start the trackpad automatically** arms every writing box as it
appears, instead of waiting for the 触控 button or `T`. It is off by default,
because pointer lock hides the cursor and doing that unasked is startling.

Auto-arming goes through `padAuto()`, which is allowed to fail. Pointer lock
generally wants a user gesture and a drill card that arrives on the auto-advance
timer hasn't got one, so a refusal here is expected rather than exceptional: it
sets `pad.quiet`, which suppresses the "your browser blocked pointer lock"
note. An automatic attempt the browser turns down is not an error the learner
needs to read about — the manual button is still exactly where it was. Only an
attempt they actually asked for gets an explanation.

## Audio

**Characters play bundled clips, not synthesised speech.** `speechSynthesis`
turned out to be unusable here for two compounding reasons: it is blocked in
the cross-origin frame an artifact is embedded in, and several Chinese voices
macOS lists have no voice data at all — `say -v Eddy` produces 0.016s of
silence where `say -v Tingting` produces 0.84s. In both cases `speak()`
queues, `speaking` goes true, and `start` never fires, with no error. Four
attempts at fixing the engine failed because the engine was never the fix.

So `tools/make-audio.mjs` records **every character the app can be asked to
say** with macOS `say` and bundles them as base64 AAC in `js/audio.js` (3.0 MB
of audio, 4.0 MB encoded — 859 KB over the wire, gzipped).

**It is not loaded with the page.** As a blocking `<script>` it held up every
view behind it: a first visit had to pull 1.33 MB before anything drew, and
two-thirds of that was speech nothing needs in the first second. `app.js`
fetches it after the first render instead. Everything that reads a clip already
guards on `HQ_AUDIO` existing, so the gap degrades to the system voice rather
than to an error.

That change had a trap in it worth remembering: the unlock listeners were bound
with `{once: true}`, and a `once` listener is spent even on a call that returns
early. A click landing before the bundle arrived would have burned the only
chance to unlock the audio element and left the whole visit silent. They stay
armed now, at the cost of an early return per click.

That is 575 characters, not 364. It used to record the taught ones only, which
left every character that appears in an example word, a sentence or the menu
without a clip — 金 in 现金, 第 in 第一, 儿 in 女儿, 225 of them in all. A word you
can see is a word you can tap, and one missing clip made `sayPhrase` abandon
the whole word to the system voice, so 现金 was simply silent on a machine with
no Chinese voice installed. A smoke check now walks every speakable string in
the data and fails if anything in it has no clip.
They play through one shared `<audio>` element, unlocked with a muted play on
the first real click so later programmatic plays are allowed. **That file is
committed**, because the app is only as good as its sound and a clone without
it is silent in a way nothing on screen explains — see **Running it**.

If the bundle is missing altogether — a clone that hasn't regenerated it,
a deploy that dropped the file — `clipCount()` is zero and the Sound panel in
Settings says so and gives the command to fix it, rather than leaving someone
turning the volume up at a page that was never going to make a sound.

`sayPhrase` also steps over a gap rather than stopping at one, so a bundle that
has drifted from the data is merely imperfect instead of mute.

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

The **placement quiz** takes the same keys: `1`–`4` to answer, `space` for "I
don't know this one", `enter` to start from the result screen. A question latches
on answer (`place.locked`), because the options are disabled on the way out but
the skip button is not — without it, a held space counted one miss per key repeat
and ended the quiz several characters early.

## Backup

The **💾 button in the top bar** saves progress *and* the practice diary as one
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

## Go deeper is not part of the list

Today's practice is a checklist: scoped to today's characters, finishable, and
it ticks. Go deeper is the opposite — the whole library, unbounded, and it can
never be completed. Rewarding both the same way was the mistake: a fraction
that never reaches its denominator reads as failure rather than as work done.

So Go deeper is no longer a `.sheet` at all. It is an inked band with no tick
boxes, and its reward is a **count that only goes up**: reps, tallied in 正.

正 has five strokes and is the tally mark used across China and Japan — the
five-bar gate with the gate made out of a character. One rep of extra practice
draws one stroke, so a finished 正 is five reps and a row of them is the day's
work, countable at a glance. It earns its place over stars or a growing tree
for two reasons: it is the genuine article rather than decoration, and the
seedling-to-tree metaphor is already taken by the stage ladder (🌱 Seed →
🌿 Sprout → 🍃 Branch), where it means something else entirely. Reusing it
would have blurred both.

Reps are counted in `days[k].extra` and are deliberately sealed off from
everything else: `tallyExtra()` fires only when `session.practice` is set and
`session.todo` is not, so a row from today's list never inflates them, and a
rep never counts as a character revised or ticks anything off. A smoke check
holds both directions.

## Tiers — the gates on the library

The nine stages are a teaching order. The three **tiers** are doors across it,
at the conventional literacy milestones: **200** gets you signs, prices and the
shape of a sentence; **500** gets you most everyday writing; **1000** covers
roughly nine characters in ten on an ordinary page.

The Library used to lay all 348 out at once, which did two bad things: it made
a beginner scroll past hundreds they had no business opening yet, and it let
them open one anyway — out of order, without any of the parts it is built from.
Now it groups by tier, each tier collapsible, with the one you are actually in
left open and the rest shut. A locked tier collapses to a single card saying
what would open it, instead of 150 grey squares.

A tier opens at `TIER_UNLOCK` (80%) of the tier before it — and of every tier
before that, so a gap early on can't be stepped over. `unlockedCeiling()` is the
curriculum position past which nothing may be studied, and it gates three
things: `nextNew()` (so a session never deals a locked character),
`remainingNew()` (so "study ahead" doesn't promise characters the gate then
refuses), and the **Learn this one now** button on a character card, which is
replaced by an explanation of which tier it is in and what opens it. The card
itself still reads — the etymology, the components, the stroke order are all
still there. It just isn't one to start on yet.

Two deliberate exemptions:

- **Placement** credits past the gate, because proving you know 300 characters
  is exactly what should open tier 2. It does, automatically — the unlock is
  computed from what you know, so the quiz result unlocks tiers as a side
  effect rather than needing a special case. Every character counted towards
  that unlock was individually answered, so the tier opens on evidence rather
  than on an estimate.
- **The word of the week** is drawn from your interests and routinely uses
  characters far beyond your tier. That is the point of it, and it is safe
  because it is not a drill and never enters the review queue.

Tiers and stages don't line up — stage 7 straddles 200 — so for display each
stage is filed under whichever tier its **midpoint** falls in. Listing a
straddling stage under both reads as a bug rather than as precision.

## Placement — finding where to start

Plenty of people arrive already reading 人 and 大 and 中国. A quiz offered once
at the end of the tour walks the curriculum **in order** and stops once you have
missed more than `PLACE_MISS_LIMIT` (3). Nothing is sampled and nothing is
inferred: a character is credited **if and only if you answered it correctly**.

This replaced a sampling version that got two things wrong, and the second was
worse than the first.

It **guessed** — five characters stood for twenty, so most of a credited range
was never shown. "We found your level" really meant "we assumed you knew seventy
characters we never asked about".

And it **dumped**. Everything credited went into the review queue, so being
placed at 100 meant opening the app to sixty-odd cards on day one — a mixture of
characters you knew cold and characters you had never seen. That is the worst
possible first session: too long, and too uneven to be either satisfying or
useful.

**Credit is not homework.** A credited character goes into the library as
*known*: it counts for tier progress, it is drawn by Go deeper, it inks itself
in sentences and vocabulary, exactly as if you had learnt it in an earlier
session. What it does not do is land in tomorrow's queue. Its first review sits
`PLACED_REST` (12) days out, fanned across `PLACED_FAN` (24) more.

The exception is the **tail**: the last `PLACE_TAIL` (12) characters you got
right before you started missing are the shakiest things you know, because you
were at the edge of your range. They come back within the week at a lower level.
That is the refresher, without the backlog.

So day one after placement is the same day one everybody gets: **five new
characters, zero reviews**, starting at the first character you actually missed.
A smoke check asserts `dueCount() === 0` immediately after placing, and that the
first review is at least two days out.

Because the credits land today, `ensure()` stamps `first` with today's date for
all of them — which meant `learnedToday()` counted them, and being placed at 69
filled the **Learned today** strip with 69 characters and asked you to write out
and pronounce every one. It now filters on `placed`, which is precisely the flag
that separates "credited this morning" from "actually sat down and learnt it".
Miss three of your first 72 and Today shows those three plus the next two: five
characters, the same as everybody else.

Every task on the list is scoped to those five — with one exception.
**Read them in context** tops up from characters you already read (`taskRound`,
`READ_ROUND`). A character learnt an hour ago usually has no sentence you can
read yet, since every other glyph in it is still unknown, so scoping reading
strictly to today left the row locked on most days. It is also the one task
where the older characters *are* the point: reading in context means reading the
context, and the context is everything you already know. The row says so when it
reaches wider. Ticking still requires only today's characters (`taskPool`), so
the "you already did this elsewhere" inference stays deterministic.

It is keyboard-driven like the rest of the app: **1-4** to answer, **space** for
"I don't know this one", **Enter** to start on the result screen. A question
locks the moment it is answered — the options are disabled on the way out but
the skip button is not, so without the latch a held space counted a miss per
repeat and ended the quiz several characters early.

Questions are **meaning → character**. Recognising 山 among four English words is
easy to fake by elimination; picking 山 out of four plausible characters is not.
Distractors come from within 30 curriculum positions, so they are of a piece.
There is an explicit "I don't know this one", and the screen says outright that
guessing right means the app skips teaching it.

The walk is exhaustive, which for someone who reads 200 characters is 200-odd
questions. So **"That's enough — start me here"** appears after
`MIN_BEFORE_STOP` (12) questions and finishes on the spot, keeping everything
answered so far. Re-placing from Settings only ever adds; an existing record is
never touched.

## Personalisation

Two optional questions, asked once after placement: a name, and any number of
interests from `INTERESTS` in `js/data.js` (10 categories, 8 words each).

The name is used where the app addresses you and nowhere else. The interests
feed **one thing**: the word of the week. They explicitly do *not* reorder the
curriculum — that order is load-bearing, 马 has to arrive before 妈 and 吗
whatever you happen to be interested in, and letting a preference reshuffle it
would quietly break the thing that makes each character easier than the last.

So the word of the week runs *beside* the curriculum rather than through it:
one real word from what you said you cared about, usually built from characters
well past where you have reached, with a line about where it comes from. It is
deliberately not a drill — never scheduled, graded, counted, or added to the
review queue. The moment it becomes homework it stops being the thing that
makes you want to keep going. The card says as much: *nothing to do here*.

The meaning and the note stay **hidden until asked for**. Printing them
immediately left nothing to do: you would read 音乐, start working it out from
音 and 乐, and find the answer already underneath — and a good note names the
characters it explains, so forty of the hundred-odd gave the game away twice
over. The card now shows the word and its pinyin, and opens when you ask it to.
It stays open for the rest of the week; a new word closes it again.

`wordOfWeek()` seeds the pick from an ISO week key, so it is stable all week and
survives reloads, and it won't repeat until everything in your chosen interests
has had a turn.

### Seasonal words

A word about mooncakes lands differently in the week of the Mid-Autumn Festival
than it does in March. When the current ISO week contains a festival, it takes
precedence over the interest pool — nine of them, from 春节 to Christmas, each
carrying five or six words.

Fixed-date festivals are `MM-DD`. The lunar ones move against the Gregorian
calendar, so they are **tabled per year** rather than computed: accurate beats
clever, and a year outside the table simply doesn't fire instead of guessing
wrong. 元宵节 is derived as an offset from 春节, which is how it actually works.

**Festival history is never wiped.** The interest pool is allowed to cycle once
exhausted, but `f:`-prefixed entries in `wotwPast` survive, so Christmas 2027
doesn't repeat Christmas 2026. Six words means six years before it has to come
round again, and even then it picks the one seen longest ago. A smoke check
walks six consecutive Christmases and asserts all six are different.

A festival word shows even if you have picked no interests at all — the week
itself is reason enough.

## Finishing something

Two moments get a celebration: the day's list all ticked, and every character
solid in all three Go deeper modes. Both are latched — the day's one in the day
record, the Go deeper one in the profile — so a re-render doesn't set them off
again, and the Go deeper latch clears when a new character makes the library
incomplete, so it can be earned again.

The sound is **synthesised, not bundled**: five notes of a pentatonic scale,
which is both the scale that reads as Chinese to most ears and the one where any
subset is consonant. A stored clip would be another asset to ship and another
thing to go missing — and `js/audio.js` already proved how that ends. It honours
the sound setting, and the falling-petal animation honours
`prefers-reduced-motion` by not rendering the petals at all.

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
characters you know rather than the whole 364-character library — a bar reading
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

## What a practice round draws on

Sorting the whole library by weakness and taking the top N stopped working once
the library got big: the same forty characters were always the weakest, so the
same forty came round every time and the hundred behind them were never seen
again.

Two rules in `practicePool()` fix it.

**70/30 by recency.** `RECENT_SHARE` of a round comes from the last
`RECENT_WINDOW` (40) characters introduced, because those are what is actually
at risk of slipping. The remaining 30% reaches back into everything older, so
the early stages don't rot. A new learner with nothing older just gets a full
round of recent ones.

**Least-shown first.** Each character record now carries `shown` alongside
`skills`: `skills` counts clean answers, `shown` counts times *asked at all*.
Ordering by `shown` is what rotates the pool. Weakness is only the tie-break —
ordering by weakness first pins a character you keep missing to the front of the
queue permanently, which is how you end up seeing 难 six times in an evening.

Over 40 simulated rounds against a 200-character library the split holds at
exactly 70%, 160 distinct characters come up, and no older character is asked
more than three times. The eligible set is passed *into* `practicePool` rather
than filtered afterwards — filtering a ready-made pool down to the writable ones
used to hand back a short round and quietly break the split it had just
computed.

## Sticking points

A character missed five or more times, and more often than it's been right,
is flagged as a leech (`isLeech`). Record lists them, and missing one in a
drill says so and pushes you to the card rather than offering another
identical repetition.

## Settings and the tour

Settings used to sit at the bottom of the Record tab, where nobody would look
for them. They're now their own sheet behind the **gear in the top bar**,
grouped as Studying / Sound / Your data, and reachable from any tab. Record is
progress only. Saving progress has its own button (💾) beside the gear, because
it's the one thing worth doing before you know you needed it.

A six-step tour runs on the first visit (`state.tour`), then the placement offer,
then the two profile questions — in that order, each waiting for the last, so
the first run is a short sequence rather than a pile of dialogs. All three can
be replayed from Settings. The last step is about saving to a file, because that's the one
thing the app can't do for you and the one thing you only miss once it's gone.

## A note on the streak

A missed day draws an **empty box** in the tracker — the row is built from
calendar dates, so nothing you've done is ever cleared. Only the 🔥 counter
resets. The tracker also shows total days studied, which never resets.

## Files

    index.html        page shell
    css/app.css       the whole design system
    js/data.js        curriculum, radicals, the menu, interests — all the content
    js/strokes.js     bundled stroke-order data (generated, do not hand-edit)
    js/audio.js       bundled spoken clips (generated, do not hand-edit)
    js/srs.js         scheduling, streaks, the menu day-pick, storage
    js/app.js         views, the study session, flashcards
    tools/fetch-strokes.mjs   regenerates js/strokes.js
    tools/make-audio.mjs      regenerates js/audio.js (needs macOS say/afconvert)
    tools/server.mjs          dev server (UTF-8; `node tools/server.mjs`)
    tools/smoke.mjs           run this after touching js/ — see below
    tools/version.mjs         bump the version and re-stamp every asset URL

## Versions, and why a push can be invisible

A browser that has cached `js/app.js` keeps serving it until something about the
URL changes. Nothing about a git push changes that URL, so the live site and the
site you see can disagree for hours — which happened twice while building this,
once with the save icon and once with the placement quiz's number keys. Both
times the deploy was already correct.

So every local asset carries `?v=<version>`, and the version lives in
**`index.html` and nowhere else**: once in an inline script for the app to read,
and once in each asset's query string. It is deliberately not in a `.js` file —
a cached script asked what version it is would always give the reassuring
answer. `index.html` carries no query string of its own and is the file browsers
reliably revalidate.

Read it in **Settings → Version**, and at the foot of **Record**. If that number
doesn't match what you just published, you are looking at a cached copy.

Bump it with one command — never by hand, since the number and the six query
strings have to move together:

    node tools/version.mjs            # show it, and check the stamps agree
    node tools/version.mjs patch      # 1.0.0 -> 1.0.1
    node tools/version.mjs minor      # 1.0.3 -> 1.1.0
    node tools/version.mjs major      # 1.4.2 -> 2.0.0
    node tools/version.mjs 2.1.0      # or set it outright

It rewrites every stamp and sets `APP_DATE` to today. A smoke check fails if the
declared version and the stamps ever disagree, or if a local asset is added
without one — a half-done bump is worse than none, because the number on screen
would claim a refresh that never happened.

## Before you ship a change

    node tools/smoke.mjs
    node tools/check-components.mjs
    node tools/check-strokes.mjs
    node tools/version.mjs patch      # so the live site can be told apart

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
and medians disagree. All 364 currently match exactly.

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
    node tools/make-audio.mjs     # new characters are silent until you do

Radical families, the trees, quest coverage and the progress maths all derive
from the data, so nothing else needs touching. Editing `MENU` likewise
re-derives the quest — but re-check that every glyph you add is a character
the library actually teaches.

**Order the new block so nothing needs a part it hasn't met.** `comp` drives
both the "Built from" panel and the `FAMILIES` trees, so a character whose
components arrive later in the array teaches backwards. Stage 9 is arranged
this way on purpose: 见 comes first and 视 and 觉 are built on it, 音 precedes
意, 自 precedes 息, 己 precedes 记.

`tools/check-components.mjs` will tell you which `comp` claims are legal — it
validates against Make Me a Hanzi's recursive decompositions, with squeezed
radicals normalised to their free-standing forms (讠→言, 氵→水, ⺼→肉). If a
character has no taught part worth naming, `comp:[]` is the honest answer;
several of the best-known characters in the library have it.

### Filling the gaps

Sixteen characters were added later, after a check showed that **55 of 348
example sentences could not be used as reading material** because they contained
a character the library never taught. 没 was the worst of it: 没有 is among the
commonest things anyone says in Chinese and it simply wasn't there, along with
哪 which, 怎 how, and 吧, the particle that turns an order into a suggestion.

They were inserted **where they belong**, not appended: 没 哪 怎 吧 into Sprout
with the other negation and question words, 第 金 into Explorer with money and
numbers, 儿 孩 先 岁 间 气 into Everyday with people and time, and 京 床 桌 力 into
The World. Records key on the character rather than its index, so inserting
mid-curriculum is safe; the `end` values in `STAGES` shift and nothing else does.

Blocked sentences fell from 55 to 30.

### Stage 9 · 交流 Connect

46 characters covering what stages 1-8 left out: the courtesy words (见 谢 您),
the vocabulary of thinking and remembering (思 意 觉 懂 记 忘), language and
study (书 文 汉 语 英 美 考 试), screens (电 话 视 影 脑 机 网), and the shape
of a working week (班 司 经 常 完 始 动 活). It closes some conspicuous gaps —
谢谢 and 再见 were not previously writable — and it lets the app finally teach
its own name: 汉字.

## Progress storage

Progress lives in `localStorage`, so the app works offline and starts
instantly. Published as an Artifact with the `db` capability it also syncs to
the viewer's private store, so one streak follows you between devices.

`localStorage` is not a safe place to keep months of work: clearing browser
data, switching browsers or studying in a private window loses all of it, and
the app can't recover it afterwards. So saving a copy is a **top-bar button**
(💾, next to the gear), not a setting three screens down — it was buried under
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
