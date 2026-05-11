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

// Detect base path automatically — works for localhost and any GitHub Pages repo name
const BASE = location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '');

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
function openPdfWindow(title, pdfPath) {
  var offset = (document.querySelectorAll('.retro-window').length % 6) * 28;
  var startX = 60 + offset;
  var startY = 60 + offset;

  var win = document.createElement('div');
  win.className = 'retro-window';
  win.style.left   = startX + 'px';
  win.style.top    = startY + 'px';
  win.style.width  = '720px';
  win.style.height = '90vh';
  win.style.zIndex = ++zTop;

  // title bar
  var bar = document.createElement('div');
  bar.className = 'retro-titlebar';

  var barTitle = document.createElement('span');
  barTitle.className = 'retro-titlebar-title';
  barTitle.textContent = title + '.pdf';

  var barBtns = document.createElement('div');
  barBtns.className = 'retro-titlebar-btns';

  var isMaximized = false;
  var savedStyle  = {};

  var btnMax = document.createElement('button');
  btnMax.className = 'retro-btn retro-btn-min';
  btnMax.title = 'Maximize';
  btnMax.textContent = '□';
  btnMax.addEventListener('click', function() {
    if (!isMaximized) {
      savedStyle = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      win.style.left = '0px'; win.style.top = '0px';
      win.style.width = '100vw'; win.style.height = '100vh';
      win.style.zIndex = ++zTop;
      btnMax.textContent = '❐'; btnMax.title = 'Restore';
      isMaximized = true;
    } else {
      win.style.left = savedStyle.left || '60px'; win.style.top = savedStyle.top || '60px';
      win.style.width = savedStyle.width || '720px'; win.style.height = savedStyle.height || '90vh';
      btnMax.textContent = '□'; btnMax.title = 'Maximize';
      isMaximized = false;
    }
  });

  var btnClose = document.createElement('button');
  btnClose.className = 'retro-btn retro-btn-close';
  btnClose.title = 'Close';
  btnClose.textContent = '✕';
  btnClose.addEventListener('click', function() { win.remove(); cmdInput.focus(); });

  barBtns.appendChild(btnMax);
  barBtns.appendChild(btnClose);
  bar.appendChild(barTitle);
  bar.appendChild(barBtns);

  // pdf embed
  var embed = document.createElement('iframe');
  embed.src = BASE + '/' + pdfPath + '#toolbar=1&view=FitH';
  embed.style.cssText = 'flex:1;width:100%;border:none;background:#060a06;';

  // drag
  var dragging = false, dragOffX = 0, dragOffY = 0;
  bar.addEventListener('mousedown', function(e) {
    if (e.target === btnMax || e.target === btnClose) return;
    if (isMaximized) return;
    dragging = true;
    dragOffX = e.clientX - win.getBoundingClientRect().left;
    dragOffY = e.clientY - win.getBoundingClientRect().top;
    win.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    win.style.left = Math.max(0, e.clientX - dragOffX) + 'px';
    win.style.top  = Math.max(0, e.clientY - dragOffY) + 'px';
  });
  document.addEventListener('mouseup', function() { if (dragging) { dragging = false; win.style.userSelect = ''; } });

  win.addEventListener('mousedown', function() { win.style.zIndex = ++zTop; });
  win.appendChild(bar);
  win.appendChild(embed);
  document.body.appendChild(win);
}

