---
type: Project
title: Colorpedia overview
description: Colorpedia is a static, single-page color picker that lists named colors in English, German, Japanese and brand names, deduplicated by hex value.
resource: https://colorpedia.org
tags: [colorpedia, overview, static-site]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# What it is
Colorpedia is a *name-first* color picker. Every color is one hex value (for example `#fcc9b9`) that carries
one or more names: English (`names_en`), German (`names_de`), Japanese (`names_ja`, with romaji in
`names_ja_romaji`) and brand names (`names_brand`). There are no duplicates by hex: if two sources name the same
hex, both names go on the same entry.

# Files
| File | Role |
|---|---|
| `index.html` | The whole app: CSS, markup, the **inline SVG hex map**, and the JavaScript. See [/app/page-structure.md](/app/page-structure.md). |
| `colors.json` | The data: one entry per hex. Fetched at runtime. See [/data/colors-json.md](/data/colors-json.md). |
| `tools/colorpedia.py` | Maintenance tool: imports name sources, **generates the SVG map** into `index.html`, validates everything. See [/howto/build-and-check.md](/howto/build-and-check.md). |
| `data/sources/*.json` | Name lists the tool imports (with provenance). See [/data/sources.md](/data/sources.md). |
| `manifest.webmanifest`, `Icon.svg` | PWA manifest and icon (an emoji on a dark rounded square). |
| `imprint.html` | Legal imprint (German "Impressum"). |
| `robots.txt` | Allows all crawlers. |

# The two views
* **Map**: the SVG in `index.html`. Every color is one hexagon, arranged as a color wheel. See [/map/](/map/).
* **Grid**: plain buttons generated in JavaScript from `colors.json`, in `colors.json` order.

Both views use the same filters (source tab, family tab, search text) and share one preview panel.

# Golden rule
`colors.json` and the SVG map must always contain **exactly the same set of hex values**. Never edit one
without the other. The tool keeps them in sync: edit data, then run `python3 tools/colorpedia.py build`.
