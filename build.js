#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   REQUIEM — build.js
   Run with:  node build.js
   Scans the content/ folder and writes content.json.
   Run this once before every git push.
   ═══════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────
// All the sections and subsections the site knows about.
// Keys must match the folder names inside content/.
const STRUCTURE = {
  home:        { subsections: null },
  vomit:       { subsections: ['ee', 'gamedev', 'worldbuild', 'misc', 'legacy'] },
  digestion:   { subsections: ['photo', 'music', 'other', 'knowledge'] },
  consumption: { subsections: ['games', 'media', 'music'] },
};

const CONTENT_DIR = path.join(__dirname, 'content');
const OUT_FILE    = path.join(__dirname, 'content.json');

// ── Helpers ───────────────────────────────────────────

/** Convert a filename slug to a readable title.
 *  "my-cool-project.md" → "My Cool Project"
 */
function slugToTitle(filename) {
  return filename
    .replace(/\.md$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Strip/convert Obsidian-specific syntax */
function stripObsidian(text) {
  return text
    // ![[file.pdf]] — strip PDFs and non-image embeds entirely
    .replace(/!\[\[[^\]]*\.(pdf|PDF|docx|xlsx|pptx)\]\]/g, '')
    // ![[image.png]] or ![[image.jpg]] etc → standard markdown image
    // images are expected in assets/images/
    .replace(/!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi, function(_, filename) {
      // strip any subfolder Obsidian may have prepended
      var base = filename.split('/').pop().split('\\').pop();
      return '![' + base + '](assets/images/' + base + ')';
    })
    // any remaining ![[embed]] — strip
    .replace(/!\[\[[^\]]*\]\]/g, '')
    // [[File|Alias]] → Alias
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    // [[#Section]] → Section name
    .replace(/\[\[[^\]]*#([^\]]+)\]\]/g, '$1')
    // [[File]] → File
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

/** Extract the first plain paragraph as a short description (max 160 chars) */
function extractDescription(raw) {
  const lines = raw.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue;
    if (t.startsWith('!')) continue;
    if (t.startsWith('>')) continue;
    if (t.startsWith('-') || t.startsWith('*')) continue;
    if (t.startsWith('|')) continue;
    // strip inline markdown
    const plain = t
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (plain.length > 10) return plain.slice(0, 160) + (plain.length > 160 ? '…' : '');
  }
  return '';
}

/** Read all .md files from a directory. */
function readDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(dirPath, a)).mtimeMs;
      const statB = fs.statSync(path.join(dirPath, b)).mtimeMs;
      return statB - statA; // newest first
    })
    .map(filename => {
      const fullPath  = path.join(dirPath, filename);
      const raw       = fs.readFileSync(fullPath, 'utf8').trim();
      const clean     = stripObsidian(raw);
      const slug      = filename.replace(/\.md$/i, '');
      // thumbnail: assets/thumbnails/<slug>.png (or .jpg/.gif/.webp)
      const exts      = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const thumbBase = path.join(__dirname, 'assets', 'thumbnails', slug);
      let   thumbnail = null;
      for (const ext of exts) {
        if (fs.existsSync(thumbBase + ext)) {
          thumbnail = 'assets/thumbnails/' + slug + ext;
          break;
        }
      }
      // pdf: assets/pdfs/<slug>.pdf — detected automatically
      const pdfPath = path.join(__dirname, 'assets', 'pdfs', slug + '.pdf');
      const pdf = fs.existsSync(pdfPath) ? 'assets/pdfs/' + slug + '.pdf' : null;

      return {
        title:       slugToTitle(filename),
        description: extractDescription(clean),
        thumbnail,
        pdf,
        body:        clean,
      };
    });
}

// ── Build ─────────────────────────────────────────────

const output = {};

for (const [section, config] of Object.entries(STRUCTURE)) {
  if (config.subsections === null) {
    // flat section (e.g. home) — entries live directly in content/home/
    const dirPath = path.join(CONTENT_DIR, section);
    output[section] = readDir(dirPath);
  } else {
    // section with subsections (e.g. projects/ee)
    output[section] = {};
    for (const sub of config.subsections) {
      const dirPath = path.join(CONTENT_DIR, section, sub);
      output[section][sub] = readDir(dirPath);
    }
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');

// ── Report ────────────────────────────────────────────

let total = 0;
console.log('\n  REQUIEM build\n  ─────────────────────────────────');

for (const [section, data] of Object.entries(output)) {
  if (Array.isArray(data)) {
    console.log(`  ${section.padEnd(16)} ${data.length} file(s)`);
    total += data.length;
  } else {
    for (const [sub, entries] of Object.entries(data)) {
      console.log(`  ${(section + '/' + sub).padEnd(16)} ${entries.length} file(s)`);
      total += entries.length;
    }
  }
}

console.log(`  ─────────────────────────────────`);
console.log(`  total: ${total} file(s) → content.json\n`);