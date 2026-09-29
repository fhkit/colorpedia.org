---
type: Specification
title: Color family rule
description: The deterministic rule that assigns each color to one of the nine families shown in the Families sidebar.
resource: https://github.com/fhkit/colorpedia.org/blob/main/tools/colorpedia.py
tags: [data, families, classification]
generated: { by: "claude-code/agent", at: "2026-09-29T21:00:00Z" }
status: stable
---
# Rule (`classify_family` in tools/colorpedia.py)
Inputs: HSL hue `h` (0–360°), HSL lightness `l`, HSV value `v` (the largest RGB channel, 0–1),
CIELAB lightness `L*` and chroma `C*`. The first rule that matches wins:

| # | Condition | Family |
|---|---|---|
| 1 | `C* < 8`, or `L* > 96` and `C* < 12` | Neutrals |
| 2 | `15° ≤ h < 55°` and `v < 0.72` (dark orange or yellow) | Browns |
| 3 | `h ≥ 345°` or `h < 12°` | Pinks if `l > 0.72`, otherwise Reds |
| 4 | `h < 40°` | Oranges |
| 5 | `h < 68°` | Yellows |
| 6 | `h < 165°` | Greens |
| 7 | `h < 250°` | Blues |
| 8 | `h < 290°` | Purples |
| 9 | otherwise (290–345°) | Pinks |

# Why a rule
The original families were hand- or tool-assigned and had clear errors: pure yellow `#ffff00`, Snapchat yellow
`#fffc00` and Goldenrod were under Browns, and Safety Orange and OrangeRed too. Applying the rule changed 152
of the 971 original labels. Borderline cases (olive greys, dusty mauves) can go either way; if you change a
threshold, rebuild and check the family counts in the sidebar.

Counts after the 2026-09 import: Blues 296, Reds 240, Pinks 220, Greens 197, Oranges 186, Neutrals 161,
Yellows 136, Browns 112, Purples 68.
