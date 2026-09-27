/* ============================================================
   新 What's new — release notes, written for the person using the app

   One entry per minor version, newest first. Patch releases fold into the
   minor they belong to: sixty entries of "a border was the browser's" is a
   commit log, not news. The commit log is still there for the why; these
   say what changed for somebody studying.

   `v` is the minor version ("1.14"), matched against APP_VERSION to decide
   what counts as new. tools/smoke.mjs fails if the top entry's version
   isn't the app's current major.minor — so a minor bump without a note
   here doesn't ship.

   The manual renders these (see js/manual.js), and Today shows a one-line
   strip when there is something newer than you last saw.

   DOM-free at the top level, like manual.js and sprint.js.
   ============================================================ */

const RELEASES = [
  {
    v: "1.15", date: "2026-09-27", title: "What's new, and where it's been",
    items: [
      "This page. When the app changes, a line on Today says so once, and the manual's first section lists what's different since you last looked.",
      "Every release so far is kept at the end of the manual, from the very first version — so you can see how the app got here."
    ]
  },
  {
    v: "1.14", date: "2026-09-27", title: "The manual",
    items: [
      "Settings → Help → How Hanzi Quest works: a full guide to the app — the review schedule, every drill and when it appears, what each activity does to your progress, streaks, shortcuts and a glossary of the Chinese labels.",
      "Search it, jump between sections, or follow a \"How this works\" link from the screen you're on. Its numbers are read live from the app, so it's always current."
    ]
  },
  {
    v: "1.13", date: "2026-09-27", title: "Reviewing without the grind",
    items: [
      "Welcome back: after a few days away with a pile of reviews waiting, start with the 20 shakiest and let the rest spread over the following days. Your new characters aren't held back.",
      "Rest days: up to two missed days a week keep your streak standing. Nothing to switch on.",
      "Remembered and rescued: characters you still knew after two weeks away, and ones you'd forgotten and brought back, are now counted — at the end of a session, in the tracker and on Record.",
      "Writing practice lets you choose exactly which characters to write, grouped by the day you learned them.",
      "On a phone, the section menu and its button are bigger and easier to hit."
    ]
  },
  {
    v: "1.12", date: "2026-09-23", title: "Songs, and building words",
    items: [
      "Songs: paste in lyrics you like and see which characters you can already read. Tap any character for its reading.",
      "Build the word (组词): assemble a word from character tiles — as a Go deeper mode and as a timed sprint.",
      "Writing two characters: a drill for whole two-character words, drawn from memory.",
      "On a phone, the Write notebook is one big box with Add to page, and sections sit in a scrolling menu at the bottom of the screen.",
      "The tracker shows how long you studied today and how many activities you did."
    ]
  },
  {
    v: "1.11", date: "2026-09-20", title: "On your phone, and on every device",
    items: [
      "The app lays out properly on a phone for the first time, with a menu at the bottom of the screen where your thumb is.",
      "Sign in to keep your progress in step across devices. Work done on each one is combined, not overwritten.",
      "Drills built for thumbs: bigger answer buttons, centred questions, and a colour wash for right and wrong that doesn't move anything on screen.",
      "Sprints can mark each answer as you go, or all at once when you hand the sheet in — your choice.",
      "If something ever breaks mid-session you get a way out instead of a frozen screen, and Settings → Report a problem copies out what went wrong."
    ]
  },
  {
    v: "1.10", date: "2026-09-19", title: "A round of polish",
    items: [
      "The guided tour points at the right thing on every step.",
      "The first-run introduction fits on a laptop screen without scrolling.",
      "Today is about today: the menu lives in its own tab, and Go deeper is tidier."
    ]
  },
  {
    v: "1.9", date: "2026-09-19", title: "The menu gets its own tab",
    items: [
      "Read a Menu moved from a corner of Today to a tab of its own, with the menu at full size.",
      "The menu's character of the day is taught on a proper card, and a row of phrases shows the characters that aren't printed on the menu itself."
    ]
  },
  {
    v: "1.8", date: "2026-09-19", title: "The menu keeps its own books",
    items: [
      "Learning the menu's character no longer counts against your daily goal or fills today's list — it's a side quest, kept on the side.",
      "The menu grows with you: dish names first, then the small print, then a specials board."
    ]
  },
  {
    v: "1.7", date: "2026-09-19", title: "Sprints, and a new Today",
    items: [
      "速练 Sprint: timed sheets for reading, writing and listening, with a best for each sheet, a 错字本 mistake notebook, and repair rounds for the characters that keep slipping.",
      "Today became a dashboard: the session, today's practice and Go deeper side by side.",
      "A new first run: 你好 written stroke by stroke, two quick questions, and what a character is made of.",
      "Milestones: every hundredth character gets a moment.",
      "Writing practice split into two clear exercises, with a stroke-order player beside the page.",
      "Study ahead adds characters for today only, and space moves you on without answering for you."
    ]
  },
  {
    v: "1.6", date: "2026-09-18", title: "The full library",
    items: [
      "763 characters: the common-frequency list is complete.",
      "Every character that appears in a word, a sentence or the menu can be heard, not just the taught ones.",
      "Trackpad writing lets go of the pointer properly, and the first character you write in a session is no longer silent."
    ]
  },
  {
    v: "1.5", date: "2026-09-17", title: "The Independent tier",
    items: [
      "600 characters: the second tier is complete.",
      "No drill ever shows you a character you haven't met — words and sentences wait until every character in them is yours."
    ]
  },
  {
    v: "1.4", date: "2026-09-17", title: "The next hundred",
    items: ["A hundred more characters, chosen from a frequency list so the common ones come first."]
  },
  {
    v: "1.3", date: "2026-09-17", title: "Faster to open",
    items: ["The sound bundle loads after the page instead of before it, so the app appears straight away."]
  },
  {
    v: "1.2", date: "2026-09-17", title: "Words you can read",
    items: ["A flashcard deck of every word built entirely from characters you know — it grows as you learn."]
  },
  {
    v: "1.1", date: "2026-09-17", title: "Fixes",
    items: [
      "Sound fixes, no more duplicate answer options, and the word of the week gives you something to work out.",
      "Characters credited by Find my level no longer land in today's list."
    ]
  },
  {
    v: "1.0", date: "2026-09-17", title: "Where it started",
    items: [
      "A practice notebook for reading Chinese: a daily session of new characters and spaced reviews, four skills tracked separately, and a Library to browse.",
      "Go deeper for extra practice on everything you know, separate from the day's list.",
      "Find my level for people who already read some, three tiers that open as you progress, and a word of the week chosen from your interests.",
      "Handwriting drills, a 练字 notebook with a practice diary, trackpad writing, a Read a Menu side quest, and saving your progress to a file."
    ]
  }
];

/* "1.14.0" → [1, 14]; compares by major then minor */
const verParts = v => String(v || "0.0").split(".").map(Number);
const verNewer = (a, b) => {
  const [a1, a2] = verParts(a), [b1, b2] = verParts(b);
  return a1 !== b1 ? a1 > b1 : (a2 || 0) > (b2 || 0);
};
const latestRelease = () => RELEASES[0];

/* What's new since `seen`. A record that has never looked gets the latest
   one only — a list of every release since 1.0 is the archive's job. */
function releasesSince(seen) {
  if (!seen) return [latestRelease()];
  const out = RELEASES.filter(r => verNewer(r.v, seen));
  return out.length ? out : [];
}

/* Somebody new to the app has nothing to catch up on: their first look at
   Today is not an update. Only a record with history before this release
   is told about it. */
function newsUnseen() {
  if (state.seenNews == null && !Object.keys(state.chars).length) {
    state.seenNews = latestRelease().v;
    save();
    return false;
  }
  return verNewer(latestRelease().v, state.seenNews || "0.0");
}

function newsSeen() {
  if (state.seenNews === latestRelease().v) return;
  state.seenNews = latestRelease().v;
  save();
}
