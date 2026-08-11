#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Vivaan Kaushal — static site generator
   Run:  node build.js
   Reads content/**.md, writes real HTML pages to the repo root.
   ═══════════════════════════════════════════════════════ */

'use strict';

const fs   = require('fs');
const path = require('path');

const md = require('./lib/markdown');
const T  = require('./lib/templates');

const ROOT     = __dirname;
const CONTENT  = path.join(ROOT, 'content');
const ASSETS   = path.join(ROOT, 'assets');
const DERIVED  = path.join(ASSETS, 'derived');
const MANIFEST = path.join(DERIVED, '.manifest.json');

// ── Site configuration ────────────────────────────────

const SITE = {
  tagline: 'Electrical engineering and physics at Northeastern. Circuits, games, ' +
           'soundtracks, photographs — and a world called Baroque.',
  heroQuote: 'I love to simply create.',
  // Where the site is served from. GitHub project pages live under /<repo>/.
  // Change to '/' if you move this to a custom domain or a <user>.github.io repo.
  // Only 404.html depends on this; every other page uses relative links.
  basePath: '/Amoeboid/',
  // Runox on Spotify — shown on the Music page, in the sidebar and in the footer.
  spotify: 'https://open.spotify.com/artist/3JKtS3OZf6Wrio2MFBe2H6',
  // Releases, newest first. Spotify has no "discography" embed, so each one gets its
  // own player. Paste an album/EP/single share link here when you put a new one out.
  releases: [
    { title: 'Ambertala', kind: 'EP',    url: 'https://open.spotify.com/album/3tR9ah0BSHzFUlbO423nzZ' },
    { title: 'GENOTEKK',  kind: 'Album', url: 'https://open.spotify.com/album/6lEVhnBKCv1LFa42bsCYs1' },
  ],
  links: [
    { label: 'GitHub',    url: 'https://github.com/runoxVK' },
    { label: 'itch.io',   url: 'https://runox.itch.io' },
    { label: 'Instagram', url: 'https://instagram.com/vk.artsz' },
    { label: 'Email',     url: 'mailto:kaushal.v@northeastern.edu' },
  ],
};

/** The influences wall. `note` comes from content/about/influences.md. */
const INFLUENCES = [
  { file: 'ROR2SeekersArt.webp', title: 'Risk of Rain 2',  source: 'Hopoo Games' },
  { file: 'ROR2Ukelele.webp',    title: 'Risk of Rain 2',  source: 'Chris Christodoulou — soundtrack' },
  { file: 'KenshiConcept.webp',  title: 'Kenshi',          source: 'Lo-Fi Games' },
  { file: 'MIHArt.webp',         title: 'Made in Heaven',  source: "JoJo's Bizarre Adventure" },
  { file: 'whitesnakeArt.webp',  title: 'Whitesnake',      source: "JoJo's Bizarre Adventure" },
  { file: 'MandomArt.webp',      title: 'Mandom',          source: "JoJo's Bizarre Adventure" },
  { file: 'ArcaneConcept.webp',  title: 'Arcane',          source: 'Fortiche / Riot Games' },
  { file: 'RainworldBulb.webp',  title: 'Rain World',      source: 'Videocult' },
  { file: 'SubShroom.webp',      title: 'Subnautica',      source: 'Unknown Worlds' },
  { file: 'SLIcon.webp',         title: 'Sister Location', source: "Five Nights at Freddy's" },
  { file: 'Magneto.webp',        title: 'Magneto',         source: 'X-Men' },
];

/** Explicit album order — newest trips first. Unlisted albums follow alphabetically. */
const PHOTO_ORDER = [
  'monroe-2026', 'boston-2026', 'spain-2025',
  'japan-2025', 'wildwood-2025', 'dominican-republic-2024',
];

/** Worldbuild category order on the Baroque index. */
const LORE_ORDER = [
  'Stories', 'Kingdoms', 'Regions', 'Locations',
  'Characters', 'Groups', 'Creatures', 'Flora', 'Power Core', 'Codex',
];

// ── Small filesystem helpers ──────────────────────────

const toUrl = p => p.split(path.sep).join('/');
const exists = p => fs.existsSync(p);

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

/* The build runs twice: pass 1 discovers which images are needed, pass 2 emits
   the HTML once every derivative's real dimensions are known. */
let DRY = true;

function writePage(relPath, html) {
  pagesWritten.push(relPath);
  if (DRY) return;
  const abs = path.join(ROOT, relPath);
  mkdirp(path.dirname(abs));
  fs.writeFileSync(abs, html, 'utf8');
}

/**
 * A filename that already contains spaces is a written title — use it verbatim, so
 * "Sub-zero Summits.md" keeps its hyphen and "Zorak's Wrath.md" keeps its lowercase s.
 * Anything else is a slug and gets title-cased.
 */