function openWindow(title, markdown) {
  // base path handled by global BASE constant

  var html = marked.parse(stripObsidian(markdown));

  // Convert YouTube links to embedded players
  html = html.replace(
    /(?:<a[^>]*href=")?https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^"<\s]*)(?:"[^>]*>[^<]*<\/a>)?/g,
    function(_, videoId) {
      return '<div style="position:relative;padding-bottom:56.25%;height:0;margin:0.75rem 0;">' +
        '<iframe src="https://www.youtube.com/embed/' + videoId + '" ' +
        'style="position:absolute;top:0;left:0;width:100%;height:100%;border:1px solid rgba(168,255,120,0.15);" ' +
        'allowfullscreen loading="lazy"></iframe></div>';
    }
  );

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
  var isMaximized = false;
  var savedStyle  = {};

  var btnMin = document.createElement('button');
  btnMin.className = 'retro-btn retro-btn-min';
  btnMin.title = 'Maximize';
  btnMin.textContent = '□';
  btnMin.addEventListener('click', function() {
    if (!isMaximized) {
      savedStyle = {
        left:   win.style.left,
        top:    win.style.top,
        width:  win.style.width,
        height: win.style.height,
      };
      win.style.left   = '0px';
      win.style.top    = '0px';
      win.style.width  = '100vw';
      win.style.height = '100vh';
      win.style.zIndex = ++zTop;
      btnMin.textContent = '❐';
      btnMin.title = 'Restore';
      isMaximized = true;
    } else {
      win.style.left   = savedStyle.left   || '60px';
      win.style.top    = savedStyle.top    || '60px';
      win.style.width  = savedStyle.width  || '640px';
      win.style.height = savedStyle.height || '480px';
      btnMin.textContent = '□';
      btnMin.title = 'Maximize';
      isMaximized = false;
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
    if (isMaximized) return;
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
  // base path handled by global BASE constant

  gap();
  entries.forEach(function(entry, i) {
    var card = document.createElement('div');
    card.className = 'entry-card';

    card.addEventListener('mouseenter', function() { card.classList.add('entry-card-hover'); });
    card.addEventListener('mouseleave', function() { card.classList.remove('entry-card-hover'); });
    card.addEventListener('click', function() {
      if (entry.pdf) {
        openPdfWindow(entry.title, entry.pdf);
      } else {
        openWindow(entry.title, entry.body);
      }
    });

    // thumbnail
    var thumb = document.createElement('div');
    thumb.className = 'entry-thumb';
    if (entry.thumbnail) {
      var img = document.createElement('img');
      img.src = BASE + '/' + entry.thumbnail;
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
  vomit: {
    subsections: {
      ee:         { label: 'Electrical Engineering', icon: 'EE',    cls: 'amber'  },
      gamedev:    { label: 'Game Development',        icon: 'GAME',  cls: 'coral'  },
      worldbuild: { label: 'World Building',          icon: 'WORLD', cls: 'violet' },
      misc:       { label: 'Miscellaneous',           icon: 'MISC',  cls: 'bright' },
      legacy:     { label: 'Legacy // high school',   icon: 'OLD',   cls: 'muted'  },
    },
  },
  digestion: {
    subsections: {
      photo:     { label: 'Photography', icon: 'PHO', cls: 'coral'  },
      music:     { label: 'Music',       icon: 'MUS', cls: 'amber'  },
      other:     { label: 'Other Work',  icon: 'ETC', cls: 'bright' },
      knowledge: { label: 'Knowledge',   icon: 'DOC', cls: 'violet' },
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

// ── Sound effects ─────────────────────────────────────
function playSound(section) {
  var sounds = ['vomit', 'consumption', 'digestion'];
  if (sounds.indexOf(section) === -1) return;
  try {
    var audio = new Audio(BASE + '/assets/sounds/' + section + '.mp3');
    audio.volume = 0.6;
    audio.play().catch(function() {}); // silently ignore autoplay blocks
  } catch(_) {}
}

function subsectionMenu(sectionKey) {
  playSound(sectionKey);
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
  playSound(sectionKey);
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
  ['  vomit            .  projects & things built', 'dim'],
  ['  digestion        .  photography, music & art', 'dim'],
  ['  consumption      .  media log', 'dim'],
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
  // base path handled by global BASE constant
  try {
    var res = await fetch(BASE + '/content.json');
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
      var e = lastEntries[idx];
      if (e.pdf) { openPdfWindow(e.title, e.pdf); } else { openWindow(e.title, e.body); }
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
    case 'vomit':
      sub && SECTION_META.vomit.subsections[sub]
        ? showSubsection('vomit', sub)
        : sub
          ? (line('', ''), line('  unknown subcommand: ' + sub + '. try: vomit', 'error'), line('', ''))
          : printLines(subsectionMenu('vomit'));
      break;
    case 'digestion':
      sub && SECTION_META.digestion.subsections[sub]
        ? showSubsection('digestion', sub)
        : sub
          ? (line('', ''), line('  unknown subcommand: ' + sub + '. try: digestion', 'error'), line('', ''))
          : printLines(subsectionMenu('digestion'));
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
      'vomit', 'vomit ee', 'vomit gamedev',
      'vomit worldbuild', 'vomit misc', 'vomit legacy',
      'digestion', 'digestion photo', 'digestion music', 'digestion other', 'digestion knowledge',
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