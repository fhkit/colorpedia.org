---
type: Playbook
title: Add colors
description: Step-by-step playbook for adding named colors to Colorpedia without breaking the map.
resource: https://github.com/fhkit/colorpedia.org/blob/main/tools/colorpedia.py
tags: [howto, playbook, add-colors]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Before you start
Read [/map/layout-rules.md](/map/layout-rules.md). You **never place a color on the map yourself**: you add
data, and the tool computes every position. Do not paste polygons into `index.html`.

# A. Add a whole list (preferred)
1. Create `data/sources/<lang>_<source>.json`:
   ```json
   { "source": "https://…", "license": "…", "retrieved": "YYYY-MM-DD", "lang": "de",
     "colors": [ { "hex": "#383e42", "name": "Anthrazitgrau", "code": "RAL 7016" } ] }
   ```
   * `lang`: `en`, `de` or `ja`. For `ja` also give `"romaji"` (and optionally `"meaning"`).
   * `hex`: `#rrggbb` (any case; it is lower-cased).
   * `name`: as it should be shown. German with umlauts; English in normal words (`"Blue (Crayola)"`).
   * `code` (optional): catalogue number, saved in `codes` and searchable.
2. Run `python3 tools/colorpedia.py all` (import + build + check).
3. Read the import line: how many names were added, how many new colors. Names that already exist in the same
   language are **skipped on purpose** (names stay unique per language).
4. Look at the result in a browser (see [/howto/build-and-check.md](/howto/build-and-check.md)).

# B. Add or change a single color
1. Edit `colors.json` (or better, add it to a source file as in A so it survives a future re-import).
   New entry: `{"hex": "#rrggbb", "family": "", "names_en": [], "names_de": [], "names_ja": [], "names_brand": []}`
   plus the names. Brand colors go in `names_brand`.
2. Run `python3 tools/colorpedia.py all`. It sets `family`, recounts `meta` and rebuilds the map.

# Rules for names
* One hex = one entry. Two names for the same hex go into the same entry.
* A name belongs to exactly one hex per language. Do not add a generic word (`Blau`, `Rot`) to many colors;
  this is a known problem in the old data ([/data/known-issues.md](/data/known-issues.md)).
* Only add names that really are color names in that language, from a citable source. **Do not machine-translate**
  English names into German or Japanese; that is how the old data got `Rosen` and `Dunkel`.
* Japanese: kanji/kana in `names_ja`, Hepburn romaji (macrons allowed) in `names_ja_romaji`, same index.

# Checklist before committing
- [ ] `python3 tools/colorpedia.py check` shows `0 errors`.
- [ ] The map looks right: white in the center, a grey spoke down to black, hues in order around the wheel.
- [ ] The new colors are found by search and show the right chips (EN/DE/JA/BRAND).
- [ ] The source file names its source and license.
- [ ] Add a line to [/log.md](/log.md) for bigger additions.
