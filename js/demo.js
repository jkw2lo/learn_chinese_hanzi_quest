/* Hanzi Quest — the demo, for visitors from Jen's portfolio (js/demo-welcome.js; the style
   guide is DEMO.md in the portfolio repo).

   The demo is the learner the screenshots use (overview/shots.json): 140 characters over six
   weeks of study, a 16-day streak, most of the menu taught, and the tour, intro, profile and
   placement already done, so nothing asks for setup. Start fresh puts the record back to blank. */

function demoLearner() {
  const N = 140, DAYS = 44;
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const ago = n => { const d = new Date();
  d.setHours(12);
  d.setDate(d.getDate() - n);
  return key(d);
  };
  let r = 11;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const s = blank();
  const learned = HQ.slice(0, N).map(e => e.c);
  learned.forEach((c, i) => { const age = Math.round(DAYS * (1 - i / N));
  const lvl = Math.max(1, Math.min(7, Math.round(age / 7) + (rnd() < 0.3 ? -1 : 0)));
  const seen = 3 + Math.round(age / 3), wrong = Math.round(seen * 0.15 * rnd());
  const k = Math.round(seen * 0.6);
  s.chars[c] = { lvl, due: rnd() < 0.12 ? ago(0) : ago(-1 - Math.round(rnd() * 9)), seen, right: seen - wrong, wrong, skills: { r: k, p: Math.round(k * 0.8), c: Math.round(k * 0.5), w: Math.round(k * 0.25) }, shown: { r: k + 1, p: k, c: Math.round(k * 0.6), w: Math.round(k * 0.3) }, first: ago(age), last: ago(Math.min(age, Math.round(rnd() * 4))) };
  });
  for (let n = DAYS;
  n >= 1;
  n--) if (n !== 17 && n !== 30) s.days[ago(n)] = { new: 2 + Math.round(rnd() * 3), rev: 18 + Math.round(rnd() * 40), ms: Math.round((12 + rnd() * 14) * 60000), sessions: 1 };
  s.days[ago(0)] = { new: 0, rev: 0 };
  s.streak = { cur: 16, best: 16, last: ago(1) };
  s.started = ago(DAYS);
  s.tour = true;
  s.intro = true;
  s.profiled = true;
  s.levelAsked = true;
  s.level = 'none';
  s.seenNews = typeof APP_VERSION === 'string' ? APP_VERSION : null;
  s.hailed = (typeof MILESTONES !== 'undefined' && Array.isArray(MILESTONES)) ? MILESTONES.map(m => m.id || m.n || m).filter(x => typeof x !== 'object') : [];
  const menu = (typeof MENU_CHARS !== 'undefined' ? MENU_CHARS : []).filter(c => learned.includes(c));
  s.menuTaught = menu.slice(0, Math.round(menu.length * 0.7));
  localStorage.setItem(KEY, JSON.stringify(s));
}

/* After the app's own boot, which loads the record (both wait for DOMContentLoaded). */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.DemoWelcome) return;
  DemoWelcome.init({
    id: "learn_chinese_hanzi_quest",
    name: "Hanzi Quest",
    accent: "#c0392b",
    demo: "A learner six weeks in: 140 characters, a 16-day streak, and most of the menu read.",
    fresh: "A short tour and an optional placement quiz, then your first five characters.",
    isEmpty: () => !localStorage.getItem(KEY) || !Object.keys(state.chars || {}).length,
    loadDemo: () => { demoLearner(); location.reload(); return new Promise(() => {}); },
    clear: () => { state = blank(); save(); location.reload(); },
    /* a walk round what the demo learner has open (DEMO.md: home, the overview's features, the sections) */
    tour: [
      { go: () => go("today"), el: ["#viewToday .dash-today", "#viewToday"], title: "今天 Today",
        text: "One session a day: a few new characters and the reviews that are due, with today's practice listed beside it." },
      { go: () => go("radicals"), el: ["#viewRadicals .rx", "#viewRadicals"], title: "部首 Characters in families",
        text: "Most characters are two parts: one hints at the meaning, one at the sound. Learn a part once and every character with it gets easier." },
      { go: () => go("menu"), el: ["#viewMenu .menu-wrap", "#viewMenu .sq"], title: "菜单 Read a real menu",
        text: "One character a day from a restaurant menu, inked in as you learn it. Hover any character for its pinyin and meaning." },
      { go: () => go("record"), el: ["#viewRecord .stats", "#viewRecord"], title: "记录 See what's sticking",
        text: "Every day studied, and each skill on its own: you'll recognise 学 long before you can write it. This learner is on a 16-day streak." },
      { go: () => go("sprint"), el: ["#viewSprint .cols", "#viewSprint"], title: "速练 Practice that's fair",
        text: "Timed Sprint sheets, marked only when you hand them in. No drill ever shows a character you haven't met yet." },
      { go: () => go("today"), el: [".top-nav", "#burgerBtn"], title: "Every section",
        text: "Songs, the Write exercise book and the Library of all 763 characters are here too." },
      { title: "Over to you",
        text: "Everything works: run today's session, try a Sprint, read the menu. When you'd rather start as a new learner, Start fresh is at the bottom left." },
    ],
  });
});
