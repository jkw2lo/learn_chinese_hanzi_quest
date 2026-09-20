/* ============================================================
   The black box — what was happening just before it broke.

   A freeze destroys its own evidence. The screen stops, the learner reloads
   to get out of it, and whatever threw goes with the page: no console open,
   no stack, nothing left to send anyone. So this file runs before every other
   script on the page — an error thrown while data.js is still parsing is
   exactly the one nothing else would be alive to catch — and it writes what
   it sees straight to localStorage, which reloading cannot reach.

   Two runs are kept: the one that broke and the one after it. "It got stuck,
   I reloaded, and it was still wrong" is one story and needs both halves.

   What goes in is breadcrumbs and errors — which card, which view, which
   button — and never the answers or the characters studied. This is a trail
   through the code, not a copy of the lesson.
   ============================================================ */

/* Named on window as well as in scope, and not as a nicety: a top-level
   `const` in a classic script is a global *lexical* binding and never becomes
   a property of window, so every `window.HQDIAG &&` guard in app.js — written
   exactly so the app survives this file going missing — read as "missing" and
   quietly recorded nothing. The guards are right; the export was what was
   wrong. */
const HQDIAG = window.HQDIAG = (() => {
  const KEY = "hanzi-quest-log";
  const PER_RUN  = 200;   /* breadcrumbs kept for one run */
  const RUNS     = 2;     /* this one, and the one before it */
  const TEXT_MAX = 300;   /* one ordinary entry */
  const STACK_MAX = 700;  /* an error is allowed more room than that */

  const t0 = Date.now();
  const runId = t0.toString(36) + "." + Math.random().toString(36).slice(2, 6);
  const log = [];
  let prev = [];

  /* Whatever the last run left behind, before this run starts overwriting it. */
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) prev = (JSON.parse(raw).runs || []).filter(r => r && r.id !== runId).slice(-(RUNS - 1));
  } catch { /* unreadable, or no storage at all — start with a clean sheet */ }

  const clip = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; };
  /* Full URLs are mostly origin, and the origin is recorded once in the head. */
  const short = u => String(u || "").replace(/^https?:\/\/[^/]+\//, "").replace(/\?v=[\d.]+/, "");

  /* One argument of a console call, or one rejection reason, as a line.
     Errors keep their first stack frame, because "TypeError: x is not a
     function" on its own names no file. */
  function str(v) {
    if (v instanceof Error) return v.name + ": " + v.message + frame(v);
    if (typeof v === "string") return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  const frame = e => {
    const line = String(e?.stack || "").split("\n").find(l => /:\d+:\d+/.test(l));
    return line ? " — " + short(line.trim()) : "";
  };

  const run = () => ({
    id: runId,
    at: new Date(t0).toISOString(),
    ver: typeof APP_VERSION === "string" ? APP_VERSION : "dev",
    url: location.origin + location.pathname,
    ua: navigator.userAgent,
    log
  });

  /* Written on a short delay so a burst of breadcrumbs is one write, and
     immediately whenever something has actually gone wrong — that entry is
     the one a reload must not be able to take away. */
  let pending = null;
  function flush() {
    clearTimeout(pending); pending = null;
    try { localStorage.setItem(KEY, JSON.stringify({ runs: [...prev, run()] })); }
    catch { /* quota or private mode: this run's trail still lives in memory */ }
  }

  function note(kind, text) {
    log.push([Date.now() - t0, kind, clip(text, TEXT_MAX)]);
    if (log.length > PER_RUN) log.splice(0, log.length - PER_RUN);
    if (!pending) pending = setTimeout(flush, 600);
  }

  function fail(kind, text) {
    log.push([Date.now() - t0, kind, clip(text, STACK_MAX)]);
    if (log.length > PER_RUN) log.splice(0, log.length - PER_RUN);
    flush();
  }

  /* Capture phase, because a stylesheet or a script that 404s fires an error
     at the element and it does not bubble — and "the writing library never
     loaded" is a perfectly good explanation for a page that will not respond. */
  addEventListener("error", e => {
    if (e.message) {
      fail("error", e.message + " @ " + short(e.filename) + ":" + e.lineno + ":" + e.colno
        + (e.error?.stack ? "\n" + clip(String(e.error.stack), STACK_MAX) : ""));
    } else if (e.target && (e.target.src || e.target.href)) {
      fail("error", "failed to load " + short(e.target.src || e.target.href));
    }
  }, true);

  addEventListener("unhandledrejection", e => fail("error", "unhandled rejection: " + str(e.reason)));

  /* The app's own complaints count as evidence too — a caught-and-logged
     failure is still the thing that came just before the screen stopped. */
  ["error", "warn"].forEach(level => {
    const orig = console[level].bind(console);
    console[level] = (...a) => {
      try { note("console." + level, a.map(str).join(" ")); } catch { /* never break logging */ }
      orig(...a);
    };
  });

  /* A tab closed or backgrounded mid-burst would otherwise lose the last
     breadcrumbs — which are the interesting ones. */
  addEventListener("pagehide", flush);
  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  note("boot", "run " + runId);

  return {
    runId,
    note,
    fail,
    /* Newest last, previous run first — the order you would read it in. */
    runs: () => [...prev, run()],
    clear() { prev = []; log.length = 0; try { localStorage.removeItem(KEY); } catch {} note("boot", "log cleared"); }
  };
})();
