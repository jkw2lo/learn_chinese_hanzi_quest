# Still to do

Written down rather than done, so the next session starts from a spec instead
of from the conversation. Newest first.

---

## 1. Mandarin songs — a lyrics-based learning section

**Status:** not started. A real new feature — its own section, not a stylesheet
tweak.

**Why.** Learning through songs you already half-know anchors new vocabulary
to something familiar, and it's a different kind of comprehension practice
than character drills.

**What it should be.**
- A roster of songs, lyrics rendered line by line, characters highlighted the
  way the Menu quest already highlights dish names: `glyphs()` (`js/app.js:2168`)
  wraps every CJK character in `<span class="g known" data-ch="…">`, and the
  existing hover/click system — `initTips()` (`js/app.js:2234`) — already shows
  reading + meaning + "known"/"not learned yet" on hover, opens the full
  character card on click, and falls back to `EXTRA_GLOSS`/`gloss()`
  (`js/app.js:31`) for characters outside the curriculum. Songs should reuse
  this wholesale rather than build a new tooltip system — the only real change
  is what decides "known": `isKnown(c)`, the main library, not a side quest's
  own taught-list like `menuTaught`. A song isn't a teaching path of its own,
  so there's no second bookkeeping list to let drift the way `state.menuTaught`
  did (see [porting.md](porting.md), B1).
- **Default roster:** 5 built-in songs — the 5 most popular Mandarin hits of
  the 2000s. Needs the actual picks (titles, full lyrics, pinyin) before this
  can be built. Song lyrics are copyrighted text, so bundling full transcripts
  in `js/data.js` the way character example sentences are needs a licensing
  check first — worth deciding whether the default 5 ship with the app or are
  themselves just pre-filled "import" targets you fetch lyrics for on first
  use.
- **User-imported songs:** an "Add a song" flow — paste or type a title and
  the lyric text; the app splits it into lines and characters and adds it to
  the roster.
- **Multiple songs, a roster:** a list-typed state field, the way `state.chars`
  and `state.hailed` already are (`js/srs.js`, `blank()`) — same care as B1 in
  [porting.md](porting.md): make sure any merge/sync logic treats it as a
  list, not a keyed map.

**Where the code would go.** A new `js/songs.js`, on the pattern of
`js/sprint.js` — its own file with a config and render functions, wired into
`RENDER` (`js/app.js:5829`) and `go()`. It needs a nav destination; the
desktop tab row already holds exactly seven (`today/menu/sprint/write/
library/radicals/record` — `index.html:45-51`) with no room for an eighth
(see the comment at `css/app.css:3211`), so Songs likely lives behind the
burger/drawer, or waits on the rolodex-picker redesign below, which removes
that seven-slot ceiling.

**Watch for.**
- `EXTRA_GLOSS` (`js/data.js:1550`) is a single-character reference
  dictionary of a few hundred common characters — real song lyrics will hit
  plenty of words with no gloss at all (slang, poetic inversions, proper
  nouns). The hover tip already handles that gracefully (falls silent rather
  than showing junk — `js/app.js:2253-2261`), but expect visible gaps.
- No pinyin is generated automatically anywhere in this codebase — every
  `js/data.js` entry has hand-authored pinyin. An imported song has no pinyin
  unless typed in by hand or a pinyin library gets added — missing
  infrastructure, not a detail.
- Static site, no build step or `package.json` — pulling in a pinyin or
  word-segmentation library means a `<script src>` the way the Google Fonts
  stylesheet (and nothing else) currently is, or hand-segmenting.

---

## 2. "Build the word" (组词) as its own Practice mode and Sprint mode

**Status:** not started. `组词` already exists as drill kind `"a"`
(`js/app.js:1394`, tile-assembly UI) but it's only reachable indirectly —
`drillKind()` (`js/app.js:1075`) drops it into the random daily-review bag
for characters at level ≥3 with a multi-character readable word. It isn't one
of the three dedicated Practice modes (`read`/`write`/`say` — `js/app.js:900`)
and isn't a Sprint mode at all (`SPRINT` only has `r`/`w`/`l` —
`js/sprint.js:27`).

**Why.** A favourite activity that right now can't be asked for on purpose.

**What it should be.**
- A fourth `PRACTICE` entry (`js/app.js:900`) — `build: { k:"组词",
  name:"Build the word", blurb:"Assemble the word from tiles", kinds:["a"],
  skill:"c" }` — same shape as `write`. Needs a pool: `practiceChars("build")`
  should probably restrict to characters with at least one multi-character
  readable word, the same filter `drillKind()` already applies
  (`js/app.js:1085-1087`), or the round comes up empty for most learners.
