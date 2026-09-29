---
type: Specification
title: Map layout rules (where each color goes)
description: The rules that decide which hexagon each color occupies in the SVG map, as implemented by tools/colorpedia.py build.
resource: https://github.com/fhkit/colorpedia.org/blob/main/tools/colorpedia.py
tags: [map, svg, layout, color-wheel, rules]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# The picture in one sentence
The map is a **color wheel made of hexagons**: white is in the center, colors get **darker toward the rim**,
**hue runs around the circle**, and a **grey spoke** runs straight down from white to black.

```
                 green
      yellow-green     teal / sea green
   yellow                        cyan
 orange          (white)           sky blue
red                  |                 blue
 crimson             | grey spoke     indigo
   rose / pink       |             violet
        magenta   black    purple
```

(Going **clockwise on screen**, starting just left of the grey spoke: magenta → pink → red → orange →
yellow → green → cyan → blue → violet → back to the grey spoke. Hue increases clockwise.)

# Rules
All angles are mathematical: 0° points right, angles grow counter-clockwise, y points up.
The constants are at the top of `tools/colorpedia.py`.

## Rule 1: the shape is a round disc
The map uses the `N` hexagon cells nearest the center, where `N` is the number of colors. There are no holes and
no spare cells. Adding colors makes the disc bigger, and every color moves a little. **Positions are not stable
across builds that add colors**, only the overall arrangement is.

## Rule 2: white is pinned to the center
The lightest color (`#ffffff`) always takes cell `(0, 0)`.

## Rule 3: distance from the center = lightness rank
Colors are sorted by CIELAB lightness `L*`, lightest first (ties are broken by hex string). The color with rank `i`
aims for radius

```
r_i = R_max · sqrt((i + 0.5) / N)
```

The square root gives every lightness band the same **area**, so the disc fills evenly.
Consequence: `L*` is perceptual, so pure yellow `#ffff00` (L* ≈ 97) sits near the center while pure blue
`#0000ff` (L* ≈ 32) sits near the rim, even though both have HSL lightness 50%.

## Rule 4: angle = hue
* **Neutral colors** (CIELAB chroma `C* < 6`) have no meaningful hue. They all aim for **270° (straight down)**,
  which forms the grey spoke from white (center) to black (rim, bottom).
* **Chromatic colors** use their HSL hue `h`. The hue that sits next to the grey spoke is `SEAM_HUE = 293°`
  (violet/magenta), and the position along the circle is

  ```
  u   = (h − 293°) mod 360°                       # 0…360, measured from the seam
  u'  = 0.25 · u + 0.75 · (360° · hue_rank / count)   # HUE_EQUALIZE = 0.75
  θ   = 270° − wedge/2 − (360° − wedge) · u'/360°
  wedge = 360° · (number of neutral colors) / N   # room for the grey spoke
  ```

  Blending in the hue **rank** gives crowded hue ranges (there are many reds and blues, few purples) a wider
  slice of the circle. Without this they push the whole light core off center (the first version of the
  generator put white 105 units right of center).

The orientation matches the original hand-made map: red on the left, yellow upper left, green at the top,
cyan on the right, blue lower right, magenta and violet at the bottom, black at the bottom.

## Rule 5: assignment to cells
1. **Greedy pass**, lightest color first: each color takes the free cell nearest its target point `(r_i, θ)`.
2. **Swap pass**: two colors up to two cells apart swap places whenever that lowers the sum of squared
   distances to their targets. This repeats until nothing improves (at most 200 passes).
3. The white center cell never moves.

Everything is deterministic: the same `colors.json` always produces the same SVG, byte for byte.

# What "arranged correctly" means (checklist)
When you judge the map by eye, or review a change:
* White is exactly in the center; black is at the bottom edge; the greys form one spoke between them.
* Going around clockwise from the grey spoke: magenta, pink, red, orange, yellow, green, cyan, blue, violet.
* Along any spoke from the center outward, colors get darker (pastel → full → deep).
* No color sits in a hue sector that is clearly not its own (for example a peach below white, or an ochre
  among the greens). The original map had many of these; see [/map/audit-2026-09.md](/map/audit-2026-09.md).
* Every color in `colors.json` has exactly one cell, and nothing else is in the map.

# Changing the rules
Change the constants (`SEAM_DEG`, `SEAM_HUE`, `NEUTRAL_CHROMA`, `HUE_EQUALIZE`, `HEX_R`) or `layout()` in
`tools/colorpedia.py`, run `python3 tools/colorpedia.py build`, look at the result in a browser, and update this page.
