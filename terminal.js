/* ═══════════════════════════════════════════════════════
   AMOEBOID — terminal.js
   ═══════════════════════════════════════════════════════ */
'use strict';

// ── DOM refs ──────────────────────────────────────────
const output   = document.getElementById('output');
const inputRow = document.getElementById('input-row');
const cmdInput = document.getElementById('cmd-input');

// ── State ─────────────────────────────────────────────
let CONTENT      = null;
const cmdHistory = [];
let histIdx      = -1;
let booting      = true;
let lastEntries  = [];
let zTop         = 100;

// ── Helpers ───────────────────────────────────────────
function line(text, cls) {
  cls = cls || '';
  const el = document.createElement('span');
  el.className = 'line' + (cls ? ' line-' + cls : '');
  el.innerHTML = text || '';
  output.appendChild(el);
  scrollBottom();
  return el;
}
function gap() { line('', ''); }
function scrollBottom() { window.scrollTo(0, document.body.scrollHeight); }
function echoCmd(cmd) { line('runox@amoeboid:~$ ' + cmd, 'echo'); }
function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function printLines(lines, interval) {
  interval = interval || 20;
  return new Promise(function(resolve) {
    var i = 0;
    function next() {
      if (i >= lines.length) { resolve(); return; }
      var entry = lines[i];
      var text = Array.isArray(entry) ? entry[0] : entry;
      var cls  = Array.isArray(entry) ? entry[1] : '';
      setTimeout(function() { line(text, cls); i++; next(); }, interval);
    }
    next();
  });
}

function typewriter(text, cls, speed) {
  cls   = cls   || '';
  speed = speed || 28;
  return new Promise(function(resolve) {
    var el = line('', cls);
    var i  = 0;
    function tick() {
      if (i > text.length) { resolve(); return; }
      el.textContent = text.slice(0, i++);
      setTimeout(tick, speed);
    }
    tick();
  });
}

function showInput() {
  inputRow.style.display = 'flex';
  cmdInput.focus();
  scrollBottom();
}

// ── Markdown helpers ──────────────────────────────────
function stripObsidian(text) {
  return text
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[[^\]]*#([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

// ── Window manager ────────────────────────────────────
function openWindow(title, markdown) {
  var base = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '' : '/PersonalSiteVK';

  var html = marked.parse(stripObsidian(markdown));

  // starting position — staggered so windows don't stack exactly
  var offset = (document.querySelectorAll('.retro-window').length % 6) * 28;
  var startX = 60 + offset;
  var startY = 60 + offset;

  var win = document.createElement('div');
  win.className = 'retro-window';
  win.style.left = startX + 'px';
  win.style.top  = startY + 'px';
  win.style.zIndex = ++zTop;

  // ── title bar ──
  var bar = document.createElement('div');
  bar.className = 'retro-titlebar';

  var barTitle = document.createElement('span');
  barTitle.className = 'retro-titlebar-title';
  barTitle.textContent = title + '.md';

  var barBtns = document.createElement('div');
  barBtns.className = 'retro-titlebar-btns';

  // minimize
  var btnMin = document.createElement('button');
  btnMin.className = 'retro-btn retro-btn-min';
  btnMin.title = 'Minimize';
  btnMin.textContent = '─';
  btnMin.addEventListener('click', function() {
    var body = win.querySelector('.retro-body');
    var resizer = win.querySelector('.retro-resizer');
    if (body.style.display === 'none') {
      body.style.display = '';
      if (resizer) resizer.style.display = '';
      btnMin.textContent = '─';
    } else {
      body.style.display = 'none';
      if (resizer) resizer.style.display = 'none';
      btnMin.textContent = '□';
    }
  });

  // close
  var btnClose = document.createElement('button');
  btnClose.className = 'retro-btn retro-btn-close';
  btnClose.title = 'Close';
  btnClose.textContent = '✕';
  btnClose.addEventListener('click', function() {
    win.remove();
    cmdInput.focus();
  });

  barBtns.appendChild(btnMin);
  barBtns.appendChild(btnClose);
  bar.appendChild(barTitle);
  bar.appendChild(barBtns);

  // ── body ──
  var body = document.createElement('div');
  body.className = 'retro-body';
  body.innerHTML = html;

  // ── resize handle ──
  var resizer = document.createElement('div');
  resizer.className = 'retro-resizer';

  win.appendChild(bar);
  win.appendChild(body);
  win.appendChild(resizer);
  document.body.appendChild(win);

  // bring to front on click
  win.addEventListener('mousedown', function() {
    win.style.zIndex = ++zTop;
  });

  // ── drag ──
  var dragging = false;
  var dragOffX = 0, dragOffY = 0;

  bar.addEventListener('mousedown', function(e) {
    if (e.target === btnMin || e.target === btnClose) return;
    dragging = true;
    dragOffX = e.clientX - win.getBoundingClientRect().left;
    dragOffY = e.clientY - win.getBoundingClientRect().top;
    win.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var nx = e.clientX - dragOffX;
    var ny = e.clientY - dragOffY;
    win.style.left = Math.max(0, nx) + 'px';
    win.style.top  = Math.max(0, ny) + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; win.style.userSelect = ''; }
  });

  // ── resize ──
  var resizing = false;
  var resStartX, resStartY, resStartW, resStartH;

  resizer.addEventListener('mousedown', function(e) {
    resizing  = true;
    resStartX = e.clientX;
    resStartY = e.clientY;
    resStartW = win.offsetWidth;
    resStartH = win.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', function(e) {
    if (!resizing) return;
    var nw = Math.max(320, resStartW + (e.clientX - resStartX));
    var nh = Math.max(200, resStartH + (e.clientY - resStartY));
    win.style.width  = nw + 'px';
    win.style.height = nh + 'px';
  });

  document.addEventListener('mouseup', function() {
    resizing = false;
  });
}