function titleFromSlug(name) {
  const base = stripOrderPrefix(name.replace(/\.md$/i, ''));
  if (/\s/.test(base)) return base.trim();
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_, lead, ch) => lead + ch.toUpperCase());
}

/** Files are ordered on disk with a "(3)" prefix; that is sort data, not part of the title. */
function stripOrderPrefix(s) { return s.replace(/^\s*\(\d+\)\s*/, ''); }

let pagesWritten = [];

// ── Image pipeline ────────────────────────────────────

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (_) { manifest = {}; }

const derivations = [];   // queued sharp jobs
const dimensions  = {};   // outRel -> {w,h}

/**
 * Queue a resized WebP derivative. Returns the site-root-relative output path.
 * Idempotent: skipped on rebuild unless the source is newer.
 */
function derive(srcAbs, bucket, name, width, quality) {
  if (!exists(srcAbs)) return null;
  const outRel = toUrl(path.join('assets', 'derived', bucket, name + '.webp'));
  const outAbs = path.join(ROOT, outRel);
  derivations.push({ srcAbs, outAbs, outRel, width, quality });
  const cached = manifest[outRel];
  if (cached && cached.w) dimensions[outRel] = { w: cached.w, h: cached.h };
  return outRel;
}

async function runDerivations() {
  let sharp;
  try { sharp = require('sharp'); }
  catch (_) {
    console.log('  ! sharp is not installed — serving original images.');
    console.log('    run `npm install` to enable resizing.\n');
    return { made: 0, skipped: derivations.length };
  }

  let made = 0, skipped = 0;
  const seen = new Set();

  for (const job of derivations) {
    if (seen.has(job.outAbs)) continue;
    seen.add(job.outAbs);

    const srcStat = fs.statSync(job.srcAbs);
    const fresh = exists(job.outAbs) &&
                  fs.statSync(job.outAbs).mtimeMs >= srcStat.mtimeMs &&
                  manifest[job.outRel] && manifest[job.outRel].w;

    if (fresh) { skipped++; continue; }

    mkdirp(path.dirname(job.outAbs));
    try {
      const info = await sharp(job.srcAbs)
        .rotate()
        .resize({ width: job.width, withoutEnlargement: true })
        .webp({ quality: job.quality, effort: 4 })
        .toFile(job.outAbs);
      manifest[job.outRel] = { w: info.width, h: info.height };
      dimensions[job.outRel] = { w: info.width, h: info.height };
      made++;
      if (made % 25 === 0) process.stdout.write(`  … ${made} images\r`);
    } catch (err) {
      console.log('  ! could not process ' + path.relative(ROOT, job.srcAbs) + ': ' + err.message);
    }
  }

  // Drop derivatives nothing references any more (deleted posts, renamed images).
  let pruned = 0;
  const wanted = new Set(derivations.map(d => d.outRel));
  (function sweep(dir) {
    if (!exists(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) { sweep(abs); continue; }
      if (!ent.name.endsWith('.webp')) continue;
      const rel = toUrl(path.relative(ROOT, abs));
      if (wanted.has(rel)) continue;
      fs.unlinkSync(abs);
      delete manifest[rel];
      pruned++;
    }
  })(DERIVED);

  mkdirp(DERIVED);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0), 'utf8');
  return { made, skipped, pruned };
}

/** Resolve an inline markdown image (from ![[Name.png]]) to a derivative. */
function inlineImage(name) {
  const srcAbs = path.join(ASSETS, 'images', name);
  if (!exists(srcAbs)) return null;
  const key = md.slugify(name.replace(/\.[^.]+$/, ''));
  const src = derive(srcAbs, 'inline', key, 1200, 80);
  if (!src) return null;
  const d = dimensions[src] || {};
  return { src, width: d.w, height: d.h };
}

/** Resolve an inline audio embed (from ![[Track.mp3]]). */
function inlineAudio(name) {
  const srcAbs = path.join(ASSETS, 'music', name);
  if (!exists(srcAbs)) return null;
  return { src: toUrl(path.join('assets', 'music', name)), title: prettyTrack(name) };
}