- A fourth `SPRINT` mode (`js/sprint.js:27`). This is the more involved half:
  every existing sprint mode is answered by picking one of a fixed set of
  `q.opts` (`sprintQuestion`, `js/sprint.js:150`) or, for `w`/`type`, typed
  candidates. Tile-assembly is neither — it's closer to the drill's own UI
  (`renderDrill`, kind `"a"`, `js/app.js:1394-1425`) than to any existing
  sprint answering mechanic, so the sprint runner needs a genuinely new
  question type, not just a new `mode` key plugged into the existing pattern.

**Where the code is.** `PRACTICE` and `practiceRound`/`startPractice` in
`js/app.js:900-935`; the tile UI itself in `renderDrill`'s `kind === "a"`
branch, `js/app.js:1394-1425`; `SPRINT`, `sprintQuestion`, and the run loop in
`js/sprint.js:27-260`.

**Watch for.** The drill version already guards against offering tiles from
characters the learner hasn't met (`js/app.js:1401-1406`, called out by name
in its own comment as a past bug) — a sprint version must carry the same
guard, since sprint draws from `knownChars()` directly (`sprintPool`,
`js/sprint.js:171`) rather than the curated daily pool.

---

## 3. Mobile section picker as a rounded rolodex scroll, bottom-center

**Status:** not started. Replaces the drawer's vertical list, not necessarily
the drawer mechanism itself.

**Why.** Modelled on something built for the skincare inventory tracker that
felt good to use there; want the same idea for picking a section.

**What it should be.** The seven section buttons currently list top-to-bottom
inside a bottom sheet (`.drawer-nav`, `index.html:120-133`, styled under
`@media (max-width: 859.98px)` in `css/app.css`) — instead, a
horizontally-scrolling, snap-to-center strip of section chips, sitting at
bottom-center rather than filling the sheet edge-to-edge, rounded so it reads
as a wheel rather than a list. (The skincare tracker was a Claude-built
artifact, not code in this repo — nothing here to copy from directly; the
mechanic to reproduce is `scroll-snap-type: x mandatory` on the strip with
`scroll-snap-align: center` on each chip, with the "rolodex" feel usually
coming from scaling or fading chips as they scroll away from centre.)

**Where the code is.** `.drawer`, `.drawer-sheet`, `.drawer-nav` in
`css/app.css` (search `.drawer`); `openDrawer`/`closeDrawer` in
`js/app.js:5871-5888`.

