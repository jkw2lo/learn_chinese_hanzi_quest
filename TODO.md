# Still to do

Written down rather than done, so the next session starts from a spec instead
of from the conversation. Newest first.

---

## 1. The notebook, on a phone: one box and an "Add to page" button

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

## 2. Check the option layout setting at four-across on a phone

`Settings → Answer buttons → row` forces `repeat(4, minmax(0,1fr))` on any
width. The option text got bigger on mobile, so four across at 375px may now
overflow. It is an explicit choice rather than a default, so it is not
urgent — but it should either be measured or quietly dropped below ~480px.

---

## 3. Two-character writing drills do not exist, and something assumes it

`renderDrill`'s `w` branch writes exactly one character, so the new mobile
writer box does not have a two-character case to size for. If a compound is
ever added to writing drills, `min(100%, 24rem, 48dvh)` has to be revisited —
two squares side by side will not fit a phone at that size.
