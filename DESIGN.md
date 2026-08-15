---
name: Outreach Cockpit
description: Prima's daily glanceable status board for Data Centers outbound pipeline
colors:
  ledger-red: "#C81E3A"
  ink: "#0A0A0C"
  ink-slate: "#52525B"
  ink-faint: "#64646D"
  paper: "#FAFAFA"
  surface: "#FFFFFF"
  hairline: "#E4E4E7"
  hairline-strong: "#D4D4D8"
  cat-indigo: "#4C5A92"
  cat-ochre: "#8A6A22"
  cat-plum: "#7A5C8A"
  cat-teal: "#3D7A6C"
  fresh-green: "#3D7A52"
  stale-gray: "#8B8B93"
typography:
  title:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "10-11px"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  control: "6px"
  container: "12px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "18px"
  lg: "24px"
components:
  chip-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.pill}"
    padding: "7px 13px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "7px 13px"
  badge-category:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cat-indigo}"
    rounded: "{rounded.pill}"
    padding: "3.5px 10px"
---

# Design System: Outreach Cockpit

## Overview

**Creative North Star: "The Sales Ledger"**

Outreach Cockpit reads like a printed manifest a sales floor keeps on the wall, not like a
startup marketing page. Near-black ink on off-white paper, hairline rules instead of shadows, and
exactly one reserved red mark per row for whatever needs eyes right now. The page is built to be
scanned, not admired — a teammate should be able to read their row in under two seconds and know
who to contact next.

Confirmed rejections: purple-to-blue gradients, decorative dotted-grid backgrounds, uppercase-mono
treatment on every label, cards nested inside cards, and generic AI-cliché typefaces (Space
Grotesk named explicitly).

**Key Characteristics:**
- Flat, bordered, paper-quiet — no ambient shadows at rest.
- Exactly one accent color, used sparingly and only for genuinely urgent facts.
- Category identity carried by four muted, deliberately non-red hues.
- Monospace reserved for real measurements (signal age, cadence codes), never as a "technical"
  costume on ordinary labels.

## Colors

The palette is restrained by design: neutrals do almost all the work, one red accent carries
urgency, and a small muted set carries category identity — never confused with the accent because
none of the four is red.

