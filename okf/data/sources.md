---
type: Data Source
title: Name sources and merge rules
description: Where Colorpedia's color names come from and how tools/colorpedia.py import merges them into colors.json.
resource: https://github.com/fhkit/colorpedia.org/tree/main/data/sources
tags: [data, sources, provenance, import]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
sources:
  - id: en-wiki
    resource: https://en.wikipedia.org/wiki/List_of_colors:_A%E2%80%93F
    title: "Wikipedia: List of colors (A–F, G–M, N–Z)"
  - id: ja-wiki
    resource: https://en.wikipedia.org/wiki/Traditional_colors_of_Japan
    title: "Wikipedia: Traditional colors of Japan"
  - id: ral-wiki
    resource: https://de.wikipedia.org/wiki/RAL-Farbe
    title: "Wikipedia (de): RAL-Farbe"
  - id: crayola
    resource: https://en.wikipedia.org/wiki/List_of_Crayola_crayon_colors
    title: "Wikipedia: List of Crayola crayon colors"
  - id: xkcd
    resource: https://xkcd.com/color/rgb.txt
    title: "xkcd color survey (CC0)"
  - id: jis
    resource: https://ja.wikipedia.org/wiki/JIS慣用色名
    title: "Wikipedia (ja): JIS慣用色名 (JIS Z 8102)"
  - id: ja-list
    resource: https://ja.wikipedia.org/wiki/日本の色の一覧
    title: "Wikipedia (ja): 日本の色の一覧"
  - id: de-articles
    resource: https://de.wikipedia.org/wiki/Vorlage:Farben_im_Farbkreis
    title: "Wikipedia (de): color articles and Farben im Farbkreis"
---
# Sources in the original data (before 2026-09)
The provenance of the original 971 colors is not recorded. From their shape they are:
* **English**: CamelCase keys of an older Wikipedia-derived color list plus CSS/X11 names (`MintCream`, `KUCrimson`).
* **German**: CSS names translated into German (`Blütenweiß`), RAL Classic names (`Currygelb`, `Weißaluminium`),
  paint marketing names (`Stilles Wasser`, `Wanderlust`) and many automatic translations of the English names
  (see [/data/known-issues.md](/data/known-issues.md)).
* **Brand**: hand-collected brand colors (Google, Microsoft, Spotify, Visa, …) and EN 12368 traffic-light colors.

# Sources added in 2026-09 (`data/sources/*.json`)
| File | Language | Entries | Content |
|---|---|---|---|
| `en_wikipedia_list_of_colors.json` | en | 913 | Every row of the three "List of colors" pages[^en-wiki] (plus Moccasin, whose row has no hex template). |
| `ja_wikipedia_traditional_colors.json` | ja | 228 | Kanji name, romaji, English meaning and hex of the traditional colors of Japan[^ja-wiki]. |
| `de_wikipedia_ral_classic.json` | de | 213 | RAL Classic number, German name and sRGB approximation[^ral-wiki]. |
| `de_wikipedia_color_articles.json` | de | 87 | Hand-curated `{{Farbmuster}}`/`{{Coltit}}` samples from German color articles (Rot, Grün, Blau, Braun, Violett, Türkis, Umbra, …) and the "Farben im Farbkreis" table[^de-articles]. Descriptive labels ("Webfarbe Cyan") and bare base words are left out. |
| `en_wikipedia_crayola_crayon_colors.json` | en | 397 | Standard and specialty Crayola crayons[^crayola]. |
| `en_xkcd_color_survey.json` | en | 914 | The xkcd color survey names[^xkcd], public domain. 35 crude names (containing shit, puke, vomit, poo, snot, barf, piss, ugly, …) are left out; names are stored in Title Case. |
| `ja_jis_z8102_color_names.json` | ja | 267 | The JIS Z 8102 standard color names (慣用色名) in their official spelling (e.g. とき色, パンジー)[^jis]. |
| `ja_wikipedia_list_of_japanese_colors.json` | ja | 240 | Japanese Wikipedia's list of Japanese colors, with kana readings[^ja-list]. |

Each file has the form `{ "source", "license", "retrieved", "lang", "colors": [ {"hex", "name", …} ] }`.
Extra keys: `romaji` and `meaning` (ja), `code` (RAL), `page` (the article a German sample came from).

**Romaji.** Where a source gives no romaji, it is generated from the kana spelling or the kana reading
(modified Hepburn, long vowels with macrons, `-iro` hyphenated for names ending in 色; loanwords are written
as one word, e.g. オリエンタルブルー → Orientaruburū). About 25 readings missing from the sources were added by hand.
When a source gives two readings (かちいろ/かついろ) the first is used.
Wikipedia text is CC BY-SA 4.0. RAL is a trademark of RAL gGmbH; RAL colors are defined by physical samples,
so every hex value is an approximation.

# Merge rules (`python3 tools/colorpedia.py import`)
1. Files are processed in alphabetical order; entries in file order.
2. The key is the lowercase hex. A hex that does not exist yet becomes a new color.
3. **A name is added only if no color already has that name in the same language** (compared case-, space-,
   punctuation- and accent-insensitively). The existing color keeps the name. In 2026-09 this skipped 52 English
   names (e.g. Wikipedia's Champagne `#f7e7ce`; Champagne stays on `#fad6a5`) and 154 RAL names already present
   under another RAL approximation.
4. Japanese names also append their romaji to `names_ja_romaji`; RAL names append their number to `codes`.
5. German adjective-only names (`Dunkel`, `Tief`, `Mittel`, `Satt`, `Blass`, `Kräftig`, `Leuchtend`, `Hell`)
   are removed.
6. Every color's `family` is recomputed by the [family rule](/data/families.md), and `meta` is recounted.
7. Running import twice is harmless: it is idempotent.

Results:
* First 2026-09 import (Wikipedia list of colors, traditional colors of Japan, RAL): 737 names added,
  645 new colors, 971 → 1616 colors.
* Second 2026-09 import (Crayola, xkcd, JIS, Japanese list, German articles): 1095 names added, 1001 new colors,
  1616 → **2617 colors** (1748 with English, 760 with German, 526 with Japanese, 60 with brand names).
