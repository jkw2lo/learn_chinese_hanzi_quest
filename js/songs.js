/* ============================================================
   歌词 Songs — learning through lyrics

   A song is imported whole: a title and a block of lyric text, split into
   lines. Nothing about it is quizzed or scheduled — reading it is the whole
   activity, the way the menu is read rather than drilled. Every character
   goes through glyphs() in js/app.js, the same renderer the menu uses, so a
   character you already know lights up for free.

   Reading a character is not the same interaction as opening a song, though,
   and both live on the same word — so this file does not reuse initTips()'s
   own click handling the way it reuses glyphs(). That handler opens the full
   character sheet by replacing whatever sheet is already open, which is
   right for a character reached from the Menu tab and wrong here: a song is
   already showing in that one sheet, so opening a character the same way
   throws the song away, and "back" from the character lands on the song
   list, not the song. So within .song-lines: a long press shows the small
   reading-and-meaning tip (peekTip in this file, sharing showTip/hideTip
   with the hover version so touch and mouse land on identical UI), and a
   plain tap opens the full character card in #charPeek — a second sheet
   layered on top of the song's, closed back to the song rather than past it.

   There is no bundled roster. "The 5 most popular Mandarin songs of the
   2000s" needs their actual lyrics, and lyrics are copyrighted text this
   app has no licence to ship — so the roster starts empty, and Add a song
   is the only way in, for a first song exactly as much as a tenth.
   ============================================================ */

const songList = () => Object.values(state.songs).sort((a, b) => (b.added || 0) - (a.added || 0));

function addSong(title, artist, text) {
  const lines = String(text || "").split("\n").map(l => l.trim()).filter(Boolean);
  const t = String(title || "").trim();
  if (!t || !lines.length) return null;
  /* Date.now() the way every other id in this record is minted (see
     wpSave, diaryPut) — unique enough for one person's own library, and a
     string because it lives as an object key, the way chars and days do. */
  const id = String(Date.now());
  const song = { id, title: t, artist: String(artist || "").trim(), added: Date.now(), lines };
  state.songs[id] = song;
  save();
  return song;
}

function deleteSong(id) {
  delete state.songs[id];
  save();
}

/* Known against the same measure everything else in the app uses — isKnown,
   the main library — not a side quest's own book the way the menu keeps
   one. A song borrows progress from the curriculum; it isn't a curriculum
   of its own, so there's nothing here for it to keep score of separately. */
function songProgress(song) {
  const all = song.lines.flatMap(cjkOf);
  const known = all.filter(isKnown);
  return { known: known.length, total: all.length, pct: all.length ? known.length / all.length : 0 };
}

function renderSongs() {
  const list = songList();
  $("#viewSongs").innerHTML = `<div class="wrap">
    <div class="today-head">
      <h1>Songs ${hanLabel("歌词")}</h1>
      <p class="note">Learn through lyrics you already half-know. Import a song, and every character you've
        learned picks itself out as you read — the same way the menu does. Hover or tap any character,
        known or not, for its reading and meaning.</p>
    </div>
    <button class="btn btn-block" id="songAdd">Add a song</button>
    ${list.length ? `<div class="song-grid">${list.map(songCard).join("")}</div>`
      : `<div class="sheet song-empty" style="padding:1.2rem;text-align:center">
           <p class="note">Nothing here yet. Paste in the lyrics to a song you already half-know, and the
             words you've learned will light up as you go.</p>
         </div>`}
  </div>`;
  $("#songAdd").onclick = openSongImport;
  $$("#viewSongs .song-card").forEach(b => b.onclick = () => openSong(b.dataset.id));
}

function songCard(song) {
  const p = songProgress(song);
  const RR = 15, CC = 2 * Math.PI * RR, aa = CC * Math.min(1, p.pct);
  return `<button class="song-card" data-id="${esc(song.id)}">
    <span class="pr-ring">
      <svg viewBox="0 0 38 38"><circle class="trk" cx="19" cy="19" r="${RR}"/>
        ${aa > .5 ? `<circle class="val ${p.pct >= 1 ? "done" : ""}" cx="19" cy="19" r="${RR}"
          stroke-dasharray="${aa.toFixed(1)} ${CC.toFixed(1)}"/>` : ""}</svg>
    </span>
    <span class="song-card-body">
      <b>${esc(song.title)}</b>
      ${song.artist ? `<small>${esc(song.artist)}</small>` : ""}
      <small>${p.total ? `${p.known} of ${p.total} characters known` : "No characters yet"}</small>
    </span>
  </button>`;
}

