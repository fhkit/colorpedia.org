---
type: Specification
title: Hex grid geometry
description: The hexagon size, spacing and offset-column coordinate system used by the color map.
resource: https://github.com/fhkit/colorpedia.org/blob/main/tools/colorpedia.py
tags: [map, svg, geometry, hex-grid]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Hexagon
* **Flat-top** regular hexagons (two vertices point left and right).
* Circumradius `R = 10` in SVG units, so a cell is 20 wide and `√3·R ≈ 17.32` tall.
* Vertices are at `center + R·(cos θ, sin θ)` for θ = 0°, 60°, 120°, 180°, 240°, 300°.

# Grid ("odd-q" offset columns)
A cell has integer coordinates `(col, row)`:

```
x = col · 15                      # 1.5 · R: columns interlock
y = row · 17.32 + (8.66 if col is odd else 0)   # odd columns shifted down half a cell
```

The generator puts `(0, 0)` at the center of the wheel and translates everything so that the smallest cell center
is `MARGIN + R` = 30 from the left edge and `MARGIN + 8.66` from the top edge.

# Neighbors
| column parity | the six neighbors of (c, r) |
|---|---|
| even | (c, r−1) (c, r+1) (c−1, r−1) (c−1, r) (c+1, r−1) (c+1, r) |
| odd  | (c, r−1) (c, r+1) (c−1, r) (c−1, r+1) (c+1, r) (c+1, r+1) |

# Invariants (checked by `tools/colorpedia.py check`)
* Every polygon is a regular hexagon with circumradius 10 (±0.02).
* No two polygons share a center.
* The set of `data-hex` values equals the set of hex values in `colors.json`, with no duplicates.
* `fill == data-hex` on every polygon.

The original hand-made map used the same geometry (R = 10, odd columns shifted down), so it looks the same,
only larger.
