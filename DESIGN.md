---
name: Engel Fine Design — Admin
description: The shop floor's operations tool, in EFD's black-and-white brand with one gold accent.
colors:
  ground: "#08090B"
  sidebar: "#0A0B0E"
  raised: "#12141A"
  surface: "rgba(255,255,255,0.045)"
  surface-quiet: "rgba(255,255,255,0.03)"
  surface-hover: "rgba(255,255,255,0.075)"
  border: "rgba(255,255,255,0.12)"
  hairline: "rgba(255,255,255,0.09)"
  text: "#FFFFFF"
  text-2: "rgba(255,255,255,0.66)"
  text-3: "rgba(255,255,255,0.50)"
  gold: "#FBBF24"
  gold-hover: "#FFCF4D"
  gold-wash: "rgba(251,191,36,0.12)"
  gold-edge: "rgba(251,191,36,0.45)"
  on-gold: "#08090B"
  success: "#34D399"
  error: "#F87171"
  info: "#7DD3FC"
typography:
  display:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  body:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.005em"
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    letterSpacing: "0.14em"
  caption:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.71rem"
    fontWeight: 400
    letterSpacing: "0.01em"
rounded:
  control: "10px"
  input: "12px"
  card: "16px"
  panel: "20px"
  pill: "999px"
spacing:
  tap: "44px"
  card-pad: "18px"
  panel-pad: "22px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
  button-outlined:
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  nav-item-current:
    backgroundColor: "{colors.gold-wash}"
    textColor: "{colors.gold}"
    rounded: "11px"
  chip:
    rounded: "{rounded.pill}"
---

# Design System: Engel Fine Design — Admin

## Overview

The shop floor's tool, wearing the shop's brand. **Black and white are EFD's brand colors** (owner, 2026-10-01), and
gold is the one accent. The admin, the storefront (efd-shop) and the emails share this identity: near-black ground,
white type, gold for the one thing to do next. It is an Operate surface. Jewelers use it mid-job on a phone or a bench
tablet, so scanability, big targets and a predictable layout matter more than expression; the brand shows in precise
details (mono labels, gold used sparingly, flat calm surfaces), not decoration.

The tokens live in `src/lib/theme.js` (MUI) and `src/components/facelift` (`--fl-*`, MUI-free). They are the source of
truth: change a token there, never inline per page. **Refine this look; don't replace it.** Users know it, and the
owner does not want to rock them.

## Colors

### Primary
- **Gold `#FBBF24`.** The primary action (one per screen), the current nav item, focus, and "your turn" states. Hover
  is `#FFCF4D`. Text on gold is ground `#08090B`. Gold is never a decorative fill and never body text.

### Neutral
- **Ground `#08090B`** is the page; the **sidebar `#0A0B0E`** sits just above it; **raised `#12141A`** is for menus,
  dialogs and popovers (anything floating needs to be opaque).
- **Surfaces are translucent white on the ground**: `surface` 4.5%, `surface-quiet` 3%, hover 7.5%. Cards sit *on* the
  ground, not above it.
- **Text**: white for primary text, 66% for secondary, 50% for tertiary or disabled only. Never use tertiary for
  anything a person must read to act.

### Semantic
- Success `#34D399`, error `#F87171`, info `#7DD3FC`; warning reuses gold. Status colors appear as **tinted chips**
  (`tint()`: about 12% fill, a 40% border, full-strength text), always with words in them.

### Named Rules
- **One gold per view.** If two things are gold, one of them is wrong.
- **Black, white, gold.** Don't introduce a new hue for a feature; use the semantic set or a neutral.

## Typography

- **Space Grotesk** for headings, body and buttons (weights 400–700, tight negative tracking on headings).
- **IBM Plex Mono** for the label voice: table heads, overlines, chips, SKUs, ids, timestamps, and metadata that
  isn't prose. Uppercase with 0.14em tracking at small sizes.
- **Hierarchy:** h1 2rem/700 → h2 1.5rem → h3 1.25rem → h4 1.0625rem; body 0.9375rem/1.6; body2 0.875rem; caption is
  mono at 0.71rem.
- Numbers compared in a column use tabular figures (set globally on `td`, `th` and number inputs).
- Every page has exactly one `h1` (the views check fails without it).

## Layout

- **Mobile first, 320px up**, with no horizontal page scroll at any width. Grids use `minmax(min(Npx, 100%), 1fr)`,
  never a bare `minmax(Npx, 1fr)`. Tables scroll inside their own container.
- Single column until there is room. Page headers wrap their actions below the title on a phone
  (`min-width: min(280px, 100%)`).
- Dense, but not cramped: 18px card padding, 22px for boxed panels at 600px and up.
- Long lists paginate (My Bench: 20 per page) instead of scrolling forever.

## Elevation & Depth

Flat. Surfaces separate by a **1px border and a background lift**, never by a drop shadow. Only truly floating layers
(menus, dialogs, popovers) get a shadow: `0 2px 8px rgba(0,0,0,0.4)` → `0 18px 48px rgba(0,0,0,0.62)`. The app bar is
ground at 86% with a blur.

## Shapes

Pills for buttons and chips (999px). 10–12px for icon buttons, list items and inputs; 16px for cards, papers and table
containers; 20px for boxed page headers. One radius per role, applied consistently.

## Components

### Buttons
- **Primary** is a gold pill with ground text: one per screen, inside an `ActionBar` on facelift screens
  (`GoldButton`).
- **Outlined** has a white 12% border and white text. **Text** buttons are secondary (66%) and turn white on hover.
- Minimum height is 40px (34px for small); touch screens use the 44px facelift controls.

### Chips
Pills. The default is a white 6% fill with a 12% border; status chips are tinted semantic triplets and always carry a
label.

### Cards / Containers
A translucent surface, a 1px `border`, 16px radius, 18px padding, no shadow. Don't nest a card inside a card; use a
divider or a quiet surface inside.

### Inputs / Fields
Small MUI fields at 12px radius on desktop forms. On facelift (touch) screens, 16px text so iOS never zooms. Pick the
control for the job (facelift `index.js`): a small option set is a `ChoiceList`, not a Select; two or three options is
`Segmented`; a nudged number is `QtyStepper`; only a large catalog gets search.

### Navigation
A grouped left sidebar on the sidebar ground. The current item is a gold wash with gold text; hover is white 6%.
Group headings use the mono label voice at 50%.

### Bench Work Card (signature)
The My Bench card: the job, who holds it, its lane, and the next action as one big tap target, built to be read at
arm's length on a phone.

## Do's and Don'ts

### Do:
- Use the tokens in `theme.js` and facelift; extend them there when something is missing.
- Keep one gold action per view, and say what it does in plain words.
- Put status in words (chips), not color alone. Keep secondary text at 66% white or brighter.
- Check 320 / 375 / 768 / desktop before shipping a layout change.

### Don't:
- Don't re-theme. No new palette, fonts or light mode without the owner's yes.
- Don't add drop shadows to cards, or decorative gradients, glows or glass.
- Don't nest cards in cards, use a side-stripe border as decoration, or add charts that don't name a decision.
- Don't hide a short option list behind an autocomplete or a Select.
- Don't put prices or totals anywhere but the pricing engine's output (one engine, never stored).
- Print and email stay ink on white; this dark theme never reaches paper.
