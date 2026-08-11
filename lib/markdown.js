/* ═══════════════════════════════════════════════════════
   markdown.js — Obsidian-flavoured markdown → site HTML
   ═══════════════════════════════════════════════════════ */

'use strict';

const { marked } = require('../assets/marked.min.js');

marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

// ── Slugs ─────────────────────────────────────────────
function slugify(s) {
  return String(s)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’‘"“”`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Front matter / meta extraction ────────────────────
// Vivaan's files are inconsistent by design (they come out of Obsidian).
// We pull structured meta out of whatever shape they arrive in.

const META_KEYS = /^(title|description|status|year|cover|order|tags|draft)\s*:/i;

/** Classify a bare URL into a named link. */
function classifyLink(url) {
  if (/github\.com/i.test(url))                   return { kind: 'github', label: 'GitHub' };
  if (/itch\.io/i.test(url))                      return { kind: 'itch',   label: 'itch.io' };
  if (/(youtube\.com|youtu\.be)/i.test(url))      return { kind: 'video',  label: 'Watch' };
  if (/drive\.google\.com/i.test(url))            return { kind: 'video',  label: 'Progress video' };
  if (/open\.spotify\.com/i.test(url))            return { kind: 'spotify',label: 'Spotify' };
  if (/instagram\.com/i.test(url))                return { kind: 'instagram', label: 'Instagram' };
  return { kind: 'link', label: 'Link' };
}

/**
 * Split a raw .md file into { meta, specs, links, body }.
 *   meta  — description/status/year/... key: value lines (found anywhere)
 *   specs — the **Key:** value pairs from the header block, e.g. Language / Engine
 *   links — github / itch / video URLs found anywhere in the header block
 *   body  — the markdown with all of the above removed
 */
function parseMeta(raw) {
  const meta  = {};
  const specs = [];
  const links = [];
  const seenLinks = new Set();

  const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
  const keep  = [];

  // Where does the "header block" end? First `---` rule or first `##` heading.
  let headerEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '---' || /^#{2,}\s/.test(t)) { headerEnd = i; break; }
  }

  const addLink = (url, labelHint) => {
    const clean = url.replace(/[.,)]+$/, '');
    if (seenLinks.has(clean)) return;
    seenLinks.add(clean);
    const c = classifyLink(clean);
    links.push({ url: clean, kind: c.kind, label: labelHint || c.label });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t    = line.trim();

    // key: value meta — anywhere in the file (Obsidian habit)
    if (META_KEYS.test(t)) {
      const idx = t.indexOf(':');
      const key = t.slice(0, idx).trim().toLowerCase();
      const val = t.slice(idx + 1).trim();
      if (!meta[key]) meta[key] = val;
      continue; // drop from body
    }

    if (i < headerEnd) {
      // `GitHub: https://…` / `itch.io: https://…`
      const labelled = t.match(/^([A-Za-z][\w .]{0,20}):\s*(https?:\/\/\S+)$/);
      if (labelled) { addLink(labelled[2], labelled[1].trim()); continue; }

      // a line that is nothing but a URL
      if (/^https?:\/\/\S+$/.test(t)) { addLink(t); continue; }

      // **Key:** value  (possibly several on one line)
      if (/\*\*[^*]+:\*\*/.test(t)) {
        const re = /\*\*\s*([^*:]+?)\s*:\s*\*\*\s*([^*]*)/g;
        let m, found = false;
        while ((m = re.exec(t))) {
          const k = m[1].trim();
          const v = m[2].trim().replace(/\s+$/, '');
          if (k && v) { specs.push({ key: k, value: v }); found = true; }
        }
        if (found) continue;
      }

      // the author byline — redundant on his own site
      if (/^_?Vivaan Kaushal\b.*_?$/i.test(t)) continue;
    }

    keep.push(line);
  }

  // Some files park the repo link in its own "## Github" section further down.
  // Promote those to header buttons so every project header is consistent.
  const REPO_URL     = /^(https?:\/\/(?:www\.)?(?:github\.com|[\w-]+\.itch\.io|itch\.io)\/\S*)$/i;
  const REPO_HEADING = /^#{1,6}\s*(github|git\s*hub|itch\.?\s*io|links?|source(?:\s*code)?)\s*:?\s*$/i;

  const body = [];
  for (const line of keep) {
    const t = line.trim();
    if (REPO_URL.test(t)) {
      addLink(t);
      // drop the heading that introduced it, if that is all the heading was for
      for (let j = body.length - 1; j >= 0; j--) {
        if (!body[j].trim()) continue;
        if (REPO_HEADING.test(body[j].trim())) body.splice(j, 1);
        break;
      }
      continue;
    }
    body.push(line);
  }

  // trim leading blank lines / stray rule left behind by the header block
  while (body.length && !body[0].trim()) body.shift();
  if (body.length && body[0].trim() === '---') body.shift();
  while (body.length && !body[0].trim()) body.shift();

  return { meta, specs, links, body: body.join('\n').trim() };
}

