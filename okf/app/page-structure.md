---
type: Source File
title: index.html structure
description: A map of the single-file app index.html, which holds all the CSS, the markup, the generated SVG map and the JavaScript.
resource: https://github.com/fhkit/colorpedia.org/blob/main/index.html
tags: [app, html, structure]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Top to bottom
1. **`<head>`**: meta tags, manifest, `<link rel="preload" href="./colors.json" as="fetch" crossorigin="anonymous">`
   (without `crossorigin` the preload is ignored), then one big `<style>` block. The dark theme uses variables in
   `:root` (`--bg #0b0c10`, `--text`, `--muted`, `--border`).
2. **Cookie banner** `#cookieConsent`: stores the choice in `localStorage` and in a cookie. No tracking.
3. **Top bar**: brand link with `#metaCounts`, search `#q` and `#clearBtn`, view switch `#viewMap` / `#viewGrid`,
   and shortcut hints.
4. **Sidebar**: `#sourceTabs` (All / English / German / Japanese / Brand) and `#familyTabs`, both filled by the script.
5. **Main**: `#title`, `#hint`, `#gridWrap` (Grid view), **`#mapWrap` with the generated map block** between
   `<!-- COLORMAP:BEGIN … -->` and `<!-- COLORMAP:END -->` (see [/map/svg-markup.md](/map/svg-markup.md)),
   then the Favorites (`#favRow`) and Recent (`#recentRow`) rows.
6. **Preview panel**: big swatch, radar chart `#radarSvg` (R, G, B, saturation, tint), RGB and hue bars,
   name chips `#pName`, hex `#pHex`, copy and favorite buttons.
7. **Footer** and toast.
8. **`<script>`**: one `boot()` function (see [/app/runtime.md](/app/runtime.md)).

# Editing rules
* Only `tools/colorpedia.py build` touches the map block. Everything else is edited by hand.
* The script finds map cells with `[data-hex]` inside `#mapWrap`; keep that attribute if you change the map markup.
* Keep the page self-contained (no build step, no external JS) so it can be deployed as static files.
