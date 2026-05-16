/* ═══════════════════════════════════════════════════════
   AMOEBOID — terminal.js
   ═══════════════════════════════════════════════════════ */

'use strict';

// ── Base path ─────────────────────────────────────────
const BASE = location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '');

// ── State ─────────────────────────────────────────────
var CONTENT = null;
let zTop    = 100;
let history = [];
let histIdx = -1;
let lastEntries = [];

// ── DOM refs ──────────────────────────────────────────
const output   = document.getElementById('output');
const inputRow = document.getElementById('input-row');
const cmdInput = document.getElementById('cmd-input');

// ── Helpers ───────────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

function line(text, cls) {
  const d = el('div', 'line' + (cls ? ' line-' + cls : ''), text || '');
  output.appendChild(d);
  scrollDown();
}

function gap() { line('', 'gap'); }

function scrollDown() {
  const vp = document.getElementById('terminal-viewport');
  if (vp) vp.scrollTop = vp.scrollHeight;
}

function sound(name) {
  try {
    const a = new Audio(BASE + '/assets/sounds/' + name + '.mp3');
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch(_) {}
}

function clickSound() { sound('click'); }

/** Search worldbuild tree for a file by title or slug */
function findInTree(node, target) {
  const t = target.toLowerCase().replace(/[-_]/g, ' ');
  for (const file of node.files) {
    if (file.title.toLowerCase() === t || file.slug.toLowerCase().replace(/[-_]/g, ' ') === t)
      return file;
  }
  for (const sub of Object.values(node.folders)) {
    const found = findInTree(sub, target);
    if (found) return found;
  }
  return null;
}

// ── Markdown window ───────────────────────────────────
function openWindow(title, markdown) {
  let html = marked.parse(markdown);

  // YouTube embeds
  html = html.replace(
    /(?:<a[^>]*href=")?https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"<\s]*(?:"[^>]*>[^<]*<\/a>)?/g,
    (_, id) => `<div style="position:relative;padding-bottom:56.25%;height:0;margin:.75rem 0">
      <iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:1px solid rgba(120,232,255,0.15)"></iframe></div>`
  );

  makeWindow(title, w => {
    const body = el('div', 'retro-body');
    body.innerHTML = html;
    body.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    // wikilink handler
    body.querySelectorAll('.wikilink').forEach(span => {
      span.addEventListener('click', () => {
        const target = span.dataset.target;
        const tree   = CONTENT && CONTENT._worldbuildTree;
        if (!tree) return;
        const file = findInTree(tree, target);
        if (file) openWindow(file.title, file.body);
        else {
          span.style.color = 'var(--coral)';
          span.title = 'not found: ' + target;
        }
      });
    });
    w.appendChild(body);

    const resizer = el('div', 'retro-resizer');
    w.appendChild(resizer);
    addResize(w, resizer);
  });
}

function openPdfWindow(title, pdfPath) {
  makeWindow(title + '.pdf', w => {
    const iframe = document.createElement('iframe');
    iframe.src = BASE + '/' + pdfPath + '#toolbar=1&view=FitH';
    iframe.style.cssText = 'flex:1;width:100%;border:none;background:#04090c';
    w.appendChild(iframe);
  });
}

function makeWindow(title, fillFn) {
  const offset = (document.querySelectorAll('.retro-window').length % 6) * 28;
  const win = el('div', 'retro-window');
  win.style.cssText = `left:${60+offset}px;top:${60+offset}px;width:640px;height:480px;z-index:${++zTop}`;

  // title bar
  const bar = el('div', 'retro-titlebar');
  const titleEl = el('span', 'retro-titlebar-title', title);
  const btns = el('div', 'retro-titlebar-btns');

  let maximized = false, saved = {};

  const btnMax = el('button', 'retro-btn retro-btn-min', '□');
  btnMax.title = 'Maximize';
  btnMax.onclick = () => {
    if (!maximized) {
      saved = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      win.style.left   = '0';
      win.style.top    = '0';
      win.style.width  = '100vw';
      win.style.height = '100vh';
      win.style.zIndex = ++zTop;
      btnMax.textContent = '❐';
      btnMax.title = 'Restore';
      maximized = true;
    } else {
      win.style.left   = saved.left   || '60px';
      win.style.top    = saved.top    || '60px';
      win.style.width  = saved.width  || '640px';
      win.style.height = saved.height || '480px';
      btnMax.textContent = '□';
      btnMax.title = 'Maximize';
      maximized = false;
    }
  };

  const btnClose = el('button', 'retro-btn retro-btn-close', '✕');
  btnClose.title = 'Close';
  btnClose.onclick = () => { win.remove(); cmdInput.focus(); };

  btns.append(btnMax, btnClose);
  bar.append(titleEl, btns);
  win.appendChild(bar);

  fillFn(win);
  document.body.appendChild(win);

  // drag
  addDrag(win, bar, btnMax, btnClose, () => maximized);

  win.addEventListener('mousedown', () => win.style.zIndex = ++zTop);
  cmdInput.focus();
}

function addDrag(win, bar, btnMax, btnClose, isMax) {
  let dragging = false, ox = 0, oy = 0;
  bar.addEventListener('mousedown', e => {
    if (e.target === btnMax || e.target === btnClose || isMax()) return;
    dragging = true;
    ox = e.clientX - win.getBoundingClientRect().left;
    oy = e.clientY - win.getBoundingClientRect().top;
    win.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    win.style.left = Math.max(0, e.clientX - ox) + 'px';
    win.style.top  = Math.max(0, e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; win.style.userSelect = ''; });
}

function addResize(win, resizer) {
  let resizing = false, sx, sy, sw, sh;
  resizer.addEventListener('mousedown', e => {
    resizing = true; e.preventDefault();
    sx = e.clientX; sy = e.clientY;
    sw = win.offsetWidth; sh = win.offsetHeight;
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    win.style.width  = Math.max(320, sw + e.clientX - sx) + 'px';
    win.style.height = Math.max(200, sh + e.clientY - sy) + 'px';
  });
  document.addEventListener('mouseup', () => resizing = false);
}

// ── Entry card ────────────────────────────────────────
function makeCard(entry, index) {
  const card = el('div', 'entry-card');

  const thumb = el('div', 'entry-thumb');
  if (entry.thumbnail) {
    const img = document.createElement('img');
    img.src = BASE + '/' + entry.thumbnail;
    img.alt = entry.title;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    img.onerror = () => { thumb.textContent = index + 1; };
    thumb.appendChild(img);
  } else {
    thumb.textContent = index + 1;
  }

  const info = el('div', 'entry-info');
  info.appendChild(el('span', 'entry-title', `[${index+1}] ${entry.title}`));
  info.appendChild(el('span', 'entry-desc', entry.description || 'click to open →'));

  card.append(thumb, info);
  card.addEventListener('mouseenter', () => card.classList.add('entry-card-hover'));
  card.addEventListener('mouseleave', () => card.classList.remove('entry-card-hover'));
  card.addEventListener('click', () => entry.pdf ? openPdfWindow(entry.title, entry.pdf) : openWindow(entry.title, entry.body));

  return card;
}

// ── Photo lightbox ────────────────────────────────────
function openPhotoAlbum(album) {
  makeWindow(album.title, w => {
    w.style.width  = '780px';
    w.style.height = '580px';

    const wrap = el('div');
    wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;background:#000;position:relative;';

    // main image
    const img = document.createElement('img');
    img.style.cssText = 'flex:1;min-height:0;width:100%;object-fit:contain;display:block;';

    // counter
    const counter = el('div');
    counter.style.cssText = 'position:absolute;top:10px;right:12px;font-size:12px;color:rgba(255,255,255,0.5);pointer-events:none;';

    // prev/next buttons
    const btnPrev = el('button', '', '‹');
    const btnNext = el('button', '', '›');
    [btnPrev, btnNext].forEach(b => {
      b.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);border:1px solid rgba(64,255,96,0.2);color:rgba(64,255,96,0.8);font-size:28px;width:40px;height:60px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;border-radius:3px;';
    });
    btnPrev.style.left = '8px';
    btnNext.style.right = '8px';

    // thumbnail strip
    const strip = el('div');
    strip.style.cssText = 'display:flex;gap:4px;padding:6px;overflow-x:auto;background:#0a0a0a;flex-shrink:0;scrollbar-width:thin;';

    var idx = 0;
    var thumbEls = [];

    function show(i) {
      idx = (i + album.images.length) % album.images.length;
      img.src = BASE + '/' + album.images[idx];
      counter.textContent = (idx+1) + ' / ' + album.images.length;
      thumbEls.forEach((t, ti) => {
        t.style.outline = ti === idx ? '2px solid var(--green)' : '2px solid transparent';
      });
      // scroll thumb into view
      if (thumbEls[idx]) thumbEls[idx].scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
    }

    album.images.forEach((src, i) => {
      const t = document.createElement('img');
      t.src = BASE + '/' + src;
      t.style.cssText = 'width:60px;height:50px;object-fit:cover;cursor:pointer;flex-shrink:0;border-radius:2px;';
      t.addEventListener('click', () => show(i));
      strip.appendChild(t);
      thumbEls.push(t);
    });

    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));

    // keyboard nav when window is focused
    w.setAttribute('tabindex', '0');
    w.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { show(idx - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    });

    wrap.append(img, counter, btnPrev, btnNext);
    w.append(wrap, strip);
    show(0);
    setTimeout(() => w.focus(), 50);
  });
}

