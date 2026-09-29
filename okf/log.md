# Log

## 2026-09-29
* Second import: Crayola crayons, xkcd color survey, JIS Z 8102 names, Japanese Wikipedia's list of Japanese colors
  and German color-article samples; 1001 new colors, 2617 in total.
* Added a GitHub Pages workflow (`.github/workflows/pages.yml`): runs `check`, then publishes the site and `okf/`.
* Created the bundle from the live site as downloaded on this date (971 colors).
* Audited the hand-maintained SVG map and `colors.json`; findings are in [/map/audit-2026-09.md](/map/audit-2026-09.md) and [/data/known-issues.md](/data/known-issues.md).
* Replaced the hand-maintained map with a generated one (`tools/colorpedia.py`) and documented the rules in [/map/layout-rules.md](/map/layout-rules.md).
* Added 645 colors (English Wikipedia list of colors, traditional colors of Japan, missing RAL Classic names): 1616 colors in total.
