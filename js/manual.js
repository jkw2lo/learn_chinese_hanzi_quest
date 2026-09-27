/* ============================================================
   使用说明 The manual — how Hanzi Quest works, in full

   Most people never need this, which is why it lives behind a button in
   Settings rather than anywhere on the way to studying. It is for the
   person who wants to know why a character came back today, what a rest
   day is, or what a writing miss does to the schedule.

   Every number in here is read from the constant that actually decides it
   (INTERVALS, REST_PER_WEEK, KEPT_GAP…), at the moment the manual opens —
   so when a rule changes, the manual changes with it, and nobody has to
   remember to update a sentence three files away. Section bodies are
   therefore functions, not strings: the constants live in srs.js and
   app.js, which load after this file.

   DOM-free at the top level, like sprint.js and songs.js.
   ============================================================ */

const manPl = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
const manPct = x => `${Math.round(x * 100)}%`;
const manKb = k => `<kbd class="opt-n">${k}</kbd>`;
const manHz = s => `<span class="han">${s}</span>`;

/* the version last seen before this opening of the manual — opening it
   marks the news read, and "since you last looked" has to be asked first */
let manualSeenBefore = null;

const releaseHtml = r => `<div class="man-rel">
  <div class="man-rel-head"><b>${esc(r.title)}</b><span class="dim">${esc(r.v)} · ${esc(
    new Date(r.date + "T12:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }))}</span></div>
  <ul>${r.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
</div>`;

