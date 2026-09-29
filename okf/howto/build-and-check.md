---
type: Playbook
title: Build and check
description: How to run the Colorpedia tool, test the page locally, and read the check output.
resource: https://github.com/fhkit/colorpedia.org/blob/main/tools/colorpedia.py
tags: [howto, build, validation, testing]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Commands
Python 3.8+ only, no packages needed. Run them from the repository root.

| Command | Does |
|---|---|
| `python3 tools/colorpedia.py import` | Merges `data/sources/*.json` into `colors.json` ([merge rules](/data/sources.md)), recomputes families and meta. |
| `python3 tools/colorpedia.py build` | Computes the layout ([rules](/map/layout-rules.md)), rewrites the map block in `index.html`, sorts `colors.json` lightest first, recounts meta. About 1 second for 1600 colors. |
| `python3 tools/colorpedia.py check` | Validates data and map; exit code 1 on any error. |
| `python3 tools/colorpedia.py all` | import, build, check. |

`build` is deterministic, so running it twice gives an identical file. If `git diff` shows map changes you
did not expect, the data changed.

# What check validates
Errors: invalid or duplicate hex; `family` not equal to the rule; a color with no name; `names_ja` and
`names_ja_romaji` of different lengths; stale `meta`; an `<?xml` declaration in `index.html`; missing or
duplicated COLORMAP markers; `fill` not equal to `data-hex`; a non-regular hexagon; two cells in one place;
map and `colors.json` not containing the same hex values.

Warnings (they do not fail): the same name on several hexes. There are 243 in the old German data, see
[/data/known-issues.md](/data/known-issues.md). New data should not add any.

# Test in a browser
```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```
`fetch()` does not work from `file://`. Check that:
* the header shows the new counts and the Japanese tab shows a count;
* hovering over a cell updates the preview and chips, clicking adds it to Recent;
* searching (`sakura`, `RAL 7016`, `#fcc9b9`) dims the rest of the map;
* the browser console shows no errors.
