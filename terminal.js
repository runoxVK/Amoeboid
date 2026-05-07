/* ═══════════════════════════════════════════════════════
   REQUIEM — terminal.js
   The entire site lives here.
   ═══════════════════════════════════════════════════════ */

'use strict';

// ── DOM refs ──────────────────────────────────────────
const output   = document.getElementById('output');
const inputRow = document.getElementById('input-row');
const cmdInput = document.getElementById('cmd-input');

// ── State ─────────────────────────────────────────────
const history  = [];   // command history
let   histIdx  = -1;   // history navigation index
let   booting  = true; // true during intro sequence

// ── Helpers ───────────────────────────────────────────

/** Print one line to the terminal */
function line(text = '', cls = '') {
  const el = document.createElement('span');
  el.className = 'line' + (cls ? ' ' + cls : '');
  el.innerHTML = text;   // allows <a> tags inside content
  output.appendChild(el);
  scrollBottom();
  return el;
}

/** Print a blank gap line */
function gap() { line('', 'line-gap'); }

/** Scroll terminal to bottom */
function scrollBottom() {
  window.scrollTo(0, document.body.scrollHeight);
}

/** Print an echoed user command */
function echoCmd(cmd) {
  line(`runox@requiem:~$ ${cmd}`, 'line-echo');
}

/**
 * Print lines with a staggered delay.
 * lines: array of [text, className] or just strings
 * Returns a Promise that resolves when all lines are printed.
 */
function printLines(lines, baseDelay = 0, interval = 38) {
  return new Promise(resolve => {
    let i = 0;
    function next() {
      if (i >= lines.length) { resolve(); return; }
      const entry = lines[i];
      const [text, cls] = Array.isArray(entry) ? entry : [entry, ''];
      setTimeout(() => {
        line(text, cls);
        i++;
        next();
      }, i === 0 ? baseDelay : interval);
    }
    next();
  });
}

/** Typewriter effect for a single line */
function typewriter(text, cls = '', speed = 32) {
  return new Promise(resolve => {
    const el = line('', cls);
    let i = 0;
    function tick() {
      if (i > text.length) { resolve(); return; }
      el.textContent = text.slice(0, i);
      i++;
      setTimeout(tick, speed);
    }
    tick();
  });
}

/** Show the input row and focus */
function showInput() {
  inputRow.style.display = 'flex';
  cmdInput.focus();
  scrollBottom();
}

/** Hide the input row (during boot) */
function hideInput() {
  inputRow.style.display = 'none';
}

// ── Content data ──────────────────────────────────────

const ASCII_LOGO = [
  ' ██████╗ ███████╗ ██████╗ ██╗   ██╗██╗███████╗███╗   ███╗',
  ' ██╔══██╗██╔════╝██╔═══██╗██║   ██║██║██╔════╝████╗ ████║',
  ' ██████╔╝█████╗  ██║   ██║██║   ██║██║█████╗  ██╔████╔██║',
  ' ██╔══██╗██╔══╝  ██║▄▄ ██║██║   ██║██║██╔══╝  ██║╚██╔╝██║',
  ' ██║  ██║███████╗╚██████╔╝╚██████╔╝██║███████╗██║ ╚═╝ ██║',
  ' ╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚══════╝╚═╝     ╚═╝',
];

