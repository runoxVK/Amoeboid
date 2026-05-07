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
  home:        { subsections: null },          // content/home/*.md
  projects:    { subsections: ['ee', 'gamedev', 'worldbuild', 'misc', 'legacy'] },
  art:         { subsections: ['photo', 'music', 'other'] },
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

/** Strip Obsidian-specific syntax that doesn't render on the web.
 *  - [[#Section]] wiki links → just the section name
 *  - [[File]] links → just the file name
 *  - [[File|Alias]] links → just the alias
 *  - ![[Embed]] transclusions → removed entirely
 */
function stripObsidian(text) {
  return text
    // remove transclusions: ![[anything]]
    .replace(/!\[\[[^\]]*\]\]/g, '')
    // [[File|Alias]] → Alias
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
    // [[#Section]] or [[File#Section]] → Section name only
    .replace(/\[\[[^\]]*#([^\]]+)\]\]/g, '$1')
    // [[File]] → File
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

/** Read all .md files from a directory.
 *  Returns an array of { title, body } objects, sorted alphabetically.
 *  Missing directories are silently skipped.
 */
function readDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(filename => {
      const fullPath = path.join(dirPath, filename);
      const raw      = fs.readFileSync(fullPath, 'utf8').trim();
      return {
        title: slugToTitle(filename),
        body:  stripObsidian(raw),
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