/** Turn a Spotify share link into its embeddable player URL. */
function spotifyEmbedUrl(url) {
  const m = String(url || '').match(/open\.spotify\.com\/(artist|album|playlist|track)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

function prettyTrack(file) {
  return file
    .replace(/\.[^.]+$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim();
}

// ── Content loading ───────────────────────────────────

/** Read one .md file into a structured entry. */
function readEntry(fileAbs) {
  const raw  = fs.readFileSync(fileAbs, 'utf8');
  const name = path.basename(fileAbs);
  const slug = md.slugify(stripOrderPrefix(name.replace(/\.md$/i, '')));
  const parsed = md.parseMeta(raw);

  // Drop a leading H1 — the page template already prints the title.
  let body = parsed.body.replace(/^\s*#\s+[^\n]*\n?/, '').trim();

  return {
    slug,
    file: name,
    title: parsed.meta.title || titleFromSlug(name),
    description: parsed.meta.description || md.autoDescription(body),
    status: parsed.meta.status || '',
    cover: parsed.meta.cover || '',
    tags: parsed.meta.tags ? parsed.meta.tags.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
    specs: parsed.specs,
    links: parsed.links,
    bodyMd: body,
    mtime: fs.statSync(fileAbs).mtimeMs,
    abs: fileAbs,
  };
}

/** All .md entries in a directory, newest first. */
function readDir(dirAbs) {
  if (!exists(dirAbs)) return [];
  return fs.readdirSync(dirAbs)
    .filter(f => f.toLowerCase().endsWith('.md'))
    .map(f => readEntry(path.join(dirAbs, f)))
    .sort((a, b) => b.mtime - a.mtime);
}

/** Recursively read a directory into a flat list, tracking folder path. */
function readTreeFlat(dirAbs, skip = [], trail = []) {
  if (!exists(dirAbs)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (skip.includes(ent.name)) continue;
    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      out.push(...readTreeFlat(abs, skip, trail.concat(ent.name)));
    } else if (ent.name.toLowerCase().endsWith('.md')) {
      const entry = readEntry(abs);
      entry.trail = trail.slice();
      entry.group = trail.length ? trail[trail.length - 1] : '';
      out.push(entry);
    }
  }
  return out;
}

/** Thumbnail file matching the entry's filename in assets/thumbnails/. */
function thumbFor(entry, width = 900) {
  const dir = path.join(ASSETS, 'thumbnails');
  if (!exists(dir)) return null;
  const want = entry.file.replace(/\.md$/i, '').toLowerCase();
  for (const f of fs.readdirSync(dir)) {
    const base = f.replace(/\.[^.]+$/, '').toLowerCase();
    if (base === want || md.slugify(base) === entry.slug) {
      return derive(path.join(dir, f), 'thumb', entry.slug + '-' + width, width, 78);
    }
  }
  return null;
}

/** The last ![[image]] embedded in the document. */
function lastImageIn(entry, width) {
  const names = [...entry.bodyMd.matchAll(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g)]
    .map(m => m[1].split(/[/\\]/).pop().trim())
    .filter(n => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(n));
  for (let i = names.length - 1; i >= 0; i--) {
    const abs = path.join(ASSETS, 'images', names[i]);
    if (exists(abs)) {
      return derive(abs, 'thumb', md.slugify(names[i].replace(/\.[^.]+$/, '')) + '-' + width, width, 78);
    }
  }
  return null;
}

/**
 * Card / hero image for an entry, in order of preference:
 *   1. `cover: Name.png` in the file  →  assets/images/Name.png
 *   2. assets/thumbnails/<same-name-as-the-md>.<ext>
 *   3. the last image embedded in the document itself
 */
function coverFor(entry, width = 900) {
  if (entry.cover) {
    const name = entry.cover.split(/[/\\]/).pop().trim();
    for (const dir of ['images', 'thumbnails']) {
      const abs = path.join(ASSETS, dir, name);
      if (exists(abs)) {
        return derive(abs, 'thumb', md.slugify(name.replace(/\.[^.]+$/, '')) + '-' + width, width, 78);
      }
    }
    console.log('  ! cover not found for ' + entry.file + ': ' + entry.cover);
  }
  return thumbFor(entry, width) || lastImageIn(entry, width);
}

/** A one-off image in assets/images/ referenced by name, e.g. "MusicCover". */
function imageAsset(name, width, quality = 80) {
  const dir = path.join(ASSETS, 'images');
  if (!exists(dir)) return null;
  const hit = fs.readdirSync(dir).find(f =>
    f.replace(/\.[^.]+$/, '').toLowerCase() === name.toLowerCase() &&
    /\.(png|jpe?g|gif|webp|avif)$/i.test(f));
  return hit ? derive(path.join(dir, hit), 'thumb', md.slugify(name) + '-' + width, width, quality) : null;
}

/** Matching PDF in assets/pdfs/, if any. */
function pdfFor(entry) {
  const dir = path.join(ASSETS, 'pdfs');
  if (!exists(dir)) return null;
  const want = entry.file.replace(/\.md$/i, '').toLowerCase();
  for (const f of fs.readdirSync(dir)) {
    if (f.replace(/\.[^.]+$/, '').toLowerCase() === want) {
      return { href: toUrl(path.join('assets', 'pdfs', f)),
               size: Math.round(fs.statSync(path.join(dir, f)).size / 1048576 * 10) / 10 };
    }
  }
  return null;
}

// ── Load everything ───────────────────────────────────

console.log('\n  Vivaan Kaushal — site build\n  ' + '─'.repeat(42));

const gamedev     = readDir(path.join(CONTENT, 'projects', 'gamedev'));
const electronics = readDir(path.join(CONTENT, 'projects', 'electronics'));
const projects    = [...gamedev, ...electronics];

const photoDocs   = readDir(path.join(CONTENT, 'art', 'photography'));
const musicDocs   = readDir(path.join(CONTENT, 'art', 'music'));
const lore        = readTreeFlat(path.join(CONTENT, 'art', 'worldbuild'), ['Tools']);

const notes       = readDir(path.join(CONTENT, 'other', 'notes'));
const reviews     = readDir(path.join(CONTENT, 'other', 'reviews'));
const writing     = readDir(path.join(CONTENT, 'other', 'writing'));

const aboutDocs   = readDir(path.join(CONTENT, 'about'));
const intro       = aboutDocs.find(d => d.slug === 'intro') || aboutDocs[0] || null;

// Overview is the Baroque preamble, not a lore entry.
const loreOverview = lore.find(l => l.slug === 'overview' && !l.trail.length);
const loreEntries  = lore.filter(l => l !== loreOverview);

// Unique slugs for lore (titles can repeat across folders).
const loreSlugs = new Map();
for (const l of loreEntries) {
  let s = l.slug, n = 2;
  while (loreSlugs.has(s)) s = l.slug + '-' + n++;
  loreSlugs.set(s, l);
  l.slug = s;
  l.href = 'art/worldbuild/' + s + '/';
}

// Wikilink resolution: title or slug → lore page.
// Story files are ordered with a "(3)" prefix, but links say [[Zorak's Wrath]] —
// so index both the raw name and the name with that prefix stripped.
const loreIndex = new Map();
for (const l of loreEntries) {
  const bare = l.file.replace(/\.md$/i, '');
  const keys = [l.title, bare, bare.replace(/^\s*\(\d+\)\s*/, ''), l.slug];
  for (const k of keys) {
    const norm = md.slugify(k);
    if (norm && !loreIndex.has(norm)) loreIndex.set(norm, l);
  }
}

function wikilink(target) {
  const hit = loreIndex.get(md.slugify(target));
  return hit ? { href: '/' + hit.href } : null;
}

// Render context shared by every markdown document.
const CTX = {
  image: inlineImage,
  audio: inlineAudio,
  wikilink: (t) => {
    const hit = wikilink(t);
    if (!hit) return null;
    // href is resolved per-page later via ROOTMARK
    return { href: 'ROOTMARK/' + hit.href.replace(/^\//, '') };
  },
};

/** Render markdown for a page at `depth`, fixing up asset + wikilink paths. */
function body(mdText, depth) {
  const r = md.render(mdText, CTX);
  const prefix = T.rel(depth) || './';
  const html = T.reroot(r.html, depth).replace(/ROOTMARK\//g, prefix);
  return { html, headings: r.headings };
}

// ── Photo albums ──────────────────────────────────────

const PHOTO_DIR = path.join(ASSETS, 'images', 'photo');
const IMG_EXT   = /\.(jpe?g|png|webp|gif|avif)$/i;

const albums = [];
if (exists(PHOTO_DIR)) {
  const dirs = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
  const ordered = [
    ...PHOTO_ORDER.filter(n => dirs.some(d => d.toLowerCase() === n.toLowerCase())),
    ...dirs.filter(n => !PHOTO_ORDER.some(o => o.toLowerCase() === n.toLowerCase())).sort(),
  ];

  for (const dirName of ordered) {
    const abs = path.join(PHOTO_DIR, dirName);
    const files = fs.readdirSync(abs)
      .filter(f => IMG_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (!files.length) continue;

    const doc = photoDocs.find(d => d.slug === md.slugify(dirName));
    const photos = files.map(f => {
      const src = path.join(abs, f);
      const key = md.slugify(f.replace(/\.[^.]+$/, ''));
      return {
        thumb: derive(src, path.join('photo', dirName), key + '-t', 620, 68),
        large: derive(src, path.join('photo', dirName), key + '-l', 1800, 76),
      };
    });

    albums.push({
      slug: md.slugify(dirName),
      title: titleFromSlug(dirName),
      description: doc ? doc.description : '',
      photos,
      count: photos.length,
      href: 'art/photography/' + md.slugify(dirName) + '/',
    });
  }
}

// ── Music tracks ──────────────────────────────────────

const MUSIC_DIR = path.join(ASSETS, 'music');
const tracks = exists(MUSIC_DIR)
  ? fs.readdirSync(MUSIC_DIR)
      .filter(f => /\.(mp3|ogg|wav|m4a)$/i.test(f))
      .sort()
      .map(f => {
        const doc = musicDocs.find(d => d.slug === md.slugify(f.replace(/\.[^.]+$/, '')));
        return {
          file: f,
          src: toUrl(path.join('assets', 'music', f)),
          title: doc ? doc.title : prettyTrack(f),
          description: doc ? doc.description : '',
        };
      })
  : [];

// ── Influence notes (optional, from content/about/influences.md) ──
const influenceNotes = {};
{
  const f = path.join(CONTENT, 'about', 'influences.md');
  if (exists(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.\-]+\.(?:webp|png|jpe?g)):\s*(.*)$/i);
      if (m && m[2].trim()) influenceNotes[m[1].trim()] = m[2].trim();
    }
  }
}

const influences = INFLUENCES
  .filter(i => exists(path.join(ASSETS, 'panel-images', i.file)))
  .map(i => ({
    ...i,
    note: influenceNotes[i.file] || '',
    src:  derive(path.join(ASSETS, 'panel-images', i.file), 'wall',  md.slugify(i.file.replace(/\.[^.]+$/, '')), 1000, 80),
    strip:derive(path.join(ASSETS, 'panel-images', i.file), 'strip', md.slugify(i.file.replace(/\.[^.]+$/, '')), 460, 74),
  }));

// ═══════════════════════════════════════════════════════
//  PAGES
// ═══════════════════════════════════════════════════════

const photoCount = albums.reduce((n, a) => n + a.count, 0);

function buildPages() {

function projectCard(p, groupHref) {
  const archived = /cancel/i.test(p.status) || /cancel/i.test(p.slug);
  return {
    title: p.title,
    description: p.description,
    href: groupHref + p.slug + '/',
    image: coverFor(p, 900),
    // One spec value can list a whole bill of materials — split it into separate
    // chips and drop anything too long to sit in one, or it overruns the card.
    tags: p.specs
      .filter(s => /language|engine|libraries|platform|hardware|microcontroller/i.test(s.key))
      .flatMap(s => s.value.split(/\s*[,;]\s*/))
      .map(s => s.trim())
      .filter(s => s && s.length <= 24)
      .filter((s, i, a) => a.indexOf(s) === i)
      .slice(0, 4),
    badge: archived ? 'Archived' : (p.status || ''),
    archived,
  };
}

// ── / ─────────────────────────────────────────────────
{
  const cards = [
    { num: '01', title: 'Projects', href: 'projects/',
      blurb: 'Games built from scratch and circuits built on a bench. Full documentation for each.',
      count: `${projects.length} projects`,
      image: projects.length ? coverFor(projects[0], 900) : null },
    { num: '02', title: 'Art', href: 'art/',
      blurb: 'Photography from six trips, music released as Runox, and Baroque — a world I have been writing for years.',
      count: `${photoCount} photos · ${tracks.length} tracks · ${loreEntries.length} entries`,
      image: albums.length ? albums[0].photos[0].thumb : null },
    { num: '03', title: 'About', href: 'about/',
      blurb: 'Who I am, what I am studying, and the wall of work that shaped how I make things.',
      count: `${influences.length} influences`,
      image: influences.length ? influences[0].strip : null },
    { num: '04', title: 'Other', href: 'other/',
      blurb: 'Physics notes, writing, and reviews of the games and records worth the words.',
      count: `${notes.length + reviews.length + writing.length} pieces`,
      image: null },
  ];

  const stats = [
    { n: String(projects.length), label: 'projects' },
    { n: String(photoCount),      label: 'photographs' },
    { n: String(loreEntries.length), label: 'lore entries' },
    { n: String(tracks.length),   label: 'tracks' },
  ];

  writePage('index.html', T.shell({
    title: '', description: SITE.tagline, depth: 0, active: 'home', site: siteFor(0),
    ogImage: influences.length ? influences[0].src : null,
    main: T.home({ site: SITE, cards, stats, strip: influences.map(i => ({ src: i.strip, title: i.title })) }),
  }));
}

// ── /projects/ ────────────────────────────────────────
{
  const main = T.chapterHead({
    num: '01', title: 'Projects',
    lede: 'Everything here I built end to end — and documented while building it. ' +
          'Each entry is the real working log, not a summary written after the fact.',
  }) + T.group({
    id: 'gamedev', title: 'Game development',
    note: 'Engines, editors and gameplay systems — mostly Godot and raw C.',
    items: gamedev.map(p => projectCard(p, '')),
  }) + T.group({
    id: 'electronics', title: 'Electronics',
    note: 'Microcontrollers, analog circuits and control loops.',
    items: electronics.map(p => projectCard(p, '')),
  });

  writePage('projects/index.html', T.shell({
    title: 'Projects', description: 'Games and electronics projects by Vivaan Kaushal, with full build documentation.',
    depth: 1, active: 'projects', site: siteFor(1), main: T.reroot(main, 1),
  }));
}

for (const p of projects) {
  const r = body(p.bodyMd, 2);
  const hero = coverFor(p, 1400);
  writePage(`projects/${p.slug}/index.html`, T.shell({
    title: p.title, description: p.description, depth: 2, active: 'projects',
    site: siteFor(2), ogImage: hero,
    main: T.article({
      title: p.title,
      kicker: gamedev.includes(p) ? 'Game development' : 'Electronics',
      description: p.description,
      specs: p.specs, links: p.links,
      body: r.html, headings: r.headings,
      backHref: '../', backLabel: 'Projects',
      hero: hero ? T.rel(2) + hero : null,
    }),
  }));
}

// ── /art/ ─────────────────────────────────────────────
{
  const main = T.chapterHead({
    num: '02', title: 'Art',
    lede: 'Three ways of processing the same impulse: a camera, a DAW, and a very long document about a world that does not exist.',
  }) + `<div class="cards cards--big">` + [
    { title: 'Photography', href: 'photography/', description:
        `Six albums, ${photoCount} photographs, two competition wins. Shot across Spain, Japan, the Dominican Republic and home.`,
      image: albums.length ? albums[0].photos[0].thumb : null, tags: ['Darktable', 'Canon'] },
    { title: 'Music', href: 'music/', description:
        'Instrumental and soundtrack work released as Runox, including original score for The Elevator.',
      image: imageAsset('MusicCover', 900), tags: ['Runox', `${tracks.length} tracks`] },
    { title: 'Baroque', href: 'worldbuild/', description:
        loreOverview ? loreOverview.description : 'An ongoing worldbuilding project — kingdoms, codices and stories.',
      image: null, tags: ['Worldbuilding', `${loreEntries.length} entries`] },
  ].map(i => T.entryCard(i)).join('') + `</div>`;

  writePage('art/index.html', T.shell({
    title: 'Art', description: 'Photography, music as Runox, and the Baroque worldbuilding project.',
    depth: 1, active: 'art', site: siteFor(1), main: T.reroot(main, 1),
  }));
}

// ── /art/photography/ ─────────────────────────────────
{
  const main = T.chapterHead({
    num: '02', title: 'Photography',
    lede: `${photoCount} photographs across ${albums.length} albums. More on Instagram at @vk.artsz.`,
  }) + T.albumGrid(albums.map(a => ({ ...a, href: a.slug + '/', cover: a.photos[0].thumb })));

  writePage('art/photography/index.html', T.shell({
    title: 'Photography', description: `${photoCount} photographs by Vivaan Kaushal.`,
    depth: 2, active: 'art', site: siteFor(2), main: T.reroot(main, 2),
    ogImage: albums.length ? albums[0].photos[0].large : null,
  }));
}

for (const a of albums) {
  const main = T.album({
    title: a.title, description: a.description, backHref: '../',
    photos: a.photos.map(p => ({
      thumb: T.rel(3) + p.thumb,
      large: T.rel(3) + p.large,
      w: (dimensions[p.thumb] || {}).w, h: (dimensions[p.thumb] || {}).h,
    })),
  });
  writePage(`art/photography/${a.slug}/index.html`, T.shell({
    title: a.title, description: a.description || `${a.count} photographs from ${a.title}.`,
    depth: 3, active: 'art', site: siteFor(3), main, ogImage: a.photos[0].large,
  }));
}

// ── /art/music/ ───────────────────────────────────────
{
  const cover = imageAsset('MusicCover', 900);
  const main = T.music({
    tracks: tracks.map(t => ({ ...t, src: T.rel(2) + t.src })),
    backHref: '../',
    cover: cover ? T.rel(2) + cover : null,
    intro: 'I write instrumental and soundtrack music, heavily shaped by Chris Christodoulou. ' +
           'I release lots of my tracks on Spotify.',
    spotify: SITE.spotify,
    spotifyEmbed: spotifyEmbedUrl(SITE.spotify),
    releases: (SITE.releases || [])
      .map(r => ({ ...r, embed: spotifyEmbedUrl(r.url) }))
      .filter(r => r.embed),
  });
  writePage('art/music/index.html', T.shell({
    title: 'Music', description: 'Instrumental and soundtrack music by Vivaan Kaushal, released as Runox.',
    depth: 2, active: 'art', site: siteFor(2), main, ogImage: cover,
  }));
}

// ── /art/worldbuild/ ──────────────────────────────────
{
  const byGroup = new Map();
  for (const l of loreEntries) {
    const g = l.group || 'Codex';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(l);
  }
  const groups = [
    ...LORE_ORDER.filter(g => byGroup.has(g)),
    ...[...byGroup.keys()].filter(g => !LORE_ORDER.includes(g)).sort(),
  ].map(g => ({
    title: g,
    // sort by filename so the "(1) (2) (3)" story ordering survives
    entries: byGroup.get(g)
      .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: 'base' }))
      .map(l => ({ title: l.title, description: l.description, href: l.slug + '/' })),
  }));

  const ov = loreOverview ? body(loreOverview.bodyMd, 2) : { html: '' };

  writePage('art/worldbuild/index.html', T.shell({
    title: 'Baroque', description: loreOverview ? loreOverview.description : 'A worldbuilding project.',
    depth: 2, active: 'art', site: siteFor(2),
    main: T.worldbuild({ overviewHtml: ov.html, groups, backHref: '../' }),
  }));
}

for (const l of loreEntries) {
  const r = body(l.bodyMd, 3);
  writePage(`art/worldbuild/${l.slug}/index.html`, T.shell({
    title: l.title, description: l.description, depth: 3, active: 'art', site: siteFor(3),
    main: T.article({
      title: l.title,
      kicker: 'Baroque · ' + (l.trail.join(' / ') || 'Codex'),
      description: l.description, specs: l.specs, links: l.links,
      body: r.html, headings: r.headings,
      backHref: '../', backLabel: 'Baroque',
    }),
  }));
}

// ── /about/ ───────────────────────────────────────────
{
  const r = intro ? body(intro.bodyMd, 1) : { html: '' };
  const facts = [
    { k: 'Studying',   v: 'Electrical Engineering + Physics, Northeastern University' },
    { k: 'Builds',     v: 'Circuits · Games · Instrumentals · Photography' },
    { k: 'Plays',      v: 'Kenshi · Risk of Rain 2 · Terraria · Noita' },
    { k: 'Loves',      v: "JoJo's Bizarre Adventure · Hunter × Hunter · Marvel" },
    { k: 'Listens to', v: 'Soundtrack · Trip-hop · Chris Christodoulou · Massive Attack · ' +
                          'James Primate · From Grotto · 21 Hertz' },
    { k: 'Contact',    html: '<a href="mailto:kaushal.v@northeastern.edu">kaushal.v@northeastern.edu</a>' },
  ];
  const main = T.about({
    introHtml: r.html,
    facts,
    influences: influences.map(i => ({
      ...i,
      src: T.rel(1) + i.src,
      w: (dimensions[i.src] || {}).w,
      h: (dimensions[i.src] || {}).h,
    })),
  });
  writePage('about/index.html', T.shell({
    title: 'About', description: SITE.tagline, depth: 1, active: 'about',
    site: siteFor(1), main: T.reroot(main, 1),
    ogImage: influences.length ? influences[0].src : null,
  }));
}

// ── /other/ ───────────────────────────────────────────
{
  const noteItems = notes.map(n => {
    const pdf = pdfFor(n);
    return {
      title: n.title, description: n.description, href: n.slug + '/',
      image: coverFor(n, 900), tags: pdf ? ['PDF · ' + pdf.size + ' MB'] : [],
    };
  });

  const main = T.chapterHead({
    num: '04', title: 'Other',
    lede: 'The overflow drawer — physics notes, longer writing, and reviews of things worth reviewing.',
  })
  + T.group({ id: 'notes', title: 'Notes', note: 'Physics C coursework, written out properly.', items: noteItems })
  + T.group({ id: 'reviews', title: 'Reviews', note: 'Games, records and films that earned the words.',
      items: reviews.map(x => ({ title: x.title, description: x.description, href: x.slug + '/', image: coverFor(x, 900) })),
      empty: 'No reviews published yet. Drop a .md file in content/other/reviews/ and rebuild.' })
  + T.group({ id: 'writing', title: 'Writing', note: 'Essays and loose thoughts.',
      items: writing.map(x => ({ title: x.title, description: x.description, href: x.slug + '/', image: coverFor(x, 900) })),
      empty: 'Nothing published yet. Drop a .md file in content/other/writing/ and rebuild.' });

  writePage('other/index.html', T.shell({
    title: 'Other', description: 'Notes, writing and reviews by Vivaan Kaushal.',
    depth: 1, active: 'other', site: siteFor(1), main: T.reroot(main, 1),
  }));
}

for (const n of [...notes, ...reviews, ...writing]) {
  const r = body(n.bodyMd, 2);
  const pdf = pdfFor(n);
  const links = pdf
    ? [...n.links, { url: T.rel(2) + pdf.href, kind: 'link', label: `Download PDF (${pdf.size} MB)` }]
    : n.links;
  const embed = pdf
    ? `<figure class="embed embed--pdf"><iframe src="${T.rel(2)}${pdf.href}#view=FitH" title="${md.escapeHtml(n.title)} (PDF)" loading="lazy"></iframe></figure>`
    : '';
  writePage(`other/${n.slug}/index.html`, T.shell({
    title: n.title, description: n.description, depth: 2, active: 'other', site: siteFor(2),
    main: T.article({
      title: n.title, kicker: notes.includes(n) ? 'Notes' : reviews.includes(n) ? 'Review' : 'Writing',
      description: n.description, specs: n.specs, links,
      body: r.html + embed, headings: r.headings,
      backHref: '../', backLabel: 'Other',
    }),
  }));
}

// ── 404 ───────────────────────────────────────────────
{
  writePage('404.html', T.shell({
    title: 'Lost', description: 'Page not found.', depth: 0, active: '',
    site: siteFor(0), base: SITE.basePath,
    main: `<section class="hero panel--ink halftone" style="min-height:60vh">
      <div class="hero__menacing" aria-hidden="true">ゴゴゴゴゴ</div>
      <div class="hero__inner">
        <p class="kicker kicker--gold">Error 404</p>
        <h1 class="hero__title"><span class="hero__word hero__word--mark">Nothing here</span></h1>
        <p class="hero__lede">This page does not exist — or it did, and I moved it.</p>
        <div class="hero__cta"><a class="btn btn--big" href="${SITE.basePath}">Back to the start <span aria-hidden="true">▸</span></a></div>
      </div>
    </section>`,
  }));
}

/** Site config for a page at `depth`. */
function siteFor(depth) {
  return {
    ...SITE,
    links: SITE.spotify
      ? [{ label: 'Spotify', url: SITE.spotify }, ...SITE.links]
      : SITE.links,
  };
}

} // end buildPages

/**
 * Delete pages from a previous build that nothing generates any more — otherwise a
 * renamed or deleted entry leaves its old URL live forever.
 * Scoped strictly to the generated section folders.
 */
function pruneStalePages() {
  const kept = new Set(pagesWritten.map(p => toUrl(p)));
  let removed = 0;

  for (const root of ['projects', 'art', 'about', 'other']) {
    const abs = path.join(ROOT, root);
    if (!exists(abs)) continue;
    (function sweep(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          sweep(p);
          try { if (!fs.readdirSync(p).length) fs.rmdirSync(p); } catch (_) {}
          continue;
        }
        if (ent.name !== 'index.html') continue;
        if (kept.has(toUrl(path.relative(ROOT, p)))) continue;
        fs.unlinkSync(p);
        removed++;
      }
    })(abs);
  }
  return removed;
}