const HELP_TEXT = [
  ['', ''],
  ['  available commands', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['  whoami          ·  about runox', 'line-dim'],
  ['  projects        ·  things built & building', 'line-dim'],
  ['  art             ·  photography, music, other work', 'line-dim'],
  ['  consumption     ·  media log — anime, games, books & more', 'line-dim'],
  ['  now             ·  what i\'m currently doing', 'line-dim'],
  ['  links           ·  github, socials, contact', 'line-dim'],
  ['  help            ·  show this list', 'line-dim'],
  ['  clear           ·  clear the screen', 'line-dim'],
  ['', ''],
  ['  tip: use ↑ ↓ to navigate command history', 'line-muted'],
  ['', ''],
];

const WHOAMI_TEXT = [
  ['', ''],
  ['  RUNOX', 'line-bright'],
  ['  electrical engineer · game developer · world-builder · artist', 'line-dim'],
  ['', ''],
  // EDIT THIS — replace with your actual bio
  ['  I build things that live at the edge of hardware and imagination.', ''],
  ['  Circuits that do something clever. Games that pull you into worlds', ''],
  ['  I\'ve been constructing for years. Art that doesn\'t explain itself.', ''],
  ['', ''],
  ['  This place — REQUIEM — is my corner of the internet.', ''],
  ['  It only reveals itself to those who look.', 'line-dim'],
  ['  You found it. Welcome.', 'line-amber'],
  ['', ''],
  ['  currently based somewhere with too many open tabs.', 'line-muted'],
  // EDIT THIS — add your actual location or remove that line
  ['', ''],
];

const NOW_TEXT = [
  ['', ''],
  ['  // what i\'m doing right now', 'line-muted'],
  ['', ''],
  // EDIT THIS — update these with your actual current projects
  ['  ⚡  [EE project name] — working on the PCB layout', 'line-amber'],
  ['  🎮  [game name] — building the core loop', 'line-coral'],
  ['  🌍  [world name] — expanding the lore & geography', 'line-violet'],
  ['  📖  [book/manga you\'re reading] — reading', ''],
  ['  🎵  [album you\'re listening to] — on repeat', ''],
  ['', ''],
  ['  last updated: [month year]', 'line-muted'],
  ['', ''],
];

const PROJECTS_TEXT = [
  ['', ''],
  ['  // projects', 'line-muted'],
  ['  type a subcommand to explore:', 'line-dim'],
  ['', ''],
  ['  projects ee          ·  electrical engineering', 'line-dim'],
  ['  projects gamedev     ·  game development', 'line-dim'],
  ['  projects worldbuild  ·  world building', 'line-dim'],
  ['  projects misc        ·  miscellaneous', 'line-dim'],
  ['  projects legacy      ·  high school era', 'line-dim'],
  ['', ''],
];

const PROJECTS_EE = [
  ['', ''],
  ['  ⚡ ELECTRICAL ENGINEERING', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS — add your actual EE projects
  ['  [ PROJECT NAME ]', 'line-amber'],
  ['  status: in progress', 'line-dim'],
  ['  description of what this does and why it\'s interesting.', ''],
  ['  github → [url]', 'line-link'],
  ['', ''],
  ['  [ PROJECT NAME ]', 'line-amber'],
  ['  status: complete', 'line-dim'],
  ['  description of what this does and why it\'s interesting.', ''],
  ['  github → [url]', 'line-link'],
  ['', ''],
];

const PROJECTS_GAMEDEV = [
  ['', ''],
  ['  🎮 GAME DEVELOPMENT', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ GAME TITLE ]', 'line-coral'],
  ['  engine: [engine]  ·  genre: [genre]  ·  status: in progress', 'line-dim'],
  ['  what the game is about. what makes it interesting.', ''],
  ['  itch.io → [url]', 'line-link'],
  ['', ''],
];

const PROJECTS_WORLDBUILD = [
  ['', ''],
  ['  🌍 WORLD BUILDING', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ WORLD / SETTING NAME ]', 'line-violet'],
  ['  type: [fantasy / sci-fi / other]  ·  status: ongoing', 'line-dim'],
  ['  the core concept of this world. what makes it unique.', ''],
  ['  what questions it\'s trying to answer.', ''],
  ['  read more → [url or "document not yet public"]', 'line-link'],
  ['', ''],
];

const PROJECTS_MISC = [
  ['', ''],
  ['  ◈ MISCELLANEOUS', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ PROJECT NAME ]', 'line-bright'],
  ['  status: complete', 'line-dim'],
  ['  tools, experiments, scripts, weird ideas.', ''],
  ['  github → [url]', 'line-link'],
  ['', ''],
];

const PROJECTS_LEGACY = [
  ['', ''],
  ['  📼 LEGACY  //  high school era', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['  these are old. kept with pride, not embarrassment.', 'line-dim'],
  ['', ''],
  // EDIT THIS
  ['  [ OLD PROJECT ]', 'line-muted'],
  ['  year: [year]', 'line-muted'],
  ['  what it was. what you were figuring out at the time.', 'line-muted'],
  ['  view → [url]', 'line-link'],
  ['', ''],
];

const ART_TEXT = [
  ['', ''],
  ['  // art', 'line-muted'],
  ['  type a subcommand to explore:', 'line-dim'],
  ['', ''],
  ['  art photo    ·  photography', 'line-dim'],
  ['  art music    ·  music & releases', 'line-dim'],
  ['  art other    ·  other work', 'line-dim'],
  ['', ''],
];

const ART_PHOTO = [
  ['', ''],
  ['  📷 PHOTOGRAPHY', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [a short line about your photography — subjects, style, what draws you to it]', 'line-dim'],
  ['', ''],
  ['  gallery → [url or "coming soon"]', 'line-link'],
  ['', ''],
];

const ART_MUSIC = [
  ['', ''],
  ['  ♫ MUSIC', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS — add your actual releases
  ['  [ RELEASE / TRACK TITLE ]', 'line-amber'],
  ['  genre · year', 'line-dim'],
  ['  a note on this release. mood, process, what it was about.', ''],
  ['  listen → [url]', 'line-link'],
  ['', ''],
  ['  [ RELEASE / TRACK TITLE ]', 'line-amber'],
  ['  genre · year', 'line-dim'],
  ['  a note on this release.', ''],
  ['  listen → [url]', 'line-link'],
  ['', ''],
];

const ART_OTHER = [
  ['', ''],
  ['  ✦ OTHER WORK', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ WORK TITLE ]', 'line-bright'],
  ['  medium: [drawing / digital / writing / other]', 'line-dim'],
  ['  what it is. what drove you to make it.', ''],
  ['  view → [url]', 'line-link'],
  ['', ''],
];

const CONSUMPTION_TEXT = [
  ['', ''],
  ['  // consumption', 'line-muted'],
  ['  type a subcommand:', 'line-dim'],
  ['', ''],
  ['  consumption anime    ·  anime & manga', 'line-dim'],
  ['  consumption games    ·  video games', 'line-dim'],
  ['  consumption books    ·  books & novels', 'line-dim'],
  ['  consumption film     ·  movies & tv', 'line-dim'],
  ['  consumption music    ·  albums & artists', 'line-dim'],
  ['  consumption comics   ·  comics & webtoons', 'line-dim'],
  ['  consumption pods     ·  podcasts & youtube', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_ANIME = [
  ['', ''],
  ['  ◈ ANIME & MANGA', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS — add yours. status: watching / finished / reading / on hold
  ['  JoJo\'s Bizarre Adventure  [finished]', 'line-violet'],
  ['  parts 1–7. part 7 is the one.', 'line-dim'],
  ['', ''],
  ['  [ TITLE ]  [watching]', 'line-violet'],
  ['  a note on what it is or why you\'re watching it.', 'line-dim'],
  ['', ''],
  ['  [ TITLE ]  [reading]', 'line-violet'],
  ['  a note on what draws you to it.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_GAMES = [
  ['', ''],
  ['  ⬡ VIDEO GAMES', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ GAME TITLE ]  [all-time]', 'line-coral'],
  ['  a game that shaped how you think or see things.', 'line-dim'],
  ['', ''],
  ['  [ GAME TITLE ]  [playing]', 'line-coral'],
  ['  what it does differently.', 'line-dim'],
  ['', ''],
  ['  [ GAME TITLE ]  [finished]', 'line-coral'],
  ['  what it left behind.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_BOOKS = [
  ['', ''],
  ['  ▤ BOOKS', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ TITLE — AUTHOR ]  [finished]', 'line-amber'],
  ['  what stuck with you. one or two sentences.', 'line-dim'],
  ['', ''],
  ['  [ TITLE — AUTHOR ]  [reading]', 'line-amber'],
  ['  what drew you to it.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_FILM = [
  ['', ''],
  ['  ▶ MOVIES & TV', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ FILM TITLE ]  [watched]', 'line-green-mid'],
  ['  what it left behind. doesn\'t have to be a review.', 'line-dim'],
  ['', ''],
  ['  [ SHOW TITLE ]  [watching]', 'line-green-mid'],
  ['  what pulled you in. season you\'re on.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_MUSIC = [
  ['', ''],
  ['  ♪ MUSIC', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ ALBUM — ARTIST ]  [all-time]', 'line-bright'],
  ['  what this record is. genre if useful.', 'line-dim'],
  ['', ''],
  ['  [ ALBUM — ARTIST ]  [on repeat]', 'line-bright'],
  ['  current obsession.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_COMICS = [
  ['', ''],
  ['  ▦ COMICS & WEBTOONS', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ TITLE ]  [reading]', 'line-violet'],
  ['  what it\'s about. what draws you to it.', 'line-dim'],
  ['', ''],
];

const CONSUMPTION_PODS = [
  ['', ''],
  ['  ◉ PODCASTS & YOUTUBE', 'line-head'],
  ['  ─────────────────────────────────────────', 'line-muted'],
  ['', ''],
  // EDIT THIS
  ['  [ SHOW / CHANNEL ]  [podcast]  [following]', 'line-bright'],
  ['  what it covers. why you keep coming back.', 'line-dim'],
  ['', ''],
  ['  [ CHANNEL ]  [youtube]  [following]', 'line-bright'],
  ['  what it covers.', 'line-dim'],
  ['', ''],
];

const LINKS_TEXT = [
  ['', ''],
  ['  // find runox elsewhere', 'line-muted'],
  ['', ''],
  // EDIT THIS — replace the href="#" with your actual URLs
  ['  github    →  <a class="line-link" href="#" target="_blank" rel="noopener">github.com/[username]</a>', ''],
  ['  linkedin  →  <a class="line-link" href="#" target="_blank" rel="noopener">linkedin.com/in/[username]</a>', ''],
  ['  email     →  <a class="line-link" href="mailto:you@example.com">you@example.com</a>', ''],
  ['', ''],
];

// ── Boot sequence ─────────────────────────────────────

async function boot() {
  hideInput();

  // tiny pause before anything
  await delay(300);

  // ASCII logo
  for (const row of ASCII_LOGO) {
    line(row, 'line-ascii');
    await delay(18);
  }

  await delay(400);

  // system boot lines
  await printLines([
    ['', ''],
    ['initializing REQUIEM...', 'line-dim'],
  ], 0, 60);

  await delay(500);

  await printLines([
    ['system:  personal node of runox', 'line-dim'],
    ['status:  online', 'line-dim'],
    ['access:  public — you found it', 'line-dim'],
  ], 0, 90);

  await delay(700);

  // mysterious hook — typewriter for drama
  line('', '');
  await typewriter('this place does not show itself to everyone.', 'line-amber', 28);
  await delay(300);
  await typewriter('you sought it. here it is.', 'line-dim', 32);

  await delay(800);

  // command hint
  await printLines([
    ['', ''],
    ['type  help  to see what\'s here.', 'line-bright'],
    ['', ''],
  ], 0, 60);

  booting = false;
  showInput();
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Command router ────────────────────────────────────

function runCommand(raw) {
  const input = raw.trim().toLowerCase();
  if (!input) return;

  // save to history
  if (history[0] !== raw) history.unshift(raw);
  if (history.length > 50) history.pop();
  histIdx = -1;

  // echo the command
  gap();
  echoCmd(raw);

  const parts = input.split(/\s+/);
  const cmd   = parts[0];
  const sub   = parts[1] || '';

  switch (cmd) {

    case 'help':
      printLines(HELP_TEXT, 0, 20);
      break;

    case 'whoami':
    case 'about':
    case 'home':
      printLines(WHOAMI_TEXT, 0, 25);
      break;

    case 'now':
      printLines(NOW_TEXT, 0, 25);
      break;

    case 'links':
    case 'contact':
      printLines(LINKS_TEXT, 0, 30);
      break;

    case 'projects':
      switch (sub) {
        case 'ee':         printLines(PROJECTS_EE, 0, 20); break;
        case 'gamedev':    printLines(PROJECTS_GAMEDEV, 0, 20); break;
        case 'worldbuild': printLines(PROJECTS_WORLDBUILD, 0, 20); break;
        case 'misc':       printLines(PROJECTS_MISC, 0, 20); break;
        case 'legacy':     printLines(PROJECTS_LEGACY, 0, 20); break;
        default:           printLines(PROJECTS_TEXT, 0, 20);
      }
      break;

    case 'art':
      switch (sub) {
        case 'photo': printLines(ART_PHOTO, 0, 20); break;
        case 'music': printLines(ART_MUSIC, 0, 20); break;
        case 'other': printLines(ART_OTHER, 0, 20); break;
        default:      printLines(ART_TEXT, 0, 20);
      }
      break;

    case 'consumption':
      switch (sub) {
        case 'anime':  printLines(CONSUMPTION_ANIME, 0, 20); break;
        case 'games':  printLines(CONSUMPTION_GAMES, 0, 20); break;
        case 'books':  printLines(CONSUMPTION_BOOKS, 0, 20); break;
        case 'film':   printLines(CONSUMPTION_FILM, 0, 20); break;
        case 'music':  printLines(CONSUMPTION_MUSIC, 0, 20); break;
        case 'comics': printLines(CONSUMPTION_COMICS, 0, 20); break;
        case 'pods':   printLines(CONSUMPTION_PODS, 0, 20); break;
        default:       printLines(CONSUMPTION_TEXT, 0, 20);
      }
      break;

    case 'clear':
    case 'cls':
      output.innerHTML = '';
      break;

    case 'ls':
      // easter egg — feels natural for anyone with terminal experience
      printLines([
        ['', ''],
        ['  whoami/   projects/   art/   consumption/   now/   links/', 'line-dim'],
        ['', ''],
      ], 0, 20);
      break;

    case 'cd':
      // polite redirect
      if (sub) {
        printLines([
          ['', ''],
          [`  navigating to ${sub}...`, 'line-dim'],
          ['', ''],
        ], 0, 30).then(() => runCommand(sub));
      } else {
        line('', '');
        line('  cd: no destination given. try  help', 'line-error');
        line('', '');
      }
      break;

    case 'sudo':
      printLines([
        ['', ''],
        ['  nice try.', 'line-amber'],
        ['', ''],
      ], 0, 60);
      break;

    case 'exit':
    case 'quit':
      printLines([
        ['', ''],
        ['  there is no leaving REQUIEM.', 'line-violet'],
        ['  (close the tab if you must.)', 'line-dim'],
        ['', ''],
      ], 0, 60);
      break;

    case 'hello':
    case 'hi':
      printLines([
        ['', ''],
        ['  hey. you made it.', 'line-amber'],
        ['', ''],
      ], 0, 60);
      break;

    default:
      line('', '');
      line(`  command not found: ${cmd}. type  help  for a list.`, 'line-error');
      line('', '');
  }
}

// ── Input handling ────────────────────────────────────

cmdInput.addEventListener('keydown', e => {
  if (booting) return;

  if (e.key === 'Enter') {
    const val = cmdInput.value;
    cmdInput.value = '';
    runCommand(val);
    return;
  }

  // history navigation
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx < history.length - 1) {
      histIdx++;
      cmdInput.value = history[histIdx];
      // move cursor to end
      setTimeout(() => cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length), 0);
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) {
      histIdx--;
      cmdInput.value = history[histIdx];
    } else {
      histIdx = -1;
      cmdInput.value = '';
    }
    return;
  }

  // tab completion — basic
  if (e.key === 'Tab') {
    e.preventDefault();
    const val = cmdInput.value.trim().toLowerCase();
    const completions = [
      'whoami', 'projects', 'projects ee', 'projects gamedev',
      'projects worldbuild', 'projects misc', 'projects legacy',
      'art', 'art photo', 'art music', 'art other',
      'consumption', 'consumption anime', 'consumption games',
      'consumption books', 'consumption film', 'consumption music',
      'consumption comics', 'consumption pods',
      'now', 'links', 'help', 'clear',
    ];
    const match = completions.find(c => c.startsWith(val) && c !== val);
    if (match) cmdInput.value = match;
  }
});

// clicking anywhere on the page focuses the input
document.addEventListener('click', () => {
  if (!booting) cmdInput.focus();
});

// ── Start ─────────────────────────────────────────────
boot();
