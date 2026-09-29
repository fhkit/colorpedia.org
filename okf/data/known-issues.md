---
type: Issue Log
title: Known data issues
description: Data problems found in colors.json, which ones were fixed in 2026-09, and which are still open.
resource: https://colorpedia.org/colors.json
tags: [data, issues, quality]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Fixed in 2026-09
* **Wrong families**: 152 of 971 labels disagreed with the hue, for example Yellow `#ffff00` and Snapchat
  `#fffc00` under Browns, Safety Orange `#ff6700` under Browns, Linen `#faf0e6` under Oranges.
  Families now come from a [rule](/data/families.md).
* **Stale meta**: `count_raw` said 1041, but there were 1586 names. Now recomputed on every build.
* **Adjective-only German names**: 32 names that are only "dark", "deep", "medium", … (`Dunkel` on 11
  different colors, `Tief`, `Mittel`, `Satt`, `Blass`, `Kräftig`, `Leuchtend`) were removed.
* **Missing RAL colors**: 58 RAL Classic colors were missing (most of the dark ones, such as Anthrazitgrau,
  Moosgrün, Tiefschwarz and Verkehrsweiß) and were added with their RAL code.

# Still open
* **Generic German names on many colors.** Most come from an automatic translation that kept only the base
  color word: `Blau` is on 42 colors, `Grün` 33, `Rosa` 21, `Rot` 19, `Gelb` 15, `Rosen` ("roses") 15,
  `Orange` 13, `Braun` 10, `Lila` 9, `Grau` 8. The app hides `Grün`/`Rot`/`Blau` except on the pure primaries
  (a runtime patch in `index.html`); the others still show. `check` reports these as warnings (243).
  A proper fix needs a German speaker to give real names (or remove them), color by color.
* **Truncated German names** such as `Pflaumen` ("plums") for Persian Plum are still there.
* **Marketing names tagged as German**: `Stilles Wasser`, `Wanderlust`, `Sommerzeit`, `Zauber der Wüste`, … are
  paint-product names, not general German color names.
* **Two sets of RAL approximations.** The original RAL colors use one sRGB approximation set; the 58 added in
  2026-09 use the de.wikipedia values. Neither is official (RAL defines colors by physical samples).
* **Mixed English name styles**: CamelCase keys (`KUCrimson` → "KU Crimson") next to plain names.
* **Same English name, different hex in sources**: when Wikipedia's value differs from the existing one, the
  existing one wins (52 cases, e.g. Brown stays CSS `#a52a2a`, not Wikipedia `#964b00`).
* **One Japanese source row is inconsistent**: 桜鼠 (Sakuranezumi) lists RGB 172,129,118 (`#ac8176`) but hex
  `#AC8181`. The hex was used.
* Colors without an English name are mostly German-only and Japanese-only entries.
* **Many near-identical colors.** The xkcd survey and Crayola add many colors that differ from existing ones by
  only a few RGB steps. They are separate entries (the key is the exact hex) and sit next to each other on the map.
* **Generated romaji** (see [/data/sources.md](/data/sources.md)) can be wrong where a kanji compound has an unusual
  reading or where おう spans a word boundary; loanwords are not split into words (Orientaruburū).
* **Small cells**: with 2617 colors the map is about 63 columns wide, so on a phone a cell is only about 7 px wide.