const MANUAL = [
  {
    id: "news", k: "新", title: "What's new", sub: "The latest changes to the app",
    body: () => {
      const fresh = releasesSince(manualSeenBefore);
      const list = fresh.length ? fresh : [latestRelease()];
      return `<p>${fresh.length > 1
          ? `${fresh.length} updates since you last looked, newest first.`
          : `You're on version ${esc(appVersion())}.`}
        The full history is in <a data-man="archive">Every release so far</a>.</p>
        ${list.map(releaseHtml).join("")}`;
    }
  },
  {
    id: "idea", k: "总览", title: "The idea", sub: "What this app is doing, in one page",
    body: () => `
      <p>Hanzi Quest teaches you to <b>read</b> Chinese characters — ${HQ.length} of them, in an order where each
        one makes the next easier: the parts come before the characters built from them, and common characters
        come before rare ones. 马 arrives before 妈 and 吗 because it is inside both.</p>
      <p>Three ideas run through everything:</p>
      <ul>
        <li><b>Spaced review.</b> Every character you learn is scheduled to come back just before you would forget
          it. Get it right and the gap grows (a day, then two, four, eight… up to ${INTERVALS[MAX_LVL]} days). Get it
          wrong and it comes back sooner. See <a data-man="schedule">The review schedule</a>.</li>
        <li><b>Four separate skills.</b> Recognising 学, saying it, picking it out from its meaning, and writing it
          from memory are different kinds of knowledge, and you will have them at different times. Each is tracked
          on its own. See <a data-man="skills">Skills, and what "solid" means</a>.</li>
        <li><b>Extra practice can never make tomorrow worse.</b> Sprints, Go deeper rounds and handwriting are yours to
          do as much as you like. None of them pushes a review later than it should be, and none of the risky ones
          (racing, handwriting) can pull a character backwards. See <a data-man="activities">What each activity does</a>.</li>
      </ul>
      <p>Forgetting is expected. Anyone learning around a job forgets between sessions, and the app is built for that:
        reviews after a break are eased in, missed days don't have to break a streak, and remembering something old
        is counted as progress. See <a data-man="breaks">Coming back after a break</a>.</p>`
  },
  {
    id: "busy", k: "建议", title: "If you're short on time", sub: "A routine that works around a job",
    body: () => `
      <ul>
        <li><b>Do the daily session and stop there, if that's all you have.</b> It's the one thing that keeps
          the schedule honest. The ring on Today says roughly how long it will take.</li>
        <li><b>Keep new characters low.</b> You're set to ${manPl(state.goalNew, "new character")} a day. Every
          character you learn adds reviews for months, so a bigger number now means a bigger pile later. When
          reviews feel heavy, lower it in Settings rather than skipping days.</li>
        <li><b>Missed a few days? Just open the app.</b> After ${WELCOME_GAP} days away you'll be offered the
          ${WELCOME_KEEP} shakiest reviews first, with the rest spread out. You don't have to clear the pile.</li>
        <li><b>A spare ten minutes is a review day.</b> Go deeper, a sprint or the menu are all real practice on
          what you already know. They keep your streak and strengthen your skills without adding anything new.</li>
        <li><b>Save a copy now and then.</b> Your progress lives in this browser. The 💾 button writes it to a file.</li>
      </ul>`
  },
  {
    id: "today", k: "今天", title: "The Today page", sub: "Everything on it, top to bottom",
    body: () => `
      <h4>The session</h4>
      <p>The big button starts today's session: your new characters, with the reviews that are due mixed in between
        them. The ring fills as you go, and the pills under it count what's left — <b>To learn</b> (new characters
        still to come today), <b>To review</b> (characters whose review date has arrived) and <b>Done</b>
        (characters reviewed today). All three count characters, not answers: one character answered four times is
        one character done.</p>
      <p>Each new character is shown on a card first, then a few reviews go by, then you're asked to recognise it.
        The day counts as finished once you've learned today's characters and nothing is left due.</p>
      <p>When everything is clear you can <b>study ahead</b> — five more characters, today only. It doesn't change
        your daily setting.</p>

      <h4>Learned today ${manHz("今日新字")}</h4>
      <p>Every character you learned today, from the session or from the Library. Tap one to open its card.</p>

      <h4>Today's practice ${manHz("今日练习")}</h4>
      <p>A short, finishable checklist, all about <i>today's</i> characters:</p>
      <ul>
        <li>${manHz("学习")} <b>Learn today's characters</b> — the session itself.</li>
        <li>${manHz("认读")} <b>Recognise them</b> — character to meaning.</li>
        <li>${manHz("阅读")} <b>Read them in context</b> — words and sentences. A character learned an hour ago rarely has
          a sentence you can read yet, so this one tops up with older characters you can already read.</li>
        <li>${manHz("发音")} <b>Hear them</b> — sound and tone.</li>
        <li>${manHz("抄写")} <b>Write them out</b> — guided copying, square by square.</li>
      </ul>
      <p>Ticks are earned by evidence rather than by which button you pressed: once every one of today's characters has
        been answered correctly in that kind of drill, the row ticks — even if you did it from Go deeper. A row that
        can't be done yet (nothing readable, no stroke data) shows a lock and says why, and is counted as locked
        rather than quietly left out.</p>

      <h4>Go deeper</h4>
      <p>The same skills over your <i>whole</i> library, and it never finishes. Its reward is a tally that only goes
        up, drawn in 正 — five strokes per character, the way tallies are kept in China. See
        <a data-man="deeper">Go deeper</a>.</p>

      <h4>Word of the week, and the menu</h4>
      <p>A real word picked from your interests (<a data-man="words">Word of the week</a>), and the Read a Menu side
        quest (<a data-man="menu">The menu</a>). Neither is a drill.</p>

      <h4>The tracker</h4>
      <p>Tap the 🔥 chip in the top bar for the last four weeks at a glance: your streak, days studied, rest days left
        this week, what you remembered after a gap, and today's time.</p>`
  },
  {
    id: "schedule", k: "复习", title: "The review schedule", sub: "Why a character comes back when it does",
    body: () => `
      <p>Every character you know has a <b>level</b>, from 0 to ${MAX_LVL}. The level decides how long until you
        see it again:</p>
      <table class="man-table">
        <tr><th>Level</th>${INTERVALS.map((_, i) => `<td>${i}</td>`).join("")}</tr>
        <tr><th>Next review in</th>${INTERVALS.map(d => `<td>${d}d</td>`).join("")}</tr>
      </table>
      <ul>
        <li><b>Right</b> on a review that was due: up one level, and the next review is set by the new level.</li>
        <li><b>Wrong</b>: down two levels, and it comes back again <i>today</i>, a few cards later.</li>
        <li><b>New</b> characters start at level 0 and are first reviewed tomorrow.</li>
      </ul>
      <p>So a character you keep getting right drifts out to weeks and then months, and one you've lost is caught
        quickly and rebuilt. Reviews come shakiest first (lowest level).</p>
      <p>Getting a character right <i>early</i> — in practice, before it was due — counts for your skills but does
        <b>not</b> push its review later. Drilling something today shouldn't hide the review you actually needed next
        week.</p>
      <p>Characters you prove you know in <a data-man="placement">Find my level</a> join at level ${PLACED_LVL}
        with their first review ${PLACED_REST}+ days away, so a placement never lands as a pile of homework.</p>`
  },
  {
    id: "activities", k: "规则", title: "What each activity does", sub: "Which ones move your schedule, and which don't",
    body: () => `
      <table class="man-table man-rules">
        <tr><th></th><th>A right answer</th><th>A wrong answer</th></tr>
        <tr><th>Daily session</th><td>Up a level, review pushed out</td><td>Down two levels, back today</td></tr>
        <tr><th>Today's practice rows, Go deeper, repair rounds</th><td>Skill credit; pushes the review out only if
          it was due anyway</td><td>Down two levels, back today</td></tr>
        <tr><th>Writing from memory</th><td>Handwriting credit (${manHz("笔")})</td><td>Nothing lost — the schedule
          isn't touched</td></tr>
        <tr><th>Sprint</th><td>Skill credit</td><td>Nothing lost — goes in the ${manHz("错字本")} instead</td></tr>
        <tr><th>Flashcards, menu, songs, word of the week, the 练字 notebook</th><td colspan="2">Not graded at all.
          Reading is the activity.</td></tr>
      </table>
      <p>Why the difference? A miss while racing the clock says you were slow, not that you'd forgotten; a miss on a
        trackpad can be a stroke that didn't register. Neither is evidence you can't <i>read</i> the character, and
        the schedule tracks reading. Handwriting is kept as its own skill alongside it.</p>
      <p>Every one of these counts as practice for your streak and the calendar.</p>`
  },
  {
    id: "drills", k: "题型", title: "The drills", sub: "Every kind of question, and when it starts appearing",
    body: () => `
      <p>A character earns harder questions as its level rises. Easy ones never go away — they're mixed in.</p>
      <table class="man-table man-rules">
        <tr><th>From level</th><th>Drill</th><th>What you do</th></tr>
        <tr><td>0</td><td>${manHz("认")} Recognise</td><td>See the character, pick its meaning</td></tr>
        <tr><td>0</td><td>${manHz("音")} Reading</td><td>See the character, pick its pinyin. The wrong options share its
          tone or its first sound, so guessing from the shape of the word doesn't work.</td></tr>
        <tr><td>2</td><td>${manHz("写")} Recall the form</td><td>Given pinyin and meaning, pick the character. The others
          share parts with it.</td></tr>
        <tr><td>2</td><td>${manHz("听")} Listen</td><td>Hear it, pick the character</td></tr>
        <tr><td>3</td><td>Fill the gap</td><td>A word you can read with this character missing</td></tr>
        <tr><td>3</td><td>${manHz("组词")} Build the word</td><td>Assemble a word from character tiles</td></tr>
        <tr><td>4</td><td>${manHz("阅读")} Read in context</td><td>The longest thing built from it that you can fully read —
          a sentence if every character in it is yours, otherwise a word</td></tr>
        <tr><td>4</td><td>${manHz("默写")} Write from memory</td><td>Draw it stroke by stroke${state.writeDrills ? "" : " (turned off in your Settings)"}</td></tr>
      </table>
      <p><b>No drill ever shows you a character you haven't met.</b> Words and sentences are only used once every
        character in them is one you know, so reading never runs ahead of you.</p>
      <p>Writing is <b>sticky</b>: once a character has had one writing drill, it keeps getting them until three
        land. You learn strokes by writing a character several times close together, not once a month.</p>
      <p>After a correct answer the card moves on by itself after a moment; after a wrong one it waits, because that's
        the moment to read what's on screen. The timer bar gives a ${manHz("快")} badge for answers under
        ${QUICK_MS / 1000} seconds, and running out costs nothing.</p>`
  },
  {
    id: "skills", k: "技能", title: 'Skills, and what "solid" means', sub: "The four bars on Record, and the rings in Go deeper",
    body: () => `
      <table class="man-table man-rules">
        <tr><th>Skill</th><th>Earned by</th></tr>
        <tr><td>${manHz("认")} Recognise</td><td>Recognise, read in context, sprint reading</td></tr>
        <tr><td>${manHz("音")} Pronounce</td><td>Reading (pinyin), listen, sprint listening</td></tr>
        <tr><td>${manHz("写")} Recall the form</td><td>Recall, fill the gap, build the word, sprint writing</td></tr>
        <tr><td>${manHz("笔")} Write from memory</td><td>Handwriting drills only</td></tr>
      </table>
      <p>A character is <b>solid</b> in a skill after ${PASSES_FOR_SOLID} clean answers in it — one right answer can be
        a lucky guess. The rings in Go deeper fill with <i>every</i> clean pass, so a round of practice always shows,
        and the bar under each ring shows how your characters are spread: solid, two passes, one, none.</p>
      <p>Each ring is measured against what that mode can actually ask about. Writing only counts characters with
        stroke data, so it can reach full.</p>
      <p>On a character's own level: it's shown as <b>strong</b> from level 5 (a review roughly monthly or rarer),
        <b>learning</b> below that, and <b>due</b> when its review has arrived.</p>`
  },
  {
    id: "breaks", k: "回来", title: "Coming back after a break", sub: "Welcome back, rest days, and what reviewing kept",
    body: () => `
      <h4>Welcome back ${manHz("归")}</h4>
      <p>If it's been ${WELCOME_GAP} or more days since you last studied and more than ${WELCOME_KEEP} reviews are
        waiting, Today offers to start with the <b>${WELCOME_KEEP} shakiest</b> and spread the rest over the next few
        days (at most ${WELCOME_SPREAD}), shakiest soonest. It happens when you press Start. If you'd rather face the
        lot, take "No thanks"; if you change your mind afterwards, "Undo" puts them all back in today. Your new
        characters are never held back — coming back should still move you forward.</p>
      <h4>Rest days</h4>
      <p>Up to <b>${REST_PER_WEEK} missed days a week</b> (Monday to Sunday) leave your streak standing. There's
        nothing to switch on or spend: a missed day is simply covered if the week has one left. A rest day holds the
        streak but doesn't add to it — the number counts days you studied. Rest days show as a dashed outline on the
        calendars, and the tracker says how many are left this week.</p>
      <p>Right now you have ${manPl(restsLeftThisWeek(), "rest day")} left this week.</p>
      <h4>What reviewing kept ${manHz("温故知新")}</h4>
      <p>Learning new characters is easy to celebrate; keeping old ones is the part that matters. Two things are
        counted:</p>
      <ul>
        <li><b>Remembered</b> — a character you got right after ${KEPT_GAP} or more days without seeing it.</li>
        <li><b>Rescued</b> — a character you once knew well (level ${LAPSE_FROM}+), then missed, and have since brought
          back up to where it was.</li>
      </ul>
      <p>Both appear at the end of a session, in the tracker, and on Record, which also shows how many characters you
        learned over ${HELD_AGE} days ago are still solid. Forgetting and getting it back is how a character sticks.</p>`
  },
  {
    id: "streak", k: "连续", title: "Streaks and the calendar", sub: "What counts as a day",
    body: () => `
      <p>Any practice counts toward the day: the session, a practice row, Go deeper, a repair round, a sprint. The
        🔥 streak is how many days in a row you've studied, allowing for <a data-man="breaks">rest days</a>.</p>
      <p>The calendars — four weeks in the tracker, six months on Record — shade each day by how much you did. A missed
        day is an empty box; nothing you've done is ever cleared. <b>Days studied</b> and your <b>best run</b> never go
        down.</p>
      <p>Record also shows <b>weekly activity</b> — answers per week for the last eight weeks — and <b>uneven skills</b>:
        characters where one skill lags well behind another, like one you read easily but can't write.</p>
      <p>Two things get a celebration: ticking off the whole of Today's practice, and every character solid in every
        Go deeper mode. Every hundredth character learned is a milestone too.</p>`
  },
  {
    id: "tiers", k: "阶段", title: "Stages, tiers and unlocking", sub: "Why some of the Library is shut",
    body: () => `
      <p>The characters are taught in ${STAGES.length} <b>stages</b> — a teaching order, from pictographs and building
        blocks upwards. Across them sit three <b>tiers</b> at the usual literacy milestones:</p>
      <ul>${TIERS.map(t => `<li>${esc(t.icon)} <b>${esc(t.name)} ${manHz(esc(t.zh))}</b> — up to ${t.to}. ${esc(t.blurb)}</li>`).join("")}</ul>
      <p>A tier opens when you know <b>${manPct(TIER_UNLOCK)}</b> of the one before it (and of every tier before that),
        so you can't skim the foundation and jump ahead, but a handful of stubborn characters can't hold the door shut
        either. New characters are never dealt from a locked tier.</p>
      <p>You can still open any character's card in a locked tier and read everything about it. It just isn't one to
        start on yet — the card says what would open it.</p>`
  },
  {
    id: "placement", k: "定级", title: "Find my level", sub: "Starting past the beginning",
    body: () => `
      <p>If you already read some Chinese, <b>Settings → Find my level</b> walks the curriculum in order and asks you
        to pick each character from its meaning. A character is credited <b>only if you answered it correctly</b> —
        nothing is guessed. There's an "I don't know this one" button (${manKb("space")}), and guessing right means the app
        skips teaching it, so don't.</p>
      <p>It stops once you've missed more than ${PLACE_MISS_LIMIT}, and after ${MIN_BEFORE_STOP} questions you can stop
        yourself with "That's enough — start me here".</p>
      <p>Credited characters count as known — they open tiers, appear in Go deeper, and light up in sentences — but
        their first review is ${PLACED_REST}+ days away, spread out. The last few you got right before you started
        missing are the shakiest, so they come back within the week. Your next day is the same as everyone's: a few
        new characters, no pile of reviews. Retaking only ever adds.</p>`
  },
  {
    id: "deeper", k: "深入", title: "Go deeper", sub: "Practice on your whole library",
    body: () => `
      <p>Four tiles over everything you know: Reading, Writing, Build the word and Pronunciation. The Writing tile has
        a <b>1 char / 2 chars</b> switch under it — single characters, or whole two-character words drawn from memory.
        Each round is ${ROUND} questions.</p>
      <p>What a round draws on:</p>
      <ul>
        <li><b>${manPct(RECENT_SHARE)} recent</b> — from the last ${RECENT_WINDOW} characters you learned, because those are
          what's most at risk. The rest reaches back into older ones so the early stages don't fade.</li>
        <li><b>Least-seen first</b>, then weakest. Ordering by weakness alone would show the same stubborn character
          all evening while hundreds of others were never asked.</li>
      </ul>
      <p><b>The writing modes let you choose.</b> Tap Writing and you can pick exactly which characters to practise —
        grouped by the day you learned them, so "last Tuesday's five" is one tap. Up to ${FOCUS_ROUND} are played in a
        round; the choice is kept until you clear it. Leave it empty for the usual shakiest ${ROUND}.</p>
      <p>Go deeper never ticks anything off and never finishes; it's where repetition happens. See
        <a data-man="activities">What each activity does</a> for how it touches your schedule.</p>`
  },
  {
    id: "sprint", k: "速练", title: "Sprint and the mistake notebook", sub: "Timed sheets, 错字本 and repair rounds",
    body: () => `
      <p>Like the timed arithmetic sheets from primary school: a fixed number of questions in a fixed number of
        minutes. First, did you finish in time? Then, how many did you get right?</p>
      <ul>
        <li>${manHz("认读")} <b>Reading</b> — character to meaning.</li>
        <li>${manHz("默写")} <b>Writing</b> — meaning to character, either ${manHz("打字")} <b>typing</b> the pinyin the way you'd
          type Chinese on a phone (tones not needed, <code>nv</code> works for nǚ), or ${manHz("辨形")} <b>spotting</b> it
          among look-alikes.</li>
        <li>${manHz("听力")} <b>Listening</b> — sound to character.</li>
        <li>${manHz("组词")} <b>Build the word</b> — assemble a word from character tiles, against the clock.</li>
      </ul>
      <p>The board beside the sheets shows a chart with one axis per mode, your all-time top five and your latest
        runs. Each mode has its own par time per question, and your pace earns a grade: ${manHz("慢")} Steady, ${manHz("稳")} Even,
        ${manHz("快")} Quick, ${manHz("疾")} Fast, ${manHz("狂")} Furious. Each sheet — mode, count and minutes — keeps its own best.
        You can choose whether answers are marked as you go (${manHz("即时")}) or all at once when you hand it in
        (${manHz("交卷")}).</p>
      <h4>${manHz("错字本")} The mistake notebook</h4>
      <p>A character goes in when you miss it twice under time, or when it's a <a data-man="leeches">sticking
        point</a>. It comes out after <b>${SPRINT_CLEAR} right in a row</b>, wherever you get them. ${manHz("熟字")} lists
        the opposite: characters you've answered right five or more times running against the clock.</p>
      <p><b>Repair rounds</b> take ${REPAIR_SIZE} characters from the notebook and come at each from every side — read it,
        hear it, produce it from the meaning — untimed, to find which thread is loose.</p>`
  },
  {
    id: "writing", k: "写字", title: "Writing", sub: "Drills, writing out, the notebook and the trackpad",
    body: () => `
      <h4>${manHz("默写")} Writing drills</h4>
      <p>You draw the character stroke by stroke and each stroke is checked. You're allowed a few slips — one for every
        three strokes, so one for 大 and three for 学 — and the drill tells you how many before you start. How closely a
        stroke has to match is <b>Settings → Writing sensitivity</b>, from Strict to Forgiving.
        ${manKb("S")} shows the strokes (then "Now you try"); writing it after peeking still counts as practice but not
        toward ${manHz("笔顺")}. A miss never changes your review schedule.</p>
      <h4>${manHz("抄写")} Write them out</h4>
      <p>From Today's practice: every character you learned today, shuffled, five squares at a time, copying over a
        guide. Or a whole word you can write.</p>
      <h4>${manHz("练字")} The Write tab</h4>
      <p>A blank exercise book of ${manHz("米字格")} squares. Pick a character to trace from the panel (grouped by the day
        you learned it, or sorted by stage, alphabet or shakiness; search ignores tones), choose a pen and nib, and add
        rows when you fill the page. Choose a pen — pen, brush, pencil or marker — and a nib thickness. On a phone the
        notebook is one big box with <b>Add to page</b>. Nothing is checked. Pages can be saved to a <b>practice diary</b> by date and
        reopened later.</p>
      <h4>${manHz("触控")} Trackpad writing</h4>
      <p>On a laptop, ${manKb("T")} (or the 触控 button) turns the trackpad into a drawing surface: move your finger to move
        the brush, and hold ${manKb("space")} or tap to put ink down. ${manKb("Esc")} gets your cursor back. Settings can
        start it automatically in every writing box. Some browsers refuse it inside an embedded page — opening the app
        in its own tab fixes that.</p>`
  },
  {
    id: "menu", k: "菜单", title: "The menu", sub: "The Read a Menu side quest",
    body: () => `
      <p>A real restaurant menu, printed as one is. You learn <b>one character a day</b> from it; characters you know
        are inked in and the rest stay grey. Hover or tap any character for its reading and meaning.</p>
      <p>Characters actually printed on the menu come first, so each one lights up a dish you can see. As you
        progress the menu grows: dish names, then descriptions, then a specials board.</p>
      <p>The menu keeps its own books. Learning its character of the day doesn't touch your reviews, your daily goal
        or Today's list.</p>`
  },
  {
    id: "songs", k: "歌词", title: "Songs", sub: "Reading lyrics you choose",
    body: () => `
      <p>Paste in the lyrics of a song you like (the app can't ship lyrics — they're copyrighted — so it starts empty).
        Characters you know light up. Tap a character to open its card over the song; press and hold (or hover) for a
        quick reading and meaning. Songs can be edited, and sorted by newest, name, artist, length or how much you know. Nothing is quizzed
        or scheduled; it shows how much of the song you can read, and that number rises as you learn.</p>`
  },
  {
    id: "words", k: "词", title: "Flashcards and the word of the week", sub: "Reading beyond single characters",
    body: () => `
      <h4>Flashcards</h4>
      <p>Three decks: today's characters, all your characters, and <b>Words you can read</b> — every multi-character
        word whose characters are all yours, newest first, so it opens on what you've only just become able to read.
        The back names the parts (大 big + 人 person).</p>
      <p>${manKb("space")}: tap to hear it, tap twice for the next card, hold to peek at the back. ${manKb("←")} ${manKb("→")}
        move between cards. Flashcards aren't graded.</p>
      <h4>Word of the week ${manHz("每周一词")}</h4>
      <p>One real word from the interests you picked, usually built from characters well beyond where you are, with a
        note on where it comes from. The meaning stays hidden until you ask for it, so you can try working it out.
        In a festival week — Spring Festival, Mid-Autumn and others — a word for the festival takes its place. It's
        never a drill and never scheduled; it's there because it's interesting. Change your interests in
        <b>Settings → About you</b>.</p>`
  },
  {
    id: "library", k: "字库", title: "The Library, character cards and radicals", sub: "Looking things up",
    body: () => `
      <p>The <b>Library</b> holds every character, grouped by tier, with filters for due, learning, strong and not
        started, and by stage. Search matches characters, pinyin (tones optional — "shui" finds 水, "lv" finds 绿) and
        meanings.</p>
      <p>A <b>character card</b> has its reading, meaning, the parts it's built from, words and a sentence using it,
        stroke order, and your record with it. "Learn this one now" adds a character out of order (it joins Learned
        today); "Try writing" gives you a go at it.</p>
      <p><b>Radicals</b> teaches the common building blocks properly, each with the characters in your library that
        use it. Knowing ${manHz("氵")} is water makes a whole family of characters easier.</p>`
  },
  {
    id: "leeches", k: "难字", title: "Sticking points", sub: "Characters that won't stay",
    body: () => `
      <p>A character missed ${LEECH_MISSES} or more times, and at least as often as it's been right, is flagged as a
        sticking point. Another identical repetition rarely fixes one, so missing it says so and points you to its card
        — look at its parts, its words, where it comes from. Record lists them, and they go straight into the
        ${manHz("错字本")} for a <a data-man="sprint">repair round</a>.</p>`
  },
  {
    id: "sound", k: "声音", title: "Sound", sub: "Where the voice comes from",
    body: () => `
      <p>Every character has a recorded clip, so sound works offline and without a Chinese voice installed. Words and
        sentences are read one character at a time from those clips — not natural connected speech, but every syllable
        is real. Only a character without a clip falls back to your system's voice, which Settings lets you pick and
        test.</p>
      <p>Browsers only allow sound after your first click on the page. If sound is off or blocked, the session bar
        says so and one tap fixes it.</p>`
  },
  {
    id: "keys", k: "键盘", title: "Keyboard shortcuts", sub: "For studying on a laptop",
    body: () => `
      <table class="man-table man-rules">
        <tr><th>Anywhere in a session</th><td>${manKb("1")}–${manKb("9")} answer · ${manKb("space")} or ${manKb("enter")} next ·
          ${manKb("esc")} leave</td></tr>
        <tr><th>Writing</th><td>${manKb("S")} show the strokes · ${manKb("T")} trackpad on/off · ${manKb("space")} ink (trackpad)</td></tr>
        <tr><th>Flashcards</th><td>${manKb("space")} tap hear · double-tap next · hold peek · ${manKb("←")} ${manKb("→")} move</td></tr>
        <tr><th>Find my level</th><td>${manKb("1")}–${manKb("4")} answer · ${manKb("space")} I don't know · ${manKb("enter")} start</td></tr>
      </table>
      <p>Answer buttons can sit in one row (matching 1-2-3-4 on the keyboard) or two by two (easier for a thumb) —
        <b>Settings → Answer buttons</b>.</p>`
  },
  {
    id: "data", k: "记录", title: "Your data", sub: "Where your progress lives, and how to keep it",
    body: () => `
      <ul>
        <li><b>It's stored in this browser</b>, so the app works instantly and offline. Clearing site data, or a private
          window, loses it.</li>
        <li><b>💾 Save</b> (top bar, or Settings) writes one file with your progress, streak and practice diary. The
          same screen loads it back, on this device or another.${state.lastBackup
            ? ` You last saved on ${esc(new Date(state.lastBackup).toLocaleDateString())}.` : " You haven't saved one yet."}</li>
        <li><b>Signing in</b>, where it's offered, keeps devices in step. Work done on either device is combined —
          a morning on the phone and an evening on the laptop both count — while settings follow whichever device
          changed them last.</li>
        <li><b>Reset everything</b> asks first, and can't be undone except from a saved file.</li>
        <li><b>Report a problem</b> copies out what the app currently believes, so someone can see what went wrong.</li>
      </ul>`
  },
  {
    id: "glossary", k: "词汇", title: "Chinese labels you'll see", sub: "A glossary of the app's own words",
    body: () => `
      <table class="man-table man-gloss">
        ${[
          ["今天", "jīntiān", "Today"], ["菜单", "càidān", "Menu"], ["歌词", "gēcí", "Lyrics — Songs"],
          ["速练", "sùliàn", "Speed practice — Sprint"], ["练字", "liànzì", "Practise characters — Write"],
          ["字库", "zìkù", "Character store — Library"], ["部首", "bùshǒu", "Radicals"], ["记录", "jìlù", "Record"],
          ["设置", "shèzhì", "Settings"], ["今日新字", "jīnrì xīn zì", "Today's new characters"],
          ["今日练习", "jīnrì liànxí", "Today's practice"], ["学习", "xuéxí", "Learn"], ["认读", "rèndú", "Recognise"],
          ["阅读", "yuèdú", "Read"], ["发音", "fāyīn", "Pronunciation"], ["听力", "tīnglì", "Listening"],
          ["抄写", "chāoxiě", "Copy out"], ["默写", "mòxiě", "Write from memory"], ["组词", "zǔcí", "Build a word"],
          ["笔顺", "bǐshùn", "Stroke order"], ["米字格", "mǐzìgé", "The practice grid with a 米 cross"],
          ["触控", "chùkòng", "Touch — trackpad writing"], ["错字本", "cuòzìběn", "Mistake notebook"],
          ["熟字", "shúzì", "Characters you know cold"], ["正", "zhèng", "The five-stroke tally mark"],
          ["快", "kuài", "Quick"], ["预备", "yùbèi", "Get ready"], ["打字", "dǎzì", "Type"], ["辨形", "biànxíng", "Tell shapes apart"],
          ["即时", "jíshí", "Straight away"], ["交卷", "jiāojuàn", "Hand in the paper"],
          ["基础 · 自读 · 流利", "jīchǔ · zìdú · liúlì", "Foundation · Independent · Fluent"],
          ["归", "guī", "Return — welcome back"], ["温故知新", "wēn gù zhī xīn", "Review the old to understand the new (Confucius)"],
          ["每周一词", "měi zhōu yī cí", "Word of the week"]
        ].map(([z, p, m]) => `<tr><td class="han">${z}</td><td class="pin">${p}</td><td>${m}</td></tr>`).join("")}
      </table>`
  },
  {
    id: "archive", k: "历程", title: "Every release so far", sub: "How the app got here, newest first",
    body: () => `
      <p>${RELEASES.length} releases since the first version on ${esc(new Date(RELEASES[RELEASES.length - 1].date + "T12:00")
        .toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }))}. Smaller fixes are folded into
        the release they came with.</p>
      ${RELEASES.map(releaseHtml).join("")}`
  },
  {
    id: "settings", k: "设置", title: "Settings, one by one", sub: "What each switch does",
    body: () => `
      <table class="man-table man-rules">
        <tr><th>Text size</th><td>Five steps from Default to Largest (160%). The text really gets bigger — buttons and
          spacing grow with it, titles grow more gently to stay on one line, and layouts re-flow to fit. Saved on this
          device only.</td></tr>
        <tr><th>New characters a day</th><td>${GOAL_MIN}–${GOAL_MAX}; you're on ${state.goalNew}. Reviews compound, so
          more isn't better.</td></tr>
        <tr><th>Question timer</th><td>The draining bar and the ${manHz("快")} badge. Running out never costs anything.</td></tr>
        <tr><th>Include writing drills</th><td>Whether handwriting appears in the daily session once a character reaches
          level 4. Go deeper's writing modes are always available.</td></tr>
        <tr><th>Writing sensitivity</th><td>How closely a drawn stroke has to match, in five steps from Strict to
          Forgiving. The middle is how it has always been.</td></tr>
        <tr><th>Answer buttons</th><td>One row, two by two, or let the window decide.</td></tr>
        <tr><th>Start the trackpad automatically</th><td>Arms trackpad writing in every writing box.</td></tr>
        <tr><th>Sound</th><td>On or off, and which system voice to fall back on.</td></tr>
        <tr><th>About you</th><td>Your name (used to greet you) and interests (used only for the word of the week —
          they never change what you're taught or when).</td></tr>
        <tr><th>Find my level</th><td>See <a data-man="placement">Find my level</a>.</td></tr>
        <tr><th>Show the tour again</th><td>The short walkthrough from your first visit.</td></tr>
      </table>`
  }
];

