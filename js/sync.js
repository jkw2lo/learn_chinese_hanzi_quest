/* ============================================================
   同步 — your progress, on whatever you happen to be holding

   This app keeps everything in localStorage, which is per-browser: a record
   built on a laptop is invisible on a phone, and clearing site data ends it.
   This file is the optional way out of that. Sign in once on each device and
   both read and write the same document.

   It is optional in the strong sense. With no configuration below, nothing
   here loads, nothing appears in Settings, and the app is exactly the
   localStorage-only app it has always been — which is also what it is for
   anyone who never signs in.

   WHAT IT IS NOT: an account system. There is no server of ours, no profile
   and nothing to administer. Firebase holds one JSON document per signed-in
   person, the same one the 💾 button already writes to a file, and the rules
   below are what stop anyone reading anyone else's.

   ------------------------------------------------------------
   SETTING IT UP  (about five minutes, and only ever once)
   ------------------------------------------------------------
   1. console.firebase.google.com → Add project. Analytics is not needed.
   2. Build → Authentication → Get started → Sign-in method → Google → Enable.
      Then Settings → Authorised domains → Add domain, and add the domain this
      is served from. For GitHub Pages that is  jkw2lo.github.io  — localhost
      is already on the list, so development works without touching this.
   3. Build → Firestore Database → Create database → production mode.
      Then the Rules tab, and replace what is there with:

          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /progress/{uid} {
                allow read, write: if request.auth != null
                                   && request.auth.uid == uid;
              }
            }
          }

      That rule is the whole security model: a signed-in person can read and
      write the one document named after their own account, and nothing else.
   4. Project settings (the gear) → Your apps → Web (</>) → register.
      Copy the `firebaseConfig` object it shows you into SYNC_CONFIG below.
   5. node tools/version.mjs patch, commit, push.

   On the apiKey: it is not a secret and is not treated as one. It identifies
   the project to Google, it is visible in every Firebase web app ever shipped,
   and it grants nothing on its own — the rules in step 3 are what grant. Do
   not let that make you casual about the rules.
   ============================================================ */

/* Paste the config object from step 4 here. Empty apiKey = the feature is off
   and no part of this file runs. */
const SYNC_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

/* Pinned, and from the same CDN as hanzi-writer. ~510KB across the three, so
   they are fetched when they are wanted and never on a cold first paint. */
const SYNC_SDK = "https://cdn.jsdelivr.net/npm/firebase@10.14.1/";
const SYNC_PARTS = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"];
const SYNC_SEEN = "hq-signed-in";      /* has this browser ever signed in */

const syncConfigured = () => !!SYNC_CONFIG.apiKey;

/* off      — no project configured, the row never appears
   loading  — fetching the SDK or waiting on the first auth callback
   out      — ready, nobody signed in
   in       — signed in and syncing
   error    — something went wrong, and sync.msg says what */
const sync = { status: syncConfigured() ? "loading" : "off", user: null, msg: "", sdk: null };

/* set by app.js — the only thing on screen that shows any of this is the one
   row in Settings, so a change repaints that and nothing else */
let onSyncChange = null;

function syncOne(src) {
  return new Promise((ok, no) => {
    const el = document.createElement("script");
    el.src = src; el.async = false;          /* async false keeps them in order */
    el.onload = ok;
    el.onerror = () => no(new Error("could not load " + src));
    document.head.appendChild(el);
  });
}

/* Loaded once, whoever asks. The three scripts have to arrive in order, so
   they are awaited in sequence rather than raced. */
async function syncSdk() {
  if (sync.sdk) return sync.sdk;
  sync.sdk = (async () => {
    for (const p of SYNC_PARTS) await syncOne(SYNC_SDK + p);
    firebase.initializeApp(SYNC_CONFIG);
    return firebase;
  })();
  try {
    return await sync.sdk;
  } catch (e) {
    sync.sdk = null;                          /* let a later attempt retry */
    throw e;
  }
}

/* The shape js/srs.js wants: an object with get() and set(). Firestore's own
   snapshot is close enough that this is mostly a rename, which is the point —
   the record does not know what is storing it. */
function syncDoc(uid) {
  const ref = firebase.firestore().collection("progress").doc(uid);
  return {
    get: async () => {
      const snap = await ref.get();
      return { exists: snap.exists, data: () => snap.data() };
    },
    set: data => ref.set(data)
  };
}

function syncSet(status, msg = "") {
  sync.status = status;
  sync.msg = msg;
  if (typeof onSyncChange === "function") onSyncChange();
}

/* Called once at boot. It does nothing at all unless a project is configured,
   and it only pulls the SDK down if this browser has signed in before — a
   first-time visitor pays nothing until they ask for it. */
async function syncInit() {
  if (!syncConfigured()) return;
  let seen = false;
  try { seen = localStorage.getItem(SYNC_SEEN) === "1"; } catch {}
  if (!seen) return syncSet("out");
  try { await syncStart(); } catch (e) { syncSet("error", e.message); }
}

let syncWatching = false;
async function syncStart() {
  const fb = await syncSdk();
  if (syncWatching) return fb;
  syncWatching = true;
  /* onAuthStateChanged fires on every load for a session already established,
     which is what makes signing in a once-per-device act rather than a daily
     one. It also fires after signInWithRedirect returns. */
  fb.auth().onAuthStateChanged(async user => {
    sync.user = user ? { name: user.displayName || "", email: user.email || "" } : null;
    if (!user) { dropRemote(); return syncSet("out"); }
    try { localStorage.setItem(SYNC_SEEN, "1"); } catch {}
    syncSet("loading");
    try {
      const changed = await useRemote(syncDoc(user.uid));
      syncSet("in");
      /* the pull merged somebody else's afternoon into this device — repaint */
      if (changed && typeof onRemoteChange === "function") onRemoteChange();
    } catch (e) {
      syncSet("error", e.message || "could not reach the record");
    }
  });
  return fb;
}

async function syncSignIn() {
  if (!syncConfigured()) return;
  syncSet("loading");
  try {
    const fb = await syncStart();
    const provider = new fb.auth.GoogleAuthProvider();
    try {
      await fb.auth().signInWithPopup(provider);
    } catch (e) {
      /* A popup is the better experience — you stay on the page and keep your
         scroll position — but phones and in-app browsers block or simply do
         not support them. Falling back rather than reporting a failure means
         the button works everywhere without asking the device what it is. */
      const fall = ["auth/popup-blocked", "auth/popup-closed-by-user",
                    "auth/cancelled-popup-request",
                    "auth/operation-not-supported-in-this-environment"];
      if (!fall.includes(e.code)) throw e;
      if (e.code === "auth/popup-closed-by-user") return syncSet("out");
      await fb.auth().signInWithRedirect(provider);
    }
  } catch (e) {
    syncSet("error", syncReason(e));
  }
}

async function syncSignOut() {
  try {
    const fb = await syncSdk();
    await fb.auth().signOut();
  } catch { /* already gone */ }
  dropRemote();
  try { localStorage.removeItem(SYNC_SEEN); } catch {}
  sync.user = null;
  syncSet("out");
}

/* The three failures worth naming, because each one has a different fix and
   the raw message names none of them. */
function syncReason(e) {
  const code = (e && e.code) || "";
  if (code === "auth/unauthorized-domain") {
    return `${location.hostname} isn't on the project's authorised domains — `
         + "add it under Authentication → Settings.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in isn't switched on for this project — enable it under "
         + "Authentication → Sign-in method.";
  }
  if (code === "permission-denied") {
    return "Signed in, but the database refused the write — check the Firestore rules.";
  }
  return (e && e.message) || "something went wrong";
}
