---
type: Behavior
title: Runtime behavior of the app
description: What the JavaScript in index.html does, from loading colors.json to filtering, search, preview and map interaction.
resource: https://github.com/fhkit/colorpedia.org/blob/main/index.html
tags: [app, javascript, behavior]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Startup (`boot()`)
1. Set up the cookie banner.
2. `fetch("./colors.json")`. On failure, show a hint (opening the file from `file://` does not work; serve it over
   HTTP, e.g. `python3 -m http.server`).
3. Remove `Grün`, `Rot` and `Blau` from every color except the pure primaries (data workaround).
4. Show counts from `meta`, wire up events, `hydrateMapTooltips()` (rewrite every polygon's `data-name` and
   `<title>` from `colors.json`), then `render()`.

# Names
* `allNames(c)`: EN → DE → JA → BRAND. Used for chips, tooltips and the copy buttons.
* `displayName(c, raw)`: Japanese names as `桜色 · Sakura-iro`, brand names unchanged, everything else through
  `prettyName` (CamelCase → words → Title Case; `titleCase` also capitalizes after a bracket).
* Chip tags: `EN`, `DE` (dashed border), `JA` (double border), `BRAND` (dotted border). Clicking a chip copies the raw name.

# Filtering
`filtered = search(family(source(COLORS)))`:
* **Source tab**: All, or only colors with a name in that language/brand.
* **Family tab**: the `family` field.
* **Search** (`matchesQuery`): matches the hex or any name of the active source. The comparison ignores case,
  spaces, `_`, `-` and accents (`norm`). In "All Colors" it also searches romaji and RAL codes, so "sakura",
  "kobai" and "RAL 7016" all work.
The Grid shows `filtered`; the Map dims (`.dim`) every cell not in `filtered` (the selected one stays lit).

# Saturation plates
* Tabs above the map (`#plateTabs`, `renderPlateTabs`) show each plate with the number of colors that pass the
  current filters. `setPlate(key)` makes that pane `active`.
* When the search text changes, the map jumps to the plate with the most matches (`followMatches`); on other
  re-renders it only leaves a plate that has no match left.
* Picking a color outside the map (grid, favorites, search + Enter) switches to that color's plate
  (`pickColor`), and so does switching to the Map view.
* White is on every plate, so it never causes a switch.

# Map interaction (`wireMapInteractions`)
One listener on `#mapWrap` for `mousemove` and `pointerdown` (preview) and `click` (pick). It finds the cell with
`closest("[data-hex]")` and looks up the color by hex. Dimmed cells ignore events. Picking adds the color to
Recent. The selected cell gets `.sel` and is moved to the end of its SVG parent so its outline is on top.

# Storage (localStorage)
`namedColorFavorites:v3` (a set of hex values), `namedColorRecent:v3` (up to 24 hex values),
`colorpedia_cookie_consent`.

# Keyboard and touch
`/` focuses search, `Esc` clears it, `Enter` picks, `f` toggles favorite, arrow keys move in the **Grid** view only.
On touch devices, swiping left or right toggles Map and Grid.