/* ---------- the sheet ---------- */

function openManual(section) {
  manualSeenBefore = state.seenNews || null;
  newsSeen();
  openSheet(`<span class="han">使用说明</span> How Hanzi Quest works`, `<div class="wrap"><div class="section manual">
    <button class="link-btn man-back" id="manBack">← Settings</button>
    <p class="note">Everything the app does and why, for when you want to know. None of it is needed to use the app —
      the daily session is enough. The numbers here are read live from the app, so they're always current.</p>
    <input class="man-find" id="manFind" type="search" placeholder="Search the manual — e.g. rest day, writing, level"
      aria-label="Search the manual" autocomplete="off">
    <nav class="man-toc" aria-label="Contents">${MANUAL.map(s =>
      `<a data-man="${s.id}"><span class="han">${s.k}</span> ${esc(s.title)}</a>`).join("")}</nav>
    <p class="note man-none" id="manNone" hidden>Nothing in the manual matches that.</p>
    ${MANUAL.map(s => `<details class="sheet man-sec" id="man-${s.id}">
      <summary><span class="han man-k">${s.k}</span><span class="man-t"><b>${esc(s.title)}</b><small>${esc(s.sub)}</small></span></summary>
      <div class="man-body">${s.body()}</div>
    </details>`).join("")}
  </div></div>`);

  const box = $("#svBody");
  $("#manBack").onclick = openSettings;
  /* every cross-reference, in the contents and in the text, opens its section */
  box.addEventListener("click", e => {
    const a = e.target.closest("[data-man]");
    if (!a) return;
    e.preventDefault();
    manualGo(a.dataset.man);
  });
  $("#manFind").addEventListener("input", e => manualFind(e.target.value));
  /* after the sheet has finished opening — a smooth scroll started during
     its transition is cancelled by it */
  if (section) setTimeout(() => manualGo(section, true), 300);
}

function manualGo(id, jump) {
  const d = $(`#man-${id}`);
  if (!d) return;
  d.hidden = false;
  d.open = true;
  d.scrollIntoView({ block: "start", behavior: jump ? "auto" : "smooth" });
}

/* Hide what doesn't match and open what does; an empty box puts it all back
   the way it was, closed. */
function manualFind(q) {
  const phrase = q.trim().toLowerCase().replace(/\s+/g, " ");
  const words = phrase.split(" ").filter(Boolean);
  const text = d => d.textContent.toLowerCase().replace(/\s+/g, " ");
  const secs = $$(".man-sec");
  /* "rest day" as a phrase first — every section has "rest" and "day" in it
     somewhere. Only if nothing has the phrase do the words go separately. */
  const asPhrase = secs.some(d => text(d).includes(phrase));
  let any = false;
  secs.forEach(d => {
    const t = text(d);
    const hit = !words.length || (asPhrase ? t.includes(phrase) : words.every(w => t.includes(w)));
    d.hidden = !hit;
    d.open = !!words.length && hit;
    any = any || hit;
  });
  $(".man-toc").hidden = !!words.length;
  $("#manNone").hidden = any;
}
