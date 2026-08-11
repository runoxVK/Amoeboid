# Personal site

Static site generated from a folder of markdown. Write in Obsidian, run one command,
commit the result. No framework, no bundler, no runtime dependencies in the browser.

```bash
npm install      # once — installs sharp for image resizing
node build.js    # regenerate every page
```

Then open `index.html`, or serve the folder:

```bash
npx --yes serve .
```

## How it works

`build.js` reads `content/`, renders each `.md` file, and writes real HTML pages to the
repo root. GitHub Pages serves those files directly — every section has a shareable URL
and the site works with JavaScript disabled.

| Folder | Becomes |
| --- | --- |
| `content/projects/gamedev/` | `/projects/<slug>/` — game development |
| `content/projects/electronics/` | `/projects/<slug>/` — electronics |
| `content/art/photography/<album>.md` | description for the matching `assets/images/photo/<album>/` folder |
| `content/art/music/<track>.md` | title + notes for the matching file in `assets/music/` |
| `content/art/worldbuild/` | `/art/worldbuild/<slug>/` — Baroque, one page per entry |
| `content/about/intro.md` | the About page |
| `content/about/influences.md` | notes under each image on the influences wall |
| `content/other/notes/` | `/other/<slug>/` — with the PDF embedded if one matches |
| `content/other/reviews/`, `content/other/writing/` | `/other/<slug>/` |

## Adding things

**A project.** Drop a `.md` file in `content/projects/gamedev/` or
`content/projects/electronics/`. Optionally add `assets/thumbnails/<same-name>.<ext>`
for the card image. Rebuild.

**A photo album.** Create `assets/images/photo/<album-name>/` and put the photos in it.
Add `content/art/photography/<album-name>.md` with a `description:` line. Add the album
to `PHOTO_ORDER` in `build.js` to control where it appears. Rebuild.

**A track.** Drop an mp3 in `assets/music/` and it appears on the Music page. Add
`content/art/music/<filename>.md` with `title:` and `description:` lines to control how
it reads — otherwise the filename is used.

**An influence.** Add the image to `assets/panel-images/`, add an entry to `INFLUENCES`
in `build.js`, and add a note line in `content/about/influences.md`.

## Markdown supported

Standard markdown plus the Obsidian syntax you already write:

- `[[Entry]]` and `[[Entry|alias]]` link to worldbuild pages
- `[[#Section]]` links to a heading on the same page
- `[[Entry#Section]]` links to a heading on another page
- `![[image.png]]` and `![[image.png|64]]` embed from `assets/images/` (the size hint
  renders small images as crisp pixel-art sprites)
- `![[track.mp3]]` embeds an audio player from `assets/music/`
- `- [ ]` / `- [x]` task lists — the `➕ 2026-01-01 ✅` metadata is stripped automatically
- A bare YouTube URL on its own line becomes an embedded player
- `**Key:** value` lines at the top of a file become the spec table in the page header
- A GitHub or itch.io URL on its own line becomes a button in the page header, wherever
  in the file it appears

Recognised `key: value` lines, which can sit anywhere in a file and are stripped from the
rendered page:

| Key | Effect |
| --- | --- |
| `title:` | Overrides the title derived from the filename |
| `description:` | Card blurb and `<meta name="description">` |
| `status:` | Badge on the card (e.g. `status: Dev paused`; anything matching *cancel* also greys the card out) |
| `cover:` | Card/hero image — a filename in `assets/images/` or `assets/thumbnails/` |
| `tags:` | Comma-separated chips |

If no `cover:` and no matching `assets/thumbnails/<name>` file exists, the **last image
embedded in the document** is used as the card image.

### Filenames

A filename containing spaces is treated as a written title and used verbatim, so
`Sub-zero Summits.md` keeps its hyphen and `Zorak's Wrath.md` keeps its lowercase `s`.
A filename without spaces is treated as a slug and title-cased — `seed-breeder.md`
becomes "Seed Breeder".

A leading `(1)` `(2)` `(3)` orders files on disk and in the listing, but is stripped from
the title and the URL: `(3)Zorak's Wrath.md` → "Zorak's Wrath" at `/art/worldbuild/zoraks-wrath/`.
Wikilinks resolve with or without the prefix, so `[[Zorak's Wrath]]` works.

Every worldbuild entry should carry a `description:` line — that is what shows under its
name on the Baroque index. Entries that have not been written yet say `empty`.

## Images

`build.js` generates resized WebP derivatives into `assets/derived/` and the pages point
at those — originals in `assets/images/` are never served. Rebuilds are incremental;
only changed sources are reprocessed. Delete `assets/derived/` to force a full rebuild.

## Config

Everything site-wide lives in the `SITE` object at the top of `build.js`: tagline, social
links, the Spotify artist URL, and `basePath` (currently `/PersonalSiteVK/`, used only by
`404.html` — change it to `/` if you move to a custom domain).

`SITE.spotify` drives the "Open in Spotify" button in the Music page header and the
Spotify link in the sidebar and footer.

`SITE.releases` is your discography. Spotify has no embed that lists an artist's albums —
the artist embed only ever shows popular tracks — so each release gets its own player.
When you put something new out, copy its share link and add a line, newest first:

```js
releases: [
  { title: 'Ambertala', kind: 'EP', url: 'https://open.spotify.com/album/3tR9ah0…' },
]
```

Album, EP, single, playlist and track links all work; the embed URL is derived from
whatever you paste. Leave `releases` empty and the page falls back to a single artist
embed.

## Layout

```
build.js            pipeline: content → pages
lib/markdown.js     Obsidian markdown → HTML
lib/templates.js    page shells and section layouts
assets/css/site.css the design system
assets/js/site.js   mobile nav, photo lightbox, TOC highlighting (enhancement only)
```