### Primary
- **Ledger Red** (#C81E3A): the single reserved accent. Used only for the warm-intro banner
  border/background, the "Warm intros" stat count, the active cadence step's ring, the warm-intro
  toggle's on-state, and the keyboard focus ring. Nowhere else.

### Secondary
- **Muted Indigo** (#4C5A92) — Cat1, AI Operators
- **Muted Ochre** (#8A6A22) — Cat2, Crypto→AI
- **Muted Plum** (#7A5C8A) — Cat3, Contractors
- **Muted Teal** (#3D7A6C) — Cat4, Manufacturers

The category set. Desaturated on purpose so none of the four reads as urgent or competes with
Ledger Red; they exist to be told apart from each other, not to draw the eye.

### Tertiary
- **Fresh Green** (#3D7A52): the freshness dot/stat for a recent signal. A conventional,
  low-key status color — deliberately not part of the red/neutral brand statement, since
  "signal is fresh" and "this needs urgent attention" are different facts.

### Neutral
- **Ink** (#0A0A0C): primary text, headings, the logo mark.
- **Slate Ink** (#52525B): secondary text (contact name/title, "on" chip label states).
- **Faint Ink** (#64646D): tertiary/meta text — labels, signal age, footer copy. Raised from an
  earlier #9298A5 specifically to clear WCAG AA (~5.0:1 against both Paper and Surface).
- **Paper** (#FAFAFA): page background.
- **Surface** (#FFFFFF): card and tile background.
- **Hairline** (#E4E4E7) / **Hairline Strong** (#D4D4D8): the only elevation device — a 1px
  border, strengthened slightly on hover.
- **Stale Gray** (#8B8B93): the "no fresh signal" status dot.

### Named Rules
**The One Mark Rule.** Ledger Red appears in exactly five places and nowhere else: the warm-intro
banner, the warm-intro stat, the active cadence step, the warm-toggle's on-state, and the focus
ring. Plain selection (active user, active category filter) never uses color — it inverts to solid
ink with white text instead. This is what keeps red from becoming a second selection color and
diluting its meaning.

## Typography

**Body/UI Font:** Archivo (with -apple-system, BlinkMacSystemFont, sans-serif fallback)
**Data/Label Font:** JetBrains Mono (with ui-monospace, SF Mono, Menlo fallback)

**Character:** A confident, slightly assertive grotesque for everything a person reads, paired
with a technical mono reserved strictly for values that are actually measurements — never used as
a "this looks technical" costume on ordinary UI labels.

### Hierarchy
- **Title** (600, 16px, -0.01em): company name on each lead card; the page wordmark.
- **Body** (400–500, 12.5px): contact name/title, signal text, warm-intro copy.
- **Label** (500, 11px): section heading, tile labels, footer, "Signal"/"Next" meta labels — plain
  sentence case, no uppercase-tracking costume.
- **Data** (500, 10–11px, mono, 0.02em): signal age ("3d"), cadence step codes (E1/LI/E2/E3) — the
  only place monospace appears.

### Named Rules
**The Measurement-Only Mono Rule.** Monospace is used for two things only — signal age and
cadence step codes — because both are genuinely short data codes. It never dresses up a plain
label ("Signal", "Warm intro", footer copy) just to look technical; that pattern was identified
and removed as an AI-generic tell during the 2026-08-14 redesign.

## Layout

Single-column content in a 1000px max-width wrap, centered. Sticky, blurred header holding the
wordmark and the "viewing as" user switcher. Below it: a category-filter row, a 4-column stat-tile
grid (collapses to 2 columns under 640px as a safety net — the product is desktop-only by
requirement, so this is not a target breakpoint), then a vertical list of lead cards with 14px
gaps. Generous padding throughout (18–20px inside cards) over density; more space above a heading
than below it.

## Elevation & Depth

Flat by default. No ambient shadow on resting cards or tiles — the only depth cue is a 1px
hairline border. A soft shadow appears solely as a hover response on cards, never at rest.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest; a shadow only ever appears as a reaction
to hover, never as ambient decoration.

## Shapes

Two radius scales: **container** (12px) for cards and stat tiles, **pill** (999px) for small
controls — chips, category badges, the warm-toggle switch, the "Direct/Company" level pill. No
in-between radii. 1px hairline borders are the primary separator everywhere; no double-declared
elevation (never a border under a wide shadow on the same element).

## Components

### Chips (category filter)
- **Style:** pill-shaped, 1px hairline border, white surface at rest.
- **Selected state:** inverts to solid ink background, white text — no color, matching the user
  selector's selection language.
- **Category dot:** a small colored circle inside each non-"All" chip, colored from the category's
  muted hue via an inherited `--catc` custom property.

### Badges (category, on lead cards)
- **Style:** pill-shaped, category-colored text on a ~9% tint of that category's hue, ~24% tint
  border — never a flat saturated fill.

### Cards (lead rows)
- **Corner style:** 12px (container radius).
- **Background:** Surface (#FFFFFF) on Paper (#FAFAFA).
- **Shadow strategy:** none at rest; soft shadow on hover only (see Elevation & Depth).
- **Border:** 1px Hairline; a lead with a warm intro gets a ~22%-tint red border instead.
- **Internal padding:** 18px vertical, 20px horizontal.

### Toggle / Switch ("Warm intros only")
- **Style:** pill-shaped track, circular thumb, real `<button role="switch">`.
- **On-state:** track and border become Ledger Red — the one toggle whose function (filtering for
  the accent-marked rows) justifies coloring its own active state.

### User Selector ("Viewing as")
- **Style:** segmented pill group; selected item inverts to solid ink, white text, matching chip
  selection — no color used for this kind of plain navigational selection.

## Do's and Don'ts

### Do:
- **Do** keep Ledger Red to its five sanctioned touchpoints (warm banner, warm stat, active
  cadence step, warm-toggle on-state, focus ring).
- **Do** keep monospace strictly for measurements (signal age, cadence codes).
- **Do** keep category identity in the muted Secondary set — never red, never fully saturated.
- **Do** use ink-inversion (solid ink, white text) for plain selection states (active user, active
  category) instead of reaching for color.
- **Do** keep cards flat with a 1px hairline at rest; shadow only on hover.

### Don't:
- **Don't** introduce a second accent color, or let Ledger Red spread beyond its five touchpoints.
- **Don't** bring back uppercase-tracked mono on ordinary prose labels — that pattern was removed
  as a generic-AI tell.
- **Don't** use a purple-to-blue gradient, a decorative dotted-grid background, or nest a card
  inside another card.
- **Don't** default to Space Grotesk, Inter-as-display, Geist, or other training-data-default
  faces if this system's typography ever needs to change — pick something with the same
  considered, non-costume character as Archivo.