// ── Static extras ─────────────────────────────────────

fs.writeFileSync(path.join(ROOT, '.nojekyll'), '', 'utf8');

fs.writeFileSync(path.join(ASSETS, 'favicon.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#12100e"/>
  <path d="M8 8h16l8 30 8-30h16L40 56H24z" fill="#efe9dd"/>
  <path d="M0 46l64-22v10L0 56z" fill="#ff2d6f" opacity=".9"/>
</svg>`, 'utf8');

// ── Report ────────────────────────────────────────────

buildPages();                       // pass 1 — discover images

runDerivations().then(({ made, skipped, pruned }) => {
  DRY = false;                      // pass 2 — emit HTML with real dimensions
  pagesWritten = [];
  buildPages();
  const stale = pruneStalePages();

  console.log(`  projects        ${String(projects.length).padStart(4)}  (${gamedev.length} game · ${electronics.length} electronics)`);
  console.log(`  photo albums    ${String(albums.length).padStart(4)}  (${photoCount} photographs)`);
  console.log(`  lore entries    ${String(loreEntries.length).padStart(4)}`);
  console.log(`  tracks          ${String(tracks.length).padStart(4)}`);
  console.log(`  other           ${String(notes.length + reviews.length + writing.length).padStart(4)}`);
  console.log('  ' + '─'.repeat(42));
  console.log(`  images          ${String(made).padStart(4)} generated, ${skipped} cached, ${pruned} pruned`);
  console.log(`  pages           ${String(pagesWritten.length).padStart(4)} written, ${stale} stale removed`);
  console.log('  ' + '─'.repeat(42));
  console.log('  done. serve the folder to preview:  npx serve .\n');
}).catch(err => {
  console.error('\n  build failed:', err);
  process.exit(1);
});