/** First real sentence of prose — used when there is no description:. */
function autoDescription(md) {
  for (const line of String(md).split('\n')) {
    const t = line.trim();
    if (!t || /^[#>\-*|!]/.test(t) || /^\d+[.)]/.test(t) || t === '---') continue;
    const plain = t
      .replace(/!\[\[[^\]]*\]\]/g, '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[#?([^\]]+)\]\]/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    if (plain.length > 24) return plain.length > 190 ? plain.slice(0, 190).trim() + '…' : plain;
  }
  return '';
}

// ── Obsidian syntax → markdown/HTML ───────────────────
const TASK_META = /[➕✅🛫🔺🔼⏫🔽📅⏳🔁⛔🏁]️?\s*(\d{4}-\d{2}-\d{2})?/gu;

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|flac)$/i;
const IMG_EXT   = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

/**
 * @param {string} md
 * @param {object} ctx
 *   ctx.image(nameOrPath) -> { src, width, height } | null   (registers a derivative)
 *   ctx.audio(name)       -> { src, title } | null
 *   ctx.wikilink(target)  -> { href } | null
 */
function transformObsidian(md, ctx) {
  let out = String(md);

  // Obsidian task metadata emojis + dates
  out = out.replace(TASK_META, '').replace(/[ \t]+$/gm, '');

  // ![[file.pdf]] and friends — nothing useful to show inline
  out = out.replace(/!\[\[[^\]]*\.(pdf|docx?|xlsx?|pptx?|zip)\]\]/gi, '');

  // ![[track.mp3]] → real audio element
  out = out.replace(/!\[\[([^\]|]+)\]\]/g, (whole, target) => {
    const name = target.split(/[/\\]/).pop().trim();
    if (!AUDIO_EXT.test(name)) return whole;
    const a = ctx.audio ? ctx.audio(name) : null;
    if (!a) return '';
    return `\n\n<figure class="embed embed--audio">
  <figcaption class="embed__cap"><span class="tag tag--gold">Audio</span> ${escapeHtml(a.title)}</figcaption>
  <audio controls preload="none" src="${a.src}"></audio>
</figure>\n\n`;
  });

  // ![[image.png]] / ![[image.png|240]] → markdown image (derivative path)
  out = out.replace(/!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (whole, target, size) => {
    const name = target.split(/[/\\]/).pop().trim();
    if (!IMG_EXT.test(name)) return '';
    const img = ctx.image ? ctx.image(name) : null;
    if (!img) return '';
    const alt = escapeHtml(name.replace(IMG_EXT, '').replace(/[-_]/g, ' '));
    const small = size && /^\d+$/.test(size.trim()) && +size.trim() <= 120;
    const cls = small ? ' embed--sprite' : '';
    const dim = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : '';
    return `\n\n<figure class="embed${cls}"><img src="${img.src}" alt="${alt}" loading="lazy" decoding="async"${dim}></figure>\n\n`;
  });

  // anything else in ![[ ]] we can't render
  out = out.replace(/!\[\[[^\]]*\]\]/g, '');

  // [[#Section|Alias]] and [[#Section]] → in-page anchors
  out = out.replace(/\[\[#([^\]|]+)\|([^\]]+)\]\]/g, (_, sec, alias) => anchor(sec, alias));
  out = out.replace(/\[\[#([^\]]+)\]\]/g, (_, sec) => anchor(sec, sec));

  // [[Note#Section|Alias]] → note page + anchor
  out = out.replace(/\[\[([^\]|#]+)#([^\]|]+)(?:\|([^\]]+))?\]\]/g, (whole, note, sec, alias) => {
    const label = clean(alias || sec, sec);
    const link = ctx.wikilink ? ctx.wikilink(note.trim()) : null;
    if (!link) return dead(note, label);
    return `<a class="wikilink" href="${link.href}#${slugify(sec)}">${escapeHtml(label)}</a>`;
  });

  // [[Note|Alias]] and [[Note]]
  out = out.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (whole, target, alias) => wiki(target, alias));
  out = out.replace(/\[\[([^\]]+)\]\]/g, (whole, target) => wiki(target, target));

  /** Obsidian tolerates [[Note||Alias]] and [[Note| Alias]] — clean both up. */
  function clean(text, fallback) {
    return String(text).replace(/^\|+/, '').trim() || String(fallback).trim();
  }

  function anchor(sec, text) {
    return `<a class="wikilink wikilink--anchor" href="#${slugify(sec)}">${escapeHtml(clean(text, sec))}</a>`;
  }

  function dead(target, label) {
    return `<span class="wikilink wikilink--dead" title="No entry named “${escapeHtml(String(target).trim())}” yet">${escapeHtml(label)}</span>`;
  }

  function wiki(target, text) {
    const label = clean(text, target);
    const link = ctx.wikilink ? ctx.wikilink(target.trim()) : null;
    if (link) return `<a class="wikilink" href="${link.href}">${escapeHtml(label)}</a>`;
    return dead(target, label);
  }

  return out;
}

// ── HTML post-processing ──────────────────────────────
const YT_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function postProcess(html, opts = {}) {
  const headings = [];
  let out = html;

  // 1. Give every heading a stable, wikilink-compatible id.
  out = out.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g, (whole, lvl, attrs, inner) => {
    const text = stripTags(inner);
    if (!text) return whole;
    const id = slugify(text);
    const clean = attrs.replace(/\s*id="[^"]*"/g, '');
    if (+lvl <= 3) headings.push({ level: +lvl, text, id });
    return `<h${lvl} id="${id}"${clean}><a class="anchor" href="#${id}" aria-label="Link to this section">§</a>${inner}</h${lvl}>`;
  });

  // 2. A paragraph that is nothing but a YouTube link → embed.
  out = out.replace(/<p>\s*(?:<a [^>]*href="([^"]+)"[^>]*>)?\s*(https?:\/\/[^\s<]+)?\s*(?:<\/a>)?\s*<\/p>/g,
    (whole, href, bare) => {
      const url = href || bare;
      if (!url) return whole;
      const m = url.match(YT_ID);
      if (!m) return whole;
      return `<figure class="embed embed--video"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="YouTube video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></figure>`;
    });

  // 3. External links open in a new tab.
  out = out.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a target="_blank" rel="noopener noreferrer" href="$1"');

  // 4. Tables get a horizontal scroll container (they are wide and he uses many).
  out = out.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="table-wrap"><table>$1</table></div>');

  // 5. Loose images (from normal markdown) become figures too.
  out = out.replace(/<p>\s*(<img [^>]*>)\s*<\/p>/g, '<figure class="embed">$1</figure>');
  out = out.replace(/<img (?![^>]*loading=)/g, '<img loading="lazy" decoding="async" ');

  // 6. Task lists
  out = out.replace(/<li>\s*<input([^>]*)disabled([^>]*)>/g, '<li class="task"><input$1disabled$2>');

  return { html: out, headings, prefix: opts.prefix };
}

/** Full pipeline: raw markdown → { html, headings }. */
function render(md, ctx = {}) {
  const transformed = transformObsidian(md, ctx);
  const raw = marked.parse(transformed);
  return postProcess(raw, ctx);
}

module.exports = {
  slugify, stripTags, escapeHtml,
  parseMeta, autoDescription,
  transformObsidian, render, classifyLink,
};