// ── Entry cards ───────────────────────────────────────
function renderEntries(entries, titleCls) {
  titleCls = titleCls || 'amber';

  if (!entries || entries.length === 0) {
    line('  no entries yet. drop a .md file in the folder and run build.js.', 'muted');
    gap();
    return;
  }

  lastEntries = entries;
  var base = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '' : '/PersonalSiteVK';

  gap();
  entries.forEach(function(entry, i) {
    var card = document.createElement('div');
    card.className = 'entry-card';

    card.addEventListener('mouseenter', function() { card.classList.add('entry-card-hover'); });
    card.addEventListener('mouseleave', function() { card.classList.remove('entry-card-hover'); });
    card.addEventListener('click', function() { openWindow(entry.title, entry.body); });

    // thumbnail
    var thumb = document.createElement('div');
    thumb.className = 'entry-thumb';
    if (entry.thumbnail) {
      var img = document.createElement('img');
      img.src = base + '/' + entry.thumbnail;
      img.alt = entry.title;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() { thumb.textContent = (i + 1); };
      thumb.appendChild(img);
    } else {
      thumb.textContent = (i + 1);
    }

    // info
    var info = document.createElement('div');
    info.className = 'entry-info';

    var titleEl = document.createElement('span');
    titleEl.className = 'entry-title';
    titleEl.textContent = '[' + (i + 1) + '] ' + entry.title;

    var descEl = document.createElement('span');
    descEl.className = 'entry-desc';
    descEl.textContent = entry.description || 'click to open →';

    info.appendChild(titleEl);
    info.appendChild(descEl);
    card.appendChild(thumb);
    card.appendChild(info);
    output.appendChild(card);
    scrollBottom();
  });

  gap();
  line('  click a card or type its number to open', 'muted');
  gap();
}

// ── Section metadata ──────────────────────────────────
const SECTION_META = {
  projects: {
    subsections: {
      ee:         { label: 'Electrical Engineering', icon: 'EE',    cls: 'amber'  },
      gamedev:    { label: 'Game Development',        icon: 'GAME',  cls: 'coral'  },
      worldbuild: { label: 'World Building',          icon: 'WORLD', cls: 'violet' },
      misc:       { label: 'Miscellaneous',           icon: 'MISC',  cls: 'bright' },
      legacy:     { label: 'Legacy // high school',   icon: 'OLD',   cls: 'muted'  },
    },
  },
  art: {
    subsections: {
      photo: { label: 'Photography', icon: 'PHO', cls: 'coral'  },
      music: { label: 'Music',       icon: 'MUS', cls: 'amber'  },
      other: { label: 'Other Work',  icon: 'ETC', cls: 'bright' },
    },
  },
  consumption: {
    subsections: {
      games: { label: 'Video Games', icon: 'GAM', cls: 'coral'  },
      media: { label: 'Media',       icon: 'MED', cls: 'violet' },
      music: { label: 'Music',       icon: 'MUS', cls: 'amber'  },
    },
  },
};