// ── Worldbuild tree window ────────────────────────────
function openWorldbuildWindow() {
  const tree = (CONTENT && CONTENT._worldbuildTree) || { files: [], folders: {} };
  makeWindow('worldbuild', w => {
    const container = el('div');
    container.style.cssText = 'flex:1;overflow-y:auto;padding:1rem;';
    renderTree(tree, container, 0);
    w.appendChild(container);
  });
}

function renderTree(node, parent, depth) {
  // files first
  node.files.forEach(file => {
    const row = el('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;margin:1px 0;cursor:pointer;border-radius:2px;padding-left:' + (12 + depth * 16) + 'px';
    row.innerHTML = '<span style="color:var(--green-mid);font-size:11px">◆</span>';
    const lbl = el('span', '', file.title);
    lbl.style.cssText = 'font-size:13px;color:var(--ink)';
    row.appendChild(lbl);
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(64,255,96,0.06)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', () => openWindow(file.title, file.body));
    parent.appendChild(row);
  });

  // then folders
  Object.entries(node.folders).forEach(([name, subtree]) => {
    const folder = el('div');
    folder.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;margin:1px 0;cursor:pointer;border-radius:2px;user-select:none;padding-left:' + (12 + depth * 16) + 'px';

    const arrow = el('span', '', '▶');
    arrow.style.cssText = 'font-size:9px;color:var(--green-mid);transition:transform 0.15s;width:10px;flex-shrink:0';
    const lbl = el('span', '', name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    lbl.style.cssText = 'font-size:13px;font-weight:600;color:var(--green-mid)';

    folder.append(arrow, lbl);

    const children = el('div');
    children.style.display = 'none';

    let open = false;
    folder.addEventListener('mouseenter', () => { folder.style.background = 'rgba(64,255,96,0.06)'; });
    folder.addEventListener('mouseleave', () => { folder.style.background = ''; });
    folder.addEventListener('click', () => {
      open = !open;
      arrow.style.transform = open ? 'rotate(90deg)' : '';
      children.style.display = open ? 'block' : 'none';
      if (open && !children.children.length) renderTree(subtree, children, depth + 1);
    });

    parent.appendChild(folder);
    parent.appendChild(children);
  });
}

// ── Accordion section ─────────────────────────────────
const SECTIONS = {
  vomit:       { subs: { ee: 'Electrical Engineering', gamedev: 'Game Development', worldbuild: 'World Building', misc: 'Miscellaneous', legacy: 'Legacy' } },
  digestion:   { subs: { photo: 'Photography', music: 'Music', other: 'Other Work', knowledge: 'Knowledge' } },
  consumption: { subs: { games: 'Video Games', media: 'Media', music: 'Music' } },
};

function showSection(key) {
  sound(key);
  const sec = SECTIONS[key];
  gap();
  line('  // ' + key, 'muted');
  line('  click a folder to expand', 'dim');
  gap();

  Object.entries(sec.subs).forEach(([subKey, label]) => {
    const entries = (CONTENT[key] && CONTENT[key][subKey]) || [];

    const folder = el('div');
    folder.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 14px;margin:2px 0;border:1px solid rgba(64,255,96,0.18);border-top:1px solid rgba(64,255,96,0.35);border-radius:3px;cursor:pointer;background:rgba(20,60,25,0.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);max-width:700px;user-select:none;box-shadow:inset 0 1px 0 rgba(64,255,96,0.08),0 0 12px rgba(40,200,64,0.06)';

    const arrow = el('span', '', '▶');
    arrow.style.cssText = 'font-size:10px;color:rgba(120,232,255,0.3);transition:transform 0.15s;width:12px;flex-shrink:0';

    const lbl = el('span', '', label.toUpperCase());
    lbl.style.cssText = 'font-family:inherit;font-size:13px;font-weight:600;color:var(--green-mid)';

    const count = el('span', '', key === 'vomit' && subKey === 'worldbuild' ? 'open explorer →' : entries.length + (entries.length === 1 ? ' entry' : ' entries'));
    count.style.cssText = 'font-size:11px;color:var(--muted);margin-left:auto';

    folder.append(arrow, lbl, count);

    const entriesEl = el('div');
    entriesEl.style.cssText = 'display:none;flex-direction:column;gap:4px;padding:4px 0 4px 14px';

    let open = false;

    folder.addEventListener('mouseenter', () => {
      folder.style.background = 'rgba(40,120,50,0.35)';
      folder.style.borderColor = 'rgba(64,255,96,0.5)';
      folder.style.boxShadow = 'inset 0 1px 0 rgba(64,255,96,0.15),0 0 18px rgba(40,200,64,0.15)';
    });
    folder.addEventListener('mouseleave', () => {
      folder.style.background = open ? 'rgba(30,80,35,0.30)' : 'rgba(20,60,25,0.25)';
      folder.style.borderColor = open ? 'rgba(64,255,96,0.4)' : 'rgba(64,255,96,0.18)';
      folder.style.boxShadow = 'inset 0 1px 0 rgba(64,255,96,0.08),0 0 12px rgba(40,200,64,0.06)';
    });

    folder.addEventListener('click', () => {
      // worldbuild opens a tree window instead
      if (key === 'vomit' && subKey === 'worldbuild') {
        clickSound();
        openWorldbuildWindow();
        return;
      }
      // photo opens album cards
      if (key === 'digestion' && subKey === 'photo') {
        open = !open;
        clickSound();
        arrow.style.transform = open ? 'rotate(90deg)' : '';
        arrow.style.color     = open ? 'var(--green)' : 'rgba(120,232,255,0.3)';
        lbl.style.color       = open ? 'var(--green)' : 'var(--green-mid)';
        folder.style.background  = open ? 'rgba(30,80,35,0.30)' : 'rgba(20,60,25,0.25)';
        folder.style.borderColor = open ? 'rgba(64,255,96,0.4)'  : 'rgba(64,255,96,0.18)';
        folder.style.boxShadow   = open ? 'inset 0 1px 0 rgba(64,255,96,0.12),0 0 20px rgba(40,200,64,0.12)' : 'inset 0 1px 0 rgba(64,255,96,0.08),0 0 12px rgba(40,200,64,0.06)';
        if (open && !entriesEl.children.length) {
          const albums = (CONTENT && CONTENT._photoAlbums) || [];
          if (!albums.length) {
            entriesEl.appendChild(el('div', '', 'no albums yet.'));
          } else {
            albums.forEach(album => {
              const card = el('div', 'entry-card');
              const thumb = el('div', 'entry-thumb');
              const img = document.createElement('img');
              img.src = BASE + '/' + album.cover;
              img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
              thumb.appendChild(img);
              const info = el('div', 'entry-info');
              info.appendChild(el('span', 'entry-title', album.title));
              info.appendChild(el('span', 'entry-desc', album.description || album.count + ' photos'));
              card.append(thumb, info);
              card.addEventListener('click', () => openPhotoAlbum(album));
              entriesEl.appendChild(card);
            });
          }
        }
        entriesEl.style.display = open ? 'flex' : 'none';
        scrollDown();
        return;
      }
      open = !open;
      clickSound();
      arrow.style.transform = open ? 'rotate(90deg)' : '';
      arrow.style.color     = open ? 'var(--green)' : 'rgba(120,232,255,0.3)';
      lbl.style.color       = open ? 'var(--green)' : 'var(--green-mid)';
      folder.style.background  = open ? 'rgba(30,80,35,0.30)' : 'rgba(20,60,25,0.25)';
      folder.style.borderColor = open ? 'rgba(64,255,96,0.4)'  : 'rgba(64,255,96,0.18)';
      folder.style.boxShadow   = open ? 'inset 0 1px 0 rgba(64,255,96,0.12),0 0 20px rgba(40,200,64,0.12)' : 'inset 0 1px 0 rgba(64,255,96,0.08),0 0 12px rgba(40,200,64,0.06)';

      if (open && !entriesEl.children.length) {
        if (!entries.length) {
          entriesEl.appendChild(el('div', '', 'no entries yet.'));
        } else {
          lastEntries = entries;
          entries.forEach((entry, i) => entriesEl.appendChild(makeCard(entry, i)));
        }
      }
      entriesEl.style.display = open ? 'flex' : 'none';
      scrollDown();
    });

    output.appendChild(folder);
    output.appendChild(entriesEl);
    scrollDown();
  });
  gap();
}

// ── Commands ──────────────────────────────────────────
function runCommand(raw) {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;

  line('runox@amoeboid:~$ ' + raw, 'echo');

  switch(cmd) {
    case 'home':
      gap();
      line('  // home', 'muted');
      gap();
      const homeEntries = CONTENT.home || [];
      homeEntries.forEach(entry => {
        line('  ' + entry.title, 'head');
        entry.body.split('\n').slice(0, 8).forEach(l => l.trim() && line('  ' + l.trim(), 'dim'));
        gap();
      });
      break;

    case 'vomit':
    case 'digestion':
    case 'consumption':
      showSection(cmd);
      break;

    case 'help':
      gap();
      line('  available commands', 'head');
      line('  ─────────────────────────────────────────', 'muted');
      line('  home             .  about', 'dim');
      line('  vomit            .  projects', 'dim');
      line('  digestion        .  art', 'dim');
      line('  consumption      .  media log', 'dim');
      line('  help             .  this list', 'dim');
      line('  clear            .  clear screen', 'dim');
      gap();
      line('  tip: up/down history   tab autocomplete', 'muted');
      gap();
      break;

    case 'clear':
      output.innerHTML = '';
      break;

    default:
      // number shortcut
      const n = parseInt(cmd);
      if (!isNaN(n) && n >= 1 && n <= lastEntries.length) {
        const e = lastEntries[n - 1];
        e.pdf ? openPdfWindow(e.title, e.pdf) : openWindow(e.title, e.body);
      } else {
        gap();
        line('  unknown command: ' + cmd + '. type help', 'error');
        gap();
      }
  }
}

// ── Input handling ────────────────────────────────────
cmdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = cmdInput.value;
    runCommand(val);
    if (val.trim()) { history.unshift(val); histIdx = -1; }
    cmdInput.value = '';
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx < history.length - 1) cmdInput.value = history[++histIdx];
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) cmdInput.value = history[--histIdx];
    else { histIdx = -1; cmdInput.value = ''; }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const cmds = ['home', 'vomit', 'digestion', 'consumption', 'help', 'clear'];
    const val  = cmdInput.value;
    const match = cmds.find(c => c.startsWith(val) && c !== val);
    if (match) cmdInput.value = match;
  }
});

// ── Boot ──────────────────────────────────────────────
async function boot() {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // title
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:Bombardier,monospace;font-size:clamp(2.2rem,5vw,3.8rem);color:var(--green-mid);letter-spacing:0.18em;line-height:1;padding:.5rem 0 .25rem 0;opacity:0;animation:fadein 0.3s forwards';
  titleEl.textContent = 'AMOEBOID';
  output.appendChild(titleEl);
  scrollDown();

  await delay(400);
  line('  initializing...', 'dim');
  await delay(300);

  try {
    const res = await fetch(BASE + '/content.json');
    CONTENT = await res.json();
  } catch(_) {
    CONTENT = { home: [], vomit: {}, digestion: {}, consumption: {} };
    line('  warning: could not load content.json', 'error');
  }

  line('  ready.', 'dim');
  await delay(200);
  gap();
  line('  type help for commands', 'muted');
  gap();

  inputRow.style.display = 'flex';
  cmdInput.focus();
}

boot();