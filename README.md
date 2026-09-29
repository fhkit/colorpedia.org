# colorpedia.org

A name-first color picker: English, German, Japanese and brand color names, deduplicated by hex.
Static site: `index.html` + `colors.json`, no build step needed to serve it.

* **Documentation** is in [`okf/`](okf/index.md) (Open Knowledge Format). Start with
  [okf/overview.md](okf/overview.md) and [okf/map/layout-rules.md](okf/map/layout-rules.md).
* **Change colors** by editing `data/sources/*.json` or `colors.json`, then run
  `python3 tools/colorpedia.py all` (import + regenerate the SVG map + validate). Never edit the map by hand.
* **Run locally**: `python3 -m http.server 8000` and open http://localhost:8000/.
