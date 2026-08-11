/* ═══════════════════════════════════════════════════════
   templates.js — page shells and section layouts
   Design: manga-panel editorial. Ink, paper, magenta, gold.
   ═══════════════════════════════════════════════════════ */

'use strict';

const { escapeHtml } = require('./markdown');

const e = escapeHtml;

/** Path back to site root from a page at the given depth. */
function rel(depth) { return depth ? '../'.repeat(depth) : ''; }

function cls(...xs) { return xs.filter(Boolean).join(' '); }

/** Rewrite root-relative asset paths inside generated HTML for this page's depth. */
function reroot(html, depth) {
  if (!depth) return html;
  const p = rel(depth);
  return String(html).replace(/(src|href|srcset)="(assets\/)/g, `$1="${p}$2`);
}

// ── Small pieces ──────────────────────────────────────

function kicker(text, tone) {
  return `<p class="kicker${tone ? ' kicker--' + tone : ''}">${e(text)}</p>`;
}

function chips(items, tone) {
  if (!items || !items.length) return '';
  return `<ul class="chips">${items.map(t =>
    `<li class="chip${tone ? ' chip--' + tone : ''}">${e(t)}</li>`).join('')}</ul>`;
}

const LINK_ICON = {
  github: '↗', itch: '↗', video: '▶', spotify: '♪', instagram: '◎', link: '↗',
};

function linkButtons(links) {
  if (!links || !links.length) return '';
  return `<div class="linkrow">${links.map(l =>
    `<a class="btn btn--${e(l.kind)}" href="${e(l.url)}" target="_blank" rel="noopener noreferrer">
       <span class="btn__icon" aria-hidden="true">${LINK_ICON[l.kind] || '↗'}</span>${e(l.label)}</a>`
  ).join('')}</div>`;
}

function specTable(specs) {
  if (!specs || !specs.length) return '';
  return `<dl class="spec">${specs.map(s =>
    `<div class="spec__row"><dt>${e(s.key)}</dt><dd>${e(s.value)}</dd></div>`).join('')}</dl>`;
}

/** The rotating chapter number badge that appears on every panel header. */
function badge(num) {
  return `<span class="badge" aria-hidden="true">${e(num)}</span>`;
}

function chapterHead({ num, title, lede, tone }) {
  return `<header class="chead ${tone ? 'chead--' + tone : ''}">
    <div class="chead__num" aria-hidden="true">${e(num)}</div>
    <div class="chead__body">
      <p class="kicker">Chapter ${e(num)}</p>
      <h1 class="chead__title">${e(title)}</h1>
      ${lede ? `<p class="chead__lede">${e(lede)}</p>` : ''}
    </div>
    <div class="chead__menacing" aria-hidden="true">ゴゴゴ</div>
  </header>`;
}

function empty(msg) {
  return `<div class="panel empty halftone"><p>${e(msg)}</p></div>`;
}

// ── Navigation ────────────────────────────────────────

const NAV = [
  { key: 'projects', num: '01', label: 'Projects', href: 'projects/' },
  { key: 'art',      num: '02', label: 'Art',      href: 'art/' },
  { key: 'about',    num: '03', label: 'About',    href: 'about/' },
  { key: 'other',    num: '04', label: 'Other',    href: 'other/' },
];

function spine(depth, active, site) {
  const p = rel(depth);
  const nav = NAV.map(n => `
    <a class="navlink${n.key === active ? ' is-active' : ''}" href="${p}${n.href}">
      <span class="navlink__num" aria-hidden="true">${n.num}</span>
      <span class="navlink__label">${n.label}</span>
      <span class="navlink__mark" aria-hidden="true">▸</span>
    </a>`).join('');

  const social = site.links.map(l =>
    `<a href="${e(l.url)}" target="_blank" rel="noopener noreferrer">${e(l.label)}</a>`).join('');

  return `<aside class="spine" id="spine">
    <a class="spine__id" href="${p || './'}">
      <span class="spine__name">Vivaan<br>Kaushal</span>
      <span class="spine__role">EE + Physics · Northeastern</span>
    </a>
    <nav class="spine__nav" aria-label="Sections">${nav}</nav>
    <div class="spine__foot">
      <div class="spine__social">${social}</div>
    </div>
  </aside>`;
}

// ── Page shell ────────────────────────────────────────

/* `base` overrides the relative prefix with an absolute one. Only 404.html needs it:
   GitHub serves that file for any missing URL, so relative paths would resolve
   against whatever path the visitor mistyped. */
function shell({ title, description, depth = 0, active = '', main, site, ogImage, wide, base }) {
  const p = base != null ? base : rel(depth);
  const full = title ? `${title} — Vivaan Kaushal` : 'Vivaan Kaushal';
  const desc = description || site.tagline;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(full)}</title>
<meta name="description" content="${e(desc)}">
<meta name="author" content="Vivaan Kaushal">
<meta name="color-scheme" content="light">
<meta property="og:title" content="${e(full)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:type" content="website">
${ogImage ? `<meta property="og:image" content="${e(p + ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..900;1,400..900&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&display=swap">
<link rel="stylesheet" href="${p}assets/css/site.css">
</head>
<body class="${cls(active && 'page-' + active, wide && 'is-wide')}">
<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
  <a class="topbar__id" href="${p || './'}">Vivaan Kaushal</a>
  <button class="topbar__toggle" type="button" aria-expanded="false" aria-controls="spine">
    <span aria-hidden="true">☰</span><span class="sr">Menu</span>
  </button>
</header>

${spine(depth, active, site)}

<main id="main" class="main">
${main}
<footer class="footer panel panel--ink">
  <div class="footer__grid">
    <p class="footer__sig">Vivaan Kaushal</p>
    <p class="footer__links">${site.links.map(l =>
      `<a href="${e(l.url)}" target="_blank" rel="noopener noreferrer">${e(l.label)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>
  </div>
  <div class="footer__menacing" aria-hidden="true">ゴゴゴゴゴゴゴゴ</div>
</footer>
</main>

<script src="${p}assets/js/site.js" defer></script>
</body>
</html>`;
}

// ── Home ──────────────────────────────────────────────

function home({ site, cards, strip, stats }) {
  const cardHtml = cards.map((c, i) => `
    <a class="chapter chapter--${i + 1}" href="${e(c.href)}">
      <div class="chapter__media">${c.image
        ? `<img src="${e(c.image)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`
        : ''}<span class="chapter__scrim" aria-hidden="true"></span></div>
      <div class="chapter__body">
        <span class="chapter__num" aria-hidden="true">${e(c.num)}</span>
        <h2 class="chapter__title">${e(c.title)}</h2>
        <p class="chapter__blurb">${e(c.blurb)}</p>
        <span class="chapter__count">${e(c.count)}</span>
      </div>
      <span class="chapter__go" aria-hidden="true">▸</span>
    </a>`).join('');

  const stripHtml = strip.length ? `
    <section class="influence" aria-labelledby="influence-h">
      <div class="influence__head">
        <h2 class="influence__title" id="influence-h">Things that made me (my inspirations)</h2>
        <a class="influence__more" href="about/#influences">See the whole wall ▸</a>
      </div>
      <div class="marquee" data-marquee>
        <div class="marquee__track">
          ${[0, 1].map(dup => strip.map(s =>
            `<figure class="marquee__item"${dup ? ' aria-hidden="true"' : ''}>
               <img src="${e(s.src)}" alt="${dup ? '' : e(s.title)}" loading="lazy" decoding="async">
               <figcaption>${e(s.title)}</figcaption>
             </figure>`).join('')).join('')}
        </div>
      </div>
    </section>` : '';

  return `
<section class="hero panel--ink halftone">
  <div class="hero__menacing" aria-hidden="true">ゴゴゴゴゴゴゴ</div>
  <div class="hero__speed" aria-hidden="true"></div>
  <div class="hero__inner">
    <p class="kicker kicker--gold">Vivaan Kaushal · Portfolio № 001</p>
    <h1 class="hero__title">
      <span class="hero__word">Vivaan</span>
      <span class="hero__word hero__word--mark">Kaushal</span>
    </h1>
    <p class="hero__lede">${e(site.heroQuote)}</p>
    <p class="hero__sub">${e(site.tagline)}</p>
    <div class="hero__cta">
      <a class="btn btn--big" href="projects/">See the work <span aria-hidden="true">▸</span></a>
      <a class="btn btn--big btn--ghost" href="about/">Who I am</a>
    </div>
  </div>
  <ul class="hero__stats">${stats.map(s =>
    `<li><b>${e(s.n)}</b><span>${e(s.label)}</span></li>`).join('')}</ul>
</section>

<section class="chapters" aria-label="Sections">${cardHtml}</section>

${stripHtml}`;
}

// ── Card grids ────────────────────────────────────────

function entryCard(item, opts = {}) {
  const tone = opts.tone ? ` card--${opts.tone}` : '';
  return `<a class="card${tone}${item.archived ? ' card--archived' : ''}" href="${e(item.href)}">
    <div class="card__media">
      ${item.image
        ? `<img src="${e(item.image)}" alt="" loading="lazy" decoding="async">`
        : `<span class="card__placeholder" aria-hidden="true">${e((item.title || '?').slice(0, 1))}</span>`}
      ${item.badge ? `<span class="card__badge">${e(item.badge)}</span>` : ''}
    </div>
    <div class="card__body">
      <h3 class="card__title">${e(item.title)}</h3>
      ${item.description ? `<p class="card__desc">${e(item.description)}</p>` : ''}
      ${item.tags && item.tags.length ? chips(item.tags.slice(0, 4)) : ''}
      <span class="card__go" aria-hidden="true">Open ▸</span>
    </div>
  </a>`;
}

function group({ id, title, note, items, empty: emptyMsg, tone }) {
  return `<section class="group" ${id ? `id="${e(id)}"` : ''}>
    <div class="group__head">
      <h2 class="group__title">${e(title)}</h2>
      ${note ? `<p class="group__note">${e(note)}</p>` : ''}
      <span class="group__rule" aria-hidden="true"></span>
      <span class="group__count">${items.length}</span>
    </div>
    ${items.length
      ? `<div class="cards">${items.map(i => entryCard(i, { tone })).join('')}</div>`
      : empty(emptyMsg || 'Nothing here yet — this section is still being written.')}
  </section>`;
}

// ── Article (project / lore / note) ───────────────────

function article({ title, kicker: kick, description, specs, links, body, headings, backHref, backLabel, hero, footerNote }) {
  const toc = headings && headings.filter(h => h.level === 2).length >= 3
    ? `<nav class="toc" aria-label="Contents">
         <p class="toc__title">Contents</p>
         <ol>${headings.filter(h => h.level <= 2).map(h =>
           `<li class="toc__l${h.level}"><a href="#${e(h.id)}">${e(h.text)}</a></li>`).join('')}</ol>
       </nav>`
    : '';

  return `
<article class="article">
  <header class="ahead panel--ink halftone">
    <a class="ahead__back" href="${e(backHref)}"><span aria-hidden="true">◂</span> ${e(backLabel)}</a>
    ${kick ? `<p class="kicker kicker--gold">${e(kick)}</p>` : ''}
    <h1 class="ahead__title">${e(title)}</h1>
    ${description ? `<p class="ahead__desc">${e(description)}</p>` : ''}
    ${linkButtons(links)}
    ${specTable(specs)}
    <div class="ahead__menacing" aria-hidden="true">ゴゴゴ</div>
  </header>
  ${hero ? `<figure class="ahero"><img src="${e(hero)}" alt="" loading="eager" decoding="async"></figure>` : ''}
  <div class="article__grid">
    ${toc}
    <div class="prose">${body}</div>
  </div>
  ${footerNote ? `<p class="article__foot">${e(footerNote)}</p>` : ''}
</article>`;
}

// ── Photography ───────────────────────────────────────

function albumGrid(albums) {
  return `<div class="albums">${albums.map(a => `
    <a class="album" href="${e(a.href)}">
      <div class="album__media">
        <img src="${e(a.cover)}" alt="" loading="lazy" decoding="async">
        <span class="album__count">${a.count}</span>
      </div>
      <div class="album__body">
        <h3 class="album__title">${e(a.title)}</h3>
        ${a.description ? `<p class="album__desc">${e(a.description)}</p>` : ''}
      </div>
    </a>`).join('')}</div>`;
}

function album({ title, description, photos, backHref }) {
  const items = photos.map((ph, i) => `
    <button class="shot" type="button" data-full="${e(ph.large)}" data-index="${i}" aria-label="Open photo ${i + 1} of ${photos.length}">
      <img src="${e(ph.thumb)}" alt="" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"
           width="${ph.w || ''}" height="${ph.h || ''}">
    </button>`).join('');

  return `
<article class="article">
  <header class="ahead panel--ink halftone">
    <a class="ahead__back" href="${e(backHref)}"><span aria-hidden="true">◂</span> Photography</a>
    <p class="kicker kicker--gold">${photos.length} photographs</p>
    <h1 class="ahead__title">${e(title)}</h1>
    ${description ? `<p class="ahead__desc">${e(description)}</p>` : ''}
    <div class="ahead__menacing" aria-hidden="true">ゴゴゴ</div>
  </header>
  <div class="shots" data-lightbox>${items}</div>
</article>`;
}

// ── Worldbuild explorer ───────────────────────────────

function worldbuild({ overviewHtml, groups, backHref }) {
  return `
<article class="article">
  <header class="ahead panel--ink halftone ahead--baroque">
    <a class="ahead__back" href="${e(backHref)}"><span aria-hidden="true">◂</span> Art</a>
    <p class="kicker kicker--gold">Worldbuilding · ongoing</p>
    <h1 class="ahead__title">Baroque</h1>
    <div class="ahead__menacing" aria-hidden="true">ゴゴゴゴ</div>
  </header>
  <div class="prose prose--wide baroque-intro">${overviewHtml}</div>
  ${groups.map(g => `
    <section class="group">
      <div class="group__head">
        <h2 class="group__title">${e(g.title)}</h2>
        <span class="group__rule" aria-hidden="true"></span>
        <span class="group__count">${g.entries.length}</span>
      </div>
      <div class="lore">${g.entries.map(en => `
        <a class="lore__item" href="${e(en.href)}">
          <span class="lore__mark" aria-hidden="true">◆</span>
          <span class="lore__text">
            <span class="lore__title">${e(en.title)}</span>
            ${en.description ? `<span class="lore__desc">${e(en.description)}</span>` : ''}
          </span>
        </a>`).join('')}</div>
    </section>`).join('')}
</article>`;
}

// ── Music ─────────────────────────────────────────────

function music({ tracks, backHref, intro, spotify, spotifyEmbed, releases, cover }) {
  const player = (src, title) =>
    `<figure class="embed embed--spotify">
       <iframe src="${e(src)}" title="${e(title)}"
         height="352" loading="lazy" frameborder="0"
         allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
     </figure>`;

  // Spotify has no discography embed — one player per release gets us there.
  const embed = (releases && releases.length) ? `
    <section class="group">
      <div class="group__head">
        <h2 class="group__title">Releases</h2>
        <span class="group__rule" aria-hidden="true"></span>
        <span class="group__count">${releases.length}</span>
      </div>
      <div class="releases">${releases.map(r => `
        <div class="release">
          <p class="release__meta"><b>${e(r.title)}</b><span>${e(r.kind || 'Release')}</span></p>
          ${player(r.embed, r.title + ' on Spotify')}
        </div>`).join('')}</div>
    </section>`
  : spotifyEmbed ? `
    <section class="group">
      <div class="group__head">
        <h2 class="group__title">On Spotify</h2>
        <span class="group__rule" aria-hidden="true"></span>
      </div>
      ${player(spotifyEmbed, 'Runox on Spotify')}
    </section>` : '';

  return `
<article class="article">
  <header class="ahead panel--ink halftone">
    <a class="ahead__back" href="${e(backHref)}"><span aria-hidden="true">◂</span> Art</a>
    <p class="kicker kicker--gold">I release as Runox</p>
    <h1 class="ahead__title">Music</h1>
    ${intro ? `<p class="ahead__desc">${e(intro)}</p>` : ''}
    ${spotify ? linkButtons([{ url: spotify, kind: 'spotify', label: 'Open in Spotify' }]) : ''}
    <div class="ahead__menacing" aria-hidden="true">ゴゴゴ</div>
  </header>
  ${cover ? `<figure class="ahero ahero--sleeve"><img src="${e(cover)}" alt="Runox cover art" loading="eager" decoding="async"></figure>` : ''}
  ${embed}
  ${tracks.length ? `
  <section class="group">
    <div class="group__head">
      <h2 class="group__title">Written for my games</h2>
      <span class="group__rule" aria-hidden="true"></span>
      <span class="group__count">${tracks.length}</span>
    </div>
  </section>
  <ol class="tracks">${tracks.map((t, i) => `
    <li class="track">
      <span class="track__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <div class="track__body">
        <h3 class="track__title">${e(t.title)}</h3>
        ${t.description ? `<p class="track__desc">${e(t.description)}</p>` : ''}
        <audio controls preload="none" src="${e(t.src)}"></audio>
      </div>
    </li>`).join('')}</ol>` : empty('No tracks published here yet.')}
</article>`;
}

// ── About ─────────────────────────────────────────────

function about({ introHtml, influences, facts, portrait }) {
  return `
<article class="article">
  ${chapterHead({ num: '03', title: 'About me', lede: '' })}
  <div class="about">
    <div class="prose prose--wide">${introHtml}</div>
    <aside class="factfile panel halftone">
      <h2 class="factfile__title">File</h2>
      <dl class="spec">${facts.map(f =>
        `<div class="spec__row"><dt>${e(f.k)}</dt><dd>${f.html || e(f.v)}</dd></div>`).join('')}</dl>
    </aside>
  </div>

  <section class="group" id="influences">
    <div class="group__head">
      <h2 class="group__title">The wall</h2>
      <p class="group__note">Work that shaped how I make things.</p>
      <span class="group__rule" aria-hidden="true"></span>
      <span class="group__count">${influences.length}</span>
    </div>
    <div class="wall">${influences.map(i => `
      <figure class="wall__item">
        <img src="${e(i.src)}" alt="${e(i.title)}" loading="lazy" decoding="async"
             ${i.w && i.h ? `width="${i.w}" height="${i.h}"` : ''}>
        <figcaption>
          <span class="wall__title">${e(i.title)}</span>
          <span class="wall__source">${e(i.source)}</span>
          ${i.note ? `<span class="wall__note">${e(i.note)}</span>` : ''}
        </figcaption>
      </figure>`).join('')}</div>
  </section>
</article>`;
}

module.exports = {
  rel, reroot, shell, home, chapterHead, group, entryCard, article,
  albumGrid, album, worldbuild, music, about, empty, chips, kicker,
  linkButtons, specTable, badge, NAV,
};
