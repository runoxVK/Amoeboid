#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   AMOEBOID — build.js
   Run with: node build.js
   ═══════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

const STRUCTURE = {
  home:        { subsections: null },
  vomit:       { subsections: ['ee', 'gamedev', 'worldbuild', 'misc', 'legacy'] },
  digestion:   { subsections: ['photo', 'music', 'other', 'knowledge'] },
  consumption: { subsections: ['games', 'media', 'music'] },
};

const CONTENT_DIR = path.join(__dirname, 'content');
const OUT_FILE    = path.join(__dirname, 'content.json');
const PANEL_DIR   = path.join(__dirname, 'assets', 'panel-images');
const PANEL_EXTS  = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

// ── Helpers ───────────────────────────────────────────

function slugToTitle(filename) {
  return filename
    .replace(/\.md$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function stripObsidian(text) {
  return text
    .replace(/!\[\[[^\]]*\.(pdf|PDF|docx|xlsx|pptx)\]\]/g, '')
    .replace(/!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi, (_, f) => {
      const base = f.split('/').pop().split('\\').pop();
      return '![' + base + '](assets/images/' + base + ')';
    })
    .replace(/!\[\[[^\]]*\]\]/g, '')
    // [[File|Alias]] → clickable wikilink with alias text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<span class="wikilink" data-target="$1">$2</span>')
    // [[#Section]] → plain text
    .replace(/\[\[[^\]]*#([^\]]+)\]\]/g, '$1')
    // [[File]] → clickable wikilink
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-target="$1">$1</span>');
}

function extractDescription(raw) {
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!') || t.startsWith('>') ||
        t.startsWith('-') || t.startsWith('*') || t.startsWith('|')) continue;
    const plain = t
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (plain.length > 10) return plain.slice(0, 160) + (plain.length > 160 ? '…' : '');
  }
  return '';
}

/** Parse optional description line from anywhere in the file */
function parseFrontmatter(raw) {
  const lines = raw.split('\n');
  const descIdx = lines.findIndex(l => l.trim().startsWith('description:'));
  if (descIdx === -1) return { description: null, body: raw };
  const description = lines[descIdx].replace(/^description:\s*/i, '').trim();
  const body = lines.filter((_, i) => i !== descIdx).join('\n').trim();
  return { description, body };
}

function readDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => fs.statSync(path.join(dirPath, b)).mtimeMs - fs.statSync(path.join(dirPath, a)).mtimeMs)
    .map(filename => {
      const raw   = fs.readFileSync(path.join(dirPath, filename), 'utf8').trim();
      const { description: fmDesc, body: fmBody } = parseFrontmatter(raw);
      const clean = stripObsidian(fmBody);
      const slug  = filename.replace(/\.md$/i, '');
      const thumbBase = path.join(__dirname, 'assets', 'thumbnails', slug);
      let thumbnail = null;
      for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.webp']) {
        if (fs.existsSync(thumbBase + ext)) { thumbnail = 'assets/thumbnails/' + slug + ext; break; }
      }
      const pdfPath = path.join(__dirname, 'assets', 'pdfs', slug + '.pdf');
      return {
        title: slugToTitle(filename),
        description: fmDesc || extractDescription(clean),
        thumbnail,
        pdf: fs.existsSync(pdfPath) ? 'assets/pdfs/' + slug + '.pdf' : null,
        body: clean,
      };
    });
}