function openSongImport() {
  openSheet(`<span class="han">加歌</span> Add a song`, `<div class="wrap"><div class="section">
    <p class="note">Paste in the lyrics, one line at a time. Nothing here is checked or scheduled — it's for
      reading, the way the menu is.</p>
    <div class="sheet block">
      <div class="block-head"><span class="k">题</span><span class="t">Title</span></div>
      <input type="text" id="songTitle" class="search" maxlength="80" placeholder="A song you already half-know">
    </div>
    <div class="sheet block">
      <div class="block-head"><span class="k">artist</span><span class="t">Optional</span></div>
      <input type="text" id="songArtist" class="search" maxlength="80" placeholder="Who sings it">
    </div>
    <div class="sheet block">
      <div class="block-head"><span class="k">词</span><span class="t">Lyrics, one line at a time</span></div>
      <textarea id="songLyrics" class="search" rows="10" placeholder="第一行…&#10;第二行…"></textarea>
    </div>
    <button class="btn btn-block" id="songSave">Add to your songs</button>
    <p class="note" id="songErr" hidden>A title and at least one line of lyrics are both needed.</p>
  </div></div>`);
  $("#songSave").onclick = () => {
    const song = addSong($("#songTitle").value, $("#songArtist").value, $("#songLyrics").value);
    if (!song) { $("#songErr").hidden = false; return; }
    closeSheet();
    openSong(song.id);
  };
}

function openSong(id) {
  const song = state.songs[id];
  if (!song) return;
  const p = songProgress(song);
  openSheet(`<span class="han">歌词</span> ${esc(song.title)}`, `<div class="wrap"><div class="section">
    <div class="today-head">
      <h1>${esc(song.title)}</h1>
      ${song.artist ? `<p class="note">${esc(song.artist)}</p>` : ""}
      <p class="note">${p.total ? `${p.known} of ${p.total} characters known` : "No characters in this one yet"}
        · press and hold a character for its reading, tap it for the full card</p>
    </div>
    <div class="song-lines">
      ${song.lines.map(line => `<button class="song-line" data-speak="${esc(line)}">${glyphs(line)}</button>`).join("")}
    </div>
    <button class="btn btn-ghost btn-block" id="songDel">Delete this song</button>
  </div></div>`);
  $("#songDel").onclick = async () => {
    if (!await askConfirm({
      k: "删除", title: "Delete this song?",
      body: `${esc(song.title)} and its lyrics will be gone — nothing else here is affected.`,
      yes: "Delete", no: "Keep it", danger: true
    })) return;
    deleteSong(id);
    closeSheet();
    renderSongs();
  };
  bindSongLines($(".song-lines", $("#svBody")));
}

/* Long press vs. tap, on the characters inside a song's lines only — see the
   file header for why this isn't left to initTips()'s own click handling.
   Rebound on every openSong() call, since openSheet replaces the DOM under
   it (and any listeners on it) each time. */
const SONG_PRESS_MS = 420, SONG_PRESS_TOL = 10;
function bindSongLines(container) {
  if (!container) return;
  let timer = null, longPressed = false, startX = 0, startY = 0;

  const cancelTimer = () => { clearTimeout(timer); timer = null; };

  container.addEventListener("pointerdown", e => {
    const g = e.target.closest(".g[data-ch]");
    if (!g) return;
    longPressed = false;
    startX = e.clientX; startY = e.clientY;
    timer = setTimeout(() => { longPressed = true; showTip(g); }, SONG_PRESS_MS);
  });
  container.addEventListener("pointermove", e => {
    if (!timer) return;
    if (Math.abs(e.clientX - startX) > SONG_PRESS_TOL || Math.abs(e.clientY - startY) > SONG_PRESS_TOL) cancelTimer();
  });
  container.addEventListener("pointerup", cancelTimer);
  container.addEventListener("pointercancel", cancelTimer);

  /* The click that follows a long press's pointerup is what would otherwise
     also open the peek — caught here rather than left to fire, once. */
  container.addEventListener("click", e => {
    const g = e.target.closest(".g[data-ch]");
    if (!g) return;                          // anywhere else on the line: data-speak handles it
    e.stopPropagation();                     // never reaches initTips()'s or initSpeakables()'s own click handler
    if (longPressed) { longPressed = false; return; }
    if (CHAR_INDEX[g.dataset.ch]) openCharPeek(g.dataset.ch);
  });
}

/* A character's detail, stacked over the song rather than in place of it.
   #charPeek is its own sheetview (see index.html), so closing it just hides
   itself — #charView underneath, still showing the song, was never touched. */
function openCharPeek(c) {
  const ch = CHAR_INDEX[c];
  if (!ch) return;
  hideTip();
  const wid = "pk" + Math.random().toString(36).slice(2, 8);
  const stage = STAGES.find(s => s.n === ch.stage);
  $("#charPeekTitle").innerHTML = `<span class="han">${esc(ch.c)}</span>
    <span class="dim" style="font-weight:400;font-size:.85rem">${esc(stage.icon)} ${esc(stage.name)}</span>`;
  $("#charPeekBody").innerHTML = `<div class="wrap"><div class="section">${charCard(ch, { writerId: wid })}</div></div>`;
  $("#charPeek").classList.add("on");
  bindCard($("#charPeekBody"), ch, wid);
}
function closeCharPeek() {
  $("#charPeek").classList.remove("on");
}
