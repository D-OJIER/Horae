# Mythic Interface: the design brief Horae follows

This is the master design instruction for Horae. Every visual change should answer to it.

## Creative direction
Combine:
1. **Expressive game UI** (the visual philosophy of Persona 5 / Persona 3 Reload): aggressive typography, asymmetric layouts, dramatic transitions, layered compositions, strong visual storytelling.
2. **Ancient mythology**: runes, sacred geometry, alchemical diagrams, forgotten civilisations, symbolic structures.
3. **Brutalism**: raw materials, imperfect textures, unconventional compositions, strong contrast.
4. **Experimental digital design**: responsive geometry, interactive environments, procedural animation, spatial interfaces.

Create original visual identities. Never reproduce existing game interfaces or assets.

## Non-negotiable rules
- No generic SaaS templates, no repetitive three-card feature rows without a reason.
- No excessive rounded cards, generic gradients or unnecessary glassmorphism.
- No decoration without purpose.
- Typography is a major visual element.
- Asymmetric, editorial compositions.
- Distinctive page transitions and meaningful interaction.
- Readability and usability come first.

## Geometric language
Reusable animated objects in SVG / CSS / Canvas / WebGL: sacred geometry, orbital structures, torus knots, fractals, runic symbols, morphing mechanical objects, procedural structures. They react to pointer, scroll and interaction. Every major site gets a unique signature visual.

## Interface
Dramatic type, angular shapes, strong contrast, unconventional alignment, expressive section transitions, layered information, dynamic feedback. Translate the philosophy; don't make everything a game menu.

## Motion
Ambient, interactive and narrative: angular wipes, geometric masks, spatial transitions, organic transformations, scroll-linked animation, pointer-responsive objects, custom loading states. Smooth, deliberate, purposeful. Protect performance.

## Adaptability
The system is a visual language, not a template. Palette, motifs, type and motion follow the project's identity.

## Implementation
Component reuse, responsive, semantic HTML, accessibility, performance, `prefers-reduced-motion` support, clean architecture, maintainable styling. Three.js only when real 3D interaction is needed.

## Quality bar
Intentionally art-directed. Recognisable without its logo. Alive without distracting. Experimental without confusing. Memorable without compromising its purpose.

---

## How Horae applies it

| Element | Choice |
|---|---|
| Signature visual | **The Horologion** (`src/components/Horologion.tsx`): an SVG astrolabe with three counter-rotating rings (12 months, the days of this month, 24 hours), a hexagram of sacred geometry and a spun thread spiral. The ring of the current view is lit, the current month/day/hour are marked, it tilts toward the pointer and turns with scroll. In the Underworld it flips upside down: the mirror realm. |
| Type | **Archivo** at its narrowest width and heaviest weight for skewed, layered display titles; **Cormorant Garamond** italic for oracle-voiced subtitles; Archivo with tabular numbers for everything else. |
| Surfaces | Bone paper with grain noise (Olympus) or ink-black (Underworld). 2px ink borders, hard offset shadows, zero radii, parallelogram clip-paths. No gradients, no glass. |
| Colour | One loud accent per guardian: Athena cobalt, Hestia ember, Hermes verdigris, "All" crimson. The Underworld swaps each for a luminous pair. |
| Motion | An angular slab wipes across on every view or realm change; content unmasks along a diagonal. Custom rune loader before React mounts. All of it is disabled under `prefers-reduced-motion`. |
| Views | Season I · Dawn II · Hora III · Rites IV, numbered like chapters. |