**Watch for.** The drawer currently groups the seven sections into four
clusters with dividers (`.drawer-rule`, `index.html:122-131`) — a single
scrolling strip loses that grouping unless it's rebuilt as visual gaps
between chips. If [Songs](#1-mandarin-songs--a-lyrics-based-learning-section)
above lands, this is also where an eighth destination stops needing a
decision about the top bar — a scrolling strip has no seven-slot ceiling the
way the desktop tab row does.

---

## 4. Burger button on the bottom-right, mobile

**Status:** not started.

**Why.** Easier for a thumb to reach than the top-left corner it's in now.

**What it should be.** `#burgerBtn` (`index.html:31`) currently sits at the
start of `.topbar`, beside the wordmark. On a phone it should move to a fixed
bottom-right position — the same reasoning that already put the drawer sheet
itself at the bottom rather than dropped from the button (see the comment
above `.drawer-sheet` in `css/app.css`: "a phone is held from the bottom").

**Where the code is.** `.icon-btn.burger` positioning rule, `css/app.css:3218`,
inside the `@media (max-width: 859.98px)` block; button markup at
`index.html:31-33`.

**Watch for.** A fixed bottom-right button needs its own
`env(safe-area-inset-bottom)` padding, the way `.drawer-sheet` already has,
and has to sit above anything else anchored to the bottom on a phone — check
it doesn't collide with the session footer (`.ses-bar`) or the sprint run bar
while either is open.

---

## 5. A tracker for fun — time and activity count per day

**Status:** not started. There's already a small version of this to build on,
not from scratch.

**Why.** Seeing how much you've actually done, day to day, is motivating on
its own — separate from the streak, which only says whether you showed up.

**What it should be.** `renderTracker()` (`js/app.js:3229`) already draws a
28-day heatmap from `state.days[k]` and `dayReps()` (`js/srs.js:924`) — but
`dayReps` only counts card reps (`new + rev + extra + sp`); there's no time
field anywhere in a day record, and no per-day count of "activities"
(sessions, sprints, drills started) as opposed to individual cards. Two
things to add to `state.days[k]`:
- **Time studied.** `session.times` (`js/app.js:878`, an array of
  per-question timings) already exists within a single session but is never
  persisted per day. Summing session duration into `state.days[k].ms` (or
  similar) alongside the existing `new`/`rev`/`extra`/`sp` counters is the
  natural place.
- **Activities done.** A count of sessions/sprints/drills started that day,
  not characters reviewed — e.g. `state.days[k].sessions`.

Then a view alongside or replacing the existing tracker: total time
today/this week, activities today, maybe a per-day breakdown, in the same
"for fun, not a chore" spirit as the existing 🔥 streak chip and the 正 tally
(`js/app.js:3250` onward).

**Where the code is.** Day-record shape and helpers: `js/srs.js:18`
(`dayKey`), `:437` (`state.days[k]` creation), `:924` (`dayReps`), `:927`
(`daysStudied`). Rendering: `renderTracker` (`js/app.js:3229`),
`renderStreakChip` (`js/app.js:5895`).

**Watch for.** Every place that reads or writes a day record does so through
a handful of named helpers (`dayReps`, `reviewedToday`, `extraToday`,
`sprintToday`, `didToday` — all in `js/srs.js`) — add new fields the same way
rather than reaching into `state.days[k]` directly, and check `mergeState`
(`js/srs.js` — the function B1 in [porting.md](porting.md) lives in) treats
any new per-day field correctly when two devices' records merge.

---

## 6. The save icon shouldn't look like a notification

**Status:** not started, small.

**Why.** The gold dot reads as "something needs your attention," which isn't
true once multi-device sync (`js/sync.js`) is set up — the file backup is a
belt-and-braces copy, not the only record.

**What it should be.** `.icon-btn.nudge` (`css/app.css:190`) adds a gold dot
badge (`::after`, `css/app.css:191-195`) whenever `backupStale()`
(`js/app.js:4481`) is true — no backup ever taken, or the last one is over 14
days old. It fires the same way whether or not sync is configured, so a
signed-in, synced user sees the same "attention" badge as someone with no
backup and no sync at all. Once `js/sync.js` reports a signed-in, synced
state, the nudge should soften — drop the dot badge entirely, or replace it
with something quieter than a notification dot (a subtle colour shift, or
nothing).

**Where the code is.** `backupStale()`, `js/app.js:4481`; the toggle,
`js/app.js:5902-5907`; the CSS, `css/app.css:190-195`. Sync's signed-in state
lives in `js/sync.js` — check what it already exposes (a "signed in and
synced recently" flag, or something that has to be added).

---

## 7. A two-character writing drill, separate from the one-character drill

**Status:** not started.

**Why.** `renderDrill`'s `kind === "w"` branch (`js/app.js:1311`) writes
exactly one character — there's no two-character (compound-word) writing
drill at all right now, and the mobile writer box was sized only ever having
seen the one-character case.

**What it should be.** Its own drill, not a variant flag on the existing
one — two `.tian` grids side by side (or in sequence), covering a compound
word rather than a single character, with its own entry in `KIND_LABEL`
(`js/app.js:1272`) distinct from `w`. Keep the existing single-character `w`
drill exactly as it is.

**Where the code is.** The write-from-memory branch, `js/app.js:1311-1393`;
the mobile writer box sizing, `.writer-box { width: min(100%, 24rem, 48dvh) }`
(`css/app.css`, mobile block, noted in [porting.md](porting.md) M1) — sized
for one square and will not fit two side by side at that size on a phone,
exactly the case that section's comment warned about.

---

## 8. The notebook, on a phone: one box and an "Add to page" button

**Status:** not started. This is the big one — a real feature, not a
stylesheet. Mobile only; the desktop notebook (a grid of 36 squares you tap
between) stays exactly as it is.

**Why.** The notebook page is a grid of small squares. On a phone each square
is a thumbnail you are asked to write a character into, which is the same
mistake the writing drill made — a box sized for a trackpad.

**What it should be.** One box, as wide as comfortably fits, the way the drill
box now is (`.writer-box { width: min(100%, 24rem, 48dvh) }` — see
`css/app.css`, mobile block). Beside it on the right, one button: **Add to
page**.

The loop, from the chair: write a character → tap Add to page → the box wipes
→ write the next one. No page picking, no square picking, no interruption.

The loop, underneath — none of this is visible:

1. Is there a page for today that is not full?
   - no page today → create one, named by today's date
   - a page today, not full → use it
   - a page today, full → create `<date>-2`, then `-3`, and so on
2. Append the strokes just written to the next empty square on that page.
3. Save.
4. Wipe the box, ready for the next character.

The page size is the user's existing setting (default 36 squares), so "full"
means that many.

**Where the code is.** `openNotebook` and the `nb-*` render in `js/app.js`;
squares are `.nb-sq` in `css/app.css` (~line 1448); pages live in IndexedDB
behind `diaryAll` / `diaryPut` / `diaryClear`.

**Watch for.** A phone that rotates mid-page. Whether a half-finished page
from a previous day should be resumed (spec above says no — today's date, or a
new page). And the strokes have to be stored in whatever shape the existing
page format already uses, or old pages stop rendering.

---

## 9. Check the option layout setting at four-across on a phone

`Settings → Answer buttons → row` forces `repeat(4, minmax(0,1fr))` on any
width. The option text got bigger on mobile, so four across at 375px may now
overflow. It is an explicit choice rather than a default, so it is not
urgent — but it should either be measured or quietly dropped below ~480px.