/** Recursively scan a directory into a tree for worldbuild */
function readTree(dirPath) {
  if (!fs.existsSync(dirPath)) return { files: [], folders: {} };
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result  = { files: [], folders: {} };
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.folders[entry.name] = readTree(full);
    } else if (entry.name.endsWith('.md')) {
      const raw   = fs.readFileSync(full, 'utf8').trim();
      const { description: fmDesc, body: fmBody } = parseFrontmatter(raw);
      const clean = stripObsidian(fmBody);
      const slug  = entry.name.replace(/\.md$/i, '');
      result.files.push({
        title:       slugToTitle(entry.name),
        description: fmDesc || extractDescription(clean),
        body:        clean,
        slug,
      });
    }
  }
  // sort files newest first
  result.files.sort((a, b) => {
    const sa = fs.statSync(path.join(dirPath, a.slug + '.md')).mtimeMs;
    const sb = fs.statSync(path.join(dirPath, b.slug + '.md')).mtimeMs;
    return sb - sa;
  });
  return result;
}
async function convertToWebP() {
  let sharp;
  try { sharp = require('sharp'); } catch(_) {
    console.log('  (sharp not installed — skipping WebP conversion)');
    console.log('  run: npm install sharp   to enable auto-conversion\n');
    return;
  }

  const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.gif'];
  let converted  = 0;

  // convert all images in a directory (optionally recursive)
  async function convertDir(dir, recursive, quality) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && recursive) {
        await convertDir(path.join(dir, entry.name), recursive, quality);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMG_EXTS.includes(ext)) continue;
      const src  = path.join(dir, entry.name);
      const dest = path.join(dir, path.basename(entry.name, ext) + '.webp');
      try {
        await sharp(src).webp({ quality }).toFile(dest);
        fs.unlinkSync(src);
        converted++;
        console.log('  converted: ' + path.relative(__dirname, src) + ' → ' + path.basename(dest));
      } catch(e) {
        console.log('  warning: could not convert ' + entry.name);
      }
    }
  }

  // panel images — quality 82
  await convertDir(path.join(__dirname, 'assets', 'panel-images'), false, 82);

  // photo albums — quality 85, recursive
  await convertDir(path.join(__dirname, 'assets', 'images', 'photo'), true, 85);

  // thumbnails — quality 82
  await convertDir(path.join(__dirname, 'assets', 'thumbnails'), false, 82);

  if (converted) console.log('  ' + converted + ' image(s) → WebP\n');
  else console.log('  all images already WebP\n');
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('\n  AMOEBOID build\n  ─────────────────────────────────');

  // 1. Convert panel images to WebP
  await convertToWebP();

  // 2. Build content
  const output = {};
  for (const [section, config] of Object.entries(STRUCTURE)) {
    if (config.subsections === null) {
      output[section] = readDir(path.join(CONTENT_DIR, section));
    } else {
      output[section] = {};
      for (const sub of config.subsections) {
        output[section][sub] = readDir(path.join(CONTENT_DIR, section, sub));
      }
    }
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  // 3. Scan panel images
  const panelImages = fs.existsSync(PANEL_DIR)
    ? fs.readdirSync(PANEL_DIR)
        .filter(f => PANEL_EXTS.includes(path.extname(f).toLowerCase()))
        .sort()
        .map(f => 'assets/panel-images/' + f)
    : [];
  const parsed = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  parsed._panelImages    = panelImages;
  parsed._worldbuildTree = readTree(path.join(CONTENT_DIR, 'vomit', 'worldbuild'));

  // scan music folder
  const MUSIC_DIR = path.join(__dirname, 'assets', 'music');
  parsed._music = fs.existsSync(MUSIC_DIR)
    ? fs.readdirSync(MUSIC_DIR)
        .filter(f => ['.mp3','.ogg','.wav','.m4a'].includes(path.extname(f).toLowerCase()))
        .map(f => 'assets/music/' + f)
    : [];

  // scan photo albums — each subfolder of assets/images/photo/ is an album
  const PHOTO_DIR  = path.join(__dirname, 'assets', 'images', 'photo');
  const IMG_EXTS   = ['.jpg','.jpeg','.png','.webp','.gif'];
  parsed._photoAlbums = [];
  if (fs.existsSync(PHOTO_DIR)) {
    const albumDirs = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .sort((a, b) => {
        const mtA = fs.statSync(path.join(PHOTO_DIR, a.name)).mtimeMs;
        const mtB = fs.statSync(path.join(PHOTO_DIR, b.name)).mtimeMs;
        return mtB - mtA; // newest first
      });

    for (const dir of albumDirs) {
      const albumPath = path.join(PHOTO_DIR, dir.name);
      const images = fs.readdirSync(albumPath)
        .filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(f => 'assets/images/photo/' + dir.name + '/' + f);
      if (!images.length) continue;

      // pull description from matching .md in content/digestion/photo/
      let description = '';
      const mdPath = path.join(CONTENT_DIR, 'digestion', 'photo', dir.name + '.md');
      if (fs.existsSync(mdPath)) {
        const raw = fs.readFileSync(mdPath, 'utf8');
        const { description: d } = parseFrontmatter(raw);
        description = d || extractDescription(raw);
      }

      parsed._photoAlbums.push({
        slug: dir.name,
        title: dir.name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        cover: images[0],
        count: images.length,
        description,
        images,
      });
      console.log('  photo/' + dir.name.padEnd(14) + images.length + ' image(s)');
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(parsed), 'utf8'); // minified — no whitespace

  const slimSize = Math.round(fs.statSync(OUT_FILE).size / 1024);
  console.log('  content.json: ' + slimSize + 'KB (minified)');

  // 4. Report
  let total = 0;
  for (const [section, data] of Object.entries(output)) {
    if (Array.isArray(data)) {
      console.log('  ' + section.padEnd(16) + data.length + ' file(s)');
      total += data.length;
    } else {
      for (const [sub, entries] of Object.entries(data)) {
        console.log('  ' + (section + '/' + sub).padEnd(16) + entries.length + ' file(s)');
        total += entries.length;
      }
    }
  }
  console.log('  ─────────────────────────────────');
  console.log('  total: ' + total + ' file(s) → content.json');
  console.log('  panel-images: ' + panelImages.length + ' image(s)\n');
}

main().catch(console.error);