function subsectionMenu(sectionKey) {
  var meta  = SECTION_META[sectionKey];
  var lines = [
    ['', ''],
    ['  // ' + sectionKey, 'muted'],
    ['  subcommands:', 'dim'],
    ['', ''],
  ];
  Object.entries(meta.subsections).forEach(function(pair) {
    var sub  = pair[0];
    var info = pair[1];
    var cmd  = sectionKey + ' ' + sub;
    lines.push(['  ' + cmd.padEnd(28) + info.label, 'dim']);
  });
  lines.push(['', '']);
  return lines;
}

function showSubsection(sectionKey, subKey) {
  var meta = SECTION_META[sectionKey] && SECTION_META[sectionKey].subsections[subKey];
  if (!meta) {
    printLines([['', ''], ['  unknown subcommand. try: ' + sectionKey, 'error'], ['', '']]);
    return;
  }
  var entries = (CONTENT && CONTENT[sectionKey] && CONTENT[sectionKey][subKey]) || [];
  printLines([
    ['', ''],
    ['  [ ' + meta.icon + ' ]  ' + meta.label.toUpperCase(), 'head'],
    ['  ─────────────────────────────────────────', 'muted'],
  ]).then(function() {
    renderEntries(entries, meta.cls || 'amber');
  });
}

// ── Static content ────────────────────────────────────
var ASCII_LOGO = [
  '  █████╗ ███╗   ███╗ ██████╗ ███████╗██████╗  ██████╗ ██╗██████╗ ',
  ' ██╔══██╗████╗ ████║██╔═══██╗██╔════╝██╔══██╗██╔═══██╗██║██╔══██╗',
  ' ███████║██╔████╔██║██║   ██║█████╗  ██████╔╝██║   ██║██║██║  ██║',
  ' ██╔══██║██║╚██╔╝██║██║   ██║██╔══╝  ██╔══██╗██║   ██║██║██║  ██║',
  ' ██║  ██║██║ ╚═╝ ██║╚██████╔╝███████╗██████╔╝╚██████╔╝██║██████╔╝',
  ' ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝╚═════╝ ',
];

var HELP_LINES = [
  ['', ''],
  ['  available commands', 'head'],
  ['  ─────────────────────────────────────────', 'muted'],
  ['  home             .  about runox', 'dim'],
  ['  projects         .  things built & building', 'dim'],
  ['  consumption      .  media log', 'dim'],
  ['  art              .  photography, music, other work', 'dim'],
  ['  help             .  show this list', 'dim'],
  ['  clear            .  clear the screen', 'dim'],
  ['', ''],
  ['  tip:  up/down  history    tab  autocomplete', 'muted'],
  ['', ''],
];

var HOME_DEFAULT = [
  ['', ''],
  ['  RUNOX', 'bright'],
  ['  electrical engineer . game developer . world-builder . artist', 'dim'],
  ['', ''],
  ['  I build things at the edge of hardware and imagination.', ''],
  ['  Circuits that do something clever. Games that pull you into worlds', ''],
  ["  I've been constructing for years. Art that doesn't explain itself.", ''],
  ['', ''],
  ['  This place -- AMOEBOID -- is my corner of the internet.', ''],
  ['  It only reveals itself to those who look.', 'dim'],
  ['  You found it. Welcome.', 'amber'],
  ['', ''],
  ['  (edit content/home/ to change this)', 'muted'],
  ['', ''],
];

function homeLines() {
  var entries = (CONTENT && CONTENT.home) || [];
  if (entries.length === 0) return HOME_DEFAULT;
  lastEntries = entries;
  var out = [['', '']];
  entries.forEach(function(entry, i) {
    out.push(['  [' + (i+1) + '] ' + entry.title, 'bright']);
  });
  out.push(['', '']);
  out.push(['  click or type number to open', 'muted']);
  out.push(['', '']);
  setTimeout(function() {
    var spans = Array.from(output.querySelectorAll('.line-bright')).slice(-entries.length);
    spans.forEach(function(el, i) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function() { openWindow(entries[i].title, entries[i].body); });
    });
  }, 200);
  return out;
}

// ── Boot ──────────────────────────────────────────────
async function boot() {
  var base = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '' : '/PersonalSiteVK';
  try {
    var res = await fetch(base + '/content.json');
    if (res.ok) CONTENT = await res.json();
  } catch(_) { CONTENT = {}; }

  await delay(200);
  for (var r of ASCII_LOGO) { line(r, 'ascii'); await delay(16); }
  await delay(350);
  await printLines([['', ''], ['initializing AMOEBOID...', 'dim']], 55);
  await delay(450);
  await printLines([
    ['system:  personal node of runox', 'dim'],
    ['status:  online', 'dim'],
    ['access:  public -- you found it', 'dim'],
  ], 80);
  await delay(650);
  line('', '');
  await typewriter('this place does not show itself to everyone.', 'amber', 26);
  await delay(250);
  await typewriter('you sought it. here it is.', 'dim', 30);
  await delay(700);
  await printLines([['', ''], ["type  help  to see what's here.", 'bright'], ['', '']], 55);
  booting = false;
  showInput();
}

// ── Command router ────────────────────────────────────
function runCommand(raw) {
  var input = raw.trim().toLowerCase();
  if (!input) return;
  if (cmdHistory[0] !== raw) cmdHistory.unshift(raw);
  if (cmdHistory.length > 50) cmdHistory.pop();
  histIdx = -1;
  gap();
  echoCmd(raw);

  var parts = input.split(/\s+/);
  var cmd   = parts[0];
  var sub   = parts[1] || '';

  if (/^\d+$/.test(cmd)) {
    var idx = parseInt(cmd, 10) - 1;
    if (lastEntries.length && lastEntries[idx]) {
      openWindow(lastEntries[idx].title, lastEntries[idx].body);
    } else {
      line('', '');
      line('  no entry ' + cmd + '. list a section first.', 'error');
      line('', '');
    }
    return;
  }

  switch (cmd) {
    case 'help':
      printLines(HELP_LINES);
      break;
    case 'home':
    case 'whoami':
      printLines(homeLines());
      break;
    case 'projects':
      sub && SECTION_META.projects.subsections[sub]
        ? showSubsection('projects', sub)
        : sub
          ? (line('', ''), line('  unknown subcommand: ' + sub + '. try: projects', 'error'), line('', ''))
          : printLines(subsectionMenu('projects'));
      break;
    case 'art':
      sub && SECTION_META.art.subsections[sub]
        ? showSubsection('art', sub)
        : sub
          ? (line('', ''), line('  unknown subcommand: ' + sub + '. try: art', 'error'), line('', ''))
          : printLines(subsectionMenu('art'));
      break;
    case 'consumption':
      sub && SECTION_META.consumption.subsections[sub]
        ? showSubsection('consumption', sub)
        : sub
          ? (line('', ''), line('  unknown subcommand: ' + sub + '. try: consumption', 'error'), line('', ''))
          : printLines(subsectionMenu('consumption'));
      break;
    case 'clear':
    case 'cls':
      output.innerHTML = '';
      break;
    default:
      line('', '');
      line('  command not found: ' + cmd + '. type  help  for a list.', 'error');
      line('', '');
  }
}

// ── Input handling ────────────────────────────────────
cmdInput.addEventListener('keydown', function(e) {
  if (booting) return;
  if (e.key === 'Enter') {
    var val = cmdInput.value;
    cmdInput.value = '';
    runCommand(val);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx < cmdHistory.length - 1) {
      histIdx++;
      cmdInput.value = cmdHistory[histIdx];
      setTimeout(function() { cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length); }, 0);
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) { histIdx--; cmdInput.value = cmdHistory[histIdx]; }
    else { histIdx = -1; cmdInput.value = ''; }
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    var val = cmdInput.value.trim().toLowerCase();
    var completions = [
      'home',
      'projects', 'projects ee', 'projects gamedev',
      'projects worldbuild', 'projects misc', 'projects legacy',
      'art', 'art photo', 'art music', 'art other',
      'consumption', 'consumption games', 'consumption media', 'consumption music',
      'help', 'clear',
    ];
    var match = completions.find(function(c) { return c.startsWith(val) && c !== val; });
    if (match) cmdInput.value = match;
  }
});

document.addEventListener('click', function(e) {
  if (!booting && !e.target.closest('.retro-window') && !e.target.closest('.entry-card')) {
    cmdInput.focus();
  }
});

boot();