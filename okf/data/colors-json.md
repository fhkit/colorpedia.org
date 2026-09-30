---
type: Data Schema
title: colors.json schema
description: The structure of colors.json, the single source of truth for every color and its names.
resource: https://colorpedia.org/colors.json
tags: [data, json, schema]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Shape
```json
{
  "meta":   { "count_raw": 3386, "count_unique": 2617 },
  "colors": [
    { "hex": "#fcc9b9", "family": "Pinks",
      "names_en": [], "names_de": [], "names_ja": ["桜色"], "names_ja_romaji": ["Sakura-iro"],
      "names_brand": [] },
    { "hex": "#383e42", "family": "Neutrals",
      "names_en": [], "names_de": ["Anthrazitgrau"], "names_ja": [], "names_brand": [], "codes": ["RAL 7016"] }
  ]
}
```
The file is written compactly (no whitespace) by the tool.

# Fields of a color
| Field | Type | Required | Notes |
|---|---|---|---|
| `hex` | string | yes | Lowercase `#rrggbb`. **Unique**: the primary key, also used as `data-hex` in the map. |
| `family` | string | yes | One of `Neutrals, Reds, Oranges, Yellows, Greens, Blues, Purples, Pinks, Browns`, computed by the rule in [/data/families.md](/data/families.md). Never set it by hand; `check` fails if it differs from the rule. |
| `names_en` | string[] | yes (may be empty) | English names. Older entries use CamelCase keys (`"MintCream"`, `"KUCrimson"`), newer ones use plain words (`"Absolute Zero"`, `"Blue (Crayola)"`). The UI turns both into Title Case (`prettyName`). |
| `names_de` | string[] | yes (may be empty) | German names, stored as displayed (`"Blütenweiß"`, `"Anthrazitgrau"`). |
| `names_ja` | string[] | yes (may be empty) | Japanese names in kanji/kana (`"桜色"`). |
| `names_ja_romaji` | string[] | only with `names_ja` | Romanization, **same length and order as `names_ja`** (`"Sakura-iro"`). Searchable; shown as `桜色 · Sakura-iro`. |
| `names_brand` | string[] | yes (may be empty) | Brand or standard names (`"Google Blue"`, `"EN 12368"`). Shown unchanged. |
| `plate` | string | yes | Saturation plate: `vivid`, `strong`, `soft` or `muted`. Computed by `build` from the rule in [/map/layout-rules.md](/map/layout-rules.md); never set it by hand, `check` fails if it differs. |
| `codes` | string[] | no | Catalogue codes, currently RAL (`"RAL 7016"`). Searchable, not shown as chips. |

Every color must have at least one name in `names_en`, `names_de`, `names_ja` or `names_brand`.

# Order
Colors are sorted **lightest first** (CIELAB L\*, ties by hex). This order is used by the Grid view and as the
default selection (the first color, white). The map does not depend on it.

# meta
* `count_unique` = number of colors.
* `count_raw` = total number of names over `names_en`, `names_de`, `names_ja`, `names_brand`.
Shown in the header as "(2617 unique / 3386 named)". The tool recomputes both; `check` fails if they are out of date.

# Runtime adjustments (in index.html, not in the file)
At startup the app removes the German names `Grün`, `Rot` and `Blau` from every color except `#00ff00`,
`#ff0000` and `#0000ff` (see [/data/known-issues.md](/data/known-issues.md)).

# Invariants (enforced by `python3 tools/colorpedia.py check`)
* Hex values are unique, valid and lowercase.
* `family` equals the rule's result.
* Each color has at least one name; `names_ja` and `names_ja_romaji` have the same length.
* `meta` is current.
* The set of hex values equals the set of `data-hex` values in the map.
* Warning only: the same name on several hexes (a legacy problem in German names).
