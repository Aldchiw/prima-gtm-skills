---
target: docs/outreach-cockpit.html
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-14T22-02-23Z
slug: docs-outreach-cockpit-html
---
Method: dual-agent (A: design-review sub-agent · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Filter/toggle states are clear, but no "showing X of Y" count after filtering. |
| 2 | Match System / Real World | 2 | "Your pipeline — by category" promises grouping; the list is a flat, filtered stack, not sectioned. |
| 3 | User Control and Freedom | 3 | "All" chip resets category cleanly; acceptable for a daily-refresh read-only dashboard. |
| 4 | Consistency and Standards | 2 | Stat tiles share chip/card surface styling but aren't clickable — looks interactive, isn't. |
| 5 | Error Prevention | 3 | No destructive actions exist in this read-only view. |
| 6 | Recognition Rather Than Recall | 1 | `CATS[k].full` ("AI Operators", "Crypto→AI"...) exists in the data model but is never rendered — category meaning is pure memorization. |
| 7 | Flexibility and Efficiency | 1 | No user-controlled sort, no bulk action; sort is hardcoded and invisible to the user. |
| 8 | Aesthetic and Minimalist Design | 3 | Visual pass is clean; docked for the stat-tile row implying interactivity it doesn't have. |
| 9 | Error Recovery | 2 | Empty state uses plain language but offers no inline "clear filters" action. |
| 10 | Help and Documentation | 3 | Footer "How this works" is concise and task-focused at this scale. |
| **Total** | | **23/40** | **Acceptable — significant structural work needed.** |

## Design Specificity Verdict

**Start here, because it's the headline finding: the structure is not authored for this product.**

**LLM assessment:** Strip the product-specific strings and the DOM is a generic admin-dashboard skeleton — sticky header + segmented switcher → filter-chip row → 4-stat-tile grid → a vertical stack of identically-templated cards. That shape is interchangeable with any B2B admin tool. The one real product-specific structural device is the warm-intro banner/border (`.card.haswarm`) — it works, but it's a single accent bolted onto an otherwise generic template, not evidence the layout itself was rethought around "decide who to contact first in seconds" (PRODUCT.md's own stated purpose). DESIGN.md already half-admits this: "the 2026-08-14 visual pass restyled the existing structure but did not restructure it."

**Deterministic scan:** The detector (regex-fallback mode — parser modules unavailable, so this is an undercount, not a clean bill of health) found 15 advisory findings, all design-system drift, none blocking. Two clusters matter for this verdict:
- **9 of 15 findings are literal leftover hex values** — the original pre-redesign category colors (`#0f8cff`, `#e5484d`, `#8e4ec6`, `#d98016`) and user-avatar colors (`#2b2bff`, `#0f8cff`, `#8e4ec6`) still sitting inside the `CATS`/`USERS` objects (lines 174–182), undocumented against DESIGN.md. This is not a false positive to dismiss — it's corroborating evidence for the specificity verdict: the data model still carries pre-redesign residue because rendering was rerouted around it (via CSS classes) rather than the object itself being re-authored. The skin changed; the scaffold underneath didn't.
- **6 findings are minor design-token drift** — three radii (2px, 9px, 5px on the logo notch, the user-segment pill, and the avatar) and three font-sizes (9px, 26px, 10px on the avatar, stat number, and cadence-step code) that don't match DESIGN.md's declared scales (`rounded: control/container/pill`, and the label/data type sizes). Low severity, P3 — flagged for completeness, not central to this round.

**Browser visualization:** unavailable — no browser automation tool exposed in this session. CLI-only scan; no user-visible overlay to point to.

## Overall Impression

The skin pass genuinely worked — Ledger Red is disciplined, the palette is calm, the AI-cliché tells (grid background, mono-uppercase-everywhere, Space Grotesk) are gone. But repainting a generic dashboard skeleton doesn't make it stop being a generic dashboard skeleton. Nine leads render as nine same-weight cards in a single undifferentiated list; the one thing that actually signals "look here first" is a red border a user has to notice by scanning past everything else. The biggest opportunity: the app already computes a priority order (`filtered()` sorts warm-first, then freshest signal) — the logic for triage exists and is thrown away at render time by a template that treats every row identically. Fix the shape, not the color, and this stops being a list with a red accent and starts being an actual ledger.

## What's Working

1. **The warm-intro device is real design, not decoration** — `.warmbar` + `.card.haswarm`'s tinted border is the one place in the page where hierarchy does its job, and it's specific to Prima's actual warm-intro mechanic, not a generic pattern.
2. **The category filter chips are genuinely wired**, not just decorative chrome — unlike the stat tiles, clicking them does something.
3. **The sort logic already encodes the right priority** (warm intro first, then freshest signal) — the hard part (deciding what "priority" means for this product) is already solved in code; only the render layer is hiding it.

## Priority Issues

**[P1] The card stack has no visible ranking — 9 leads render at identical weight.**
Why it matters: the product's entire premise (PRODUCT.md: "decide who to contact first in seconds") depends on the eye landing on the right row first. Right now every non-warm lead looks the same regardless of how urgent its signal is, even though the code already ranks them.
Fix: make rank visible in the structure — a distinct top tier (1–3 "contact today" leads pulled out of the list, larger/first) versus a compressed remainder; or a visible rank/position number; or a sort caption stating the order out loud.
Suggested command: `$impeccable layout`

**[P1] The section heading promises grouping the DOM doesn't deliver.**
Why it matters: "Your pipeline — by category" reads as sectioned-by-category; the actual structure is one flat list with a single-select category filter. A rep who trusts the heading expects to see all four categories at once, grouped — they get one category at a time, chip-click by chip-click.
Fix: either build real category sections (sticky sub-headers, one list per category) or rewrite the heading so it stops claiming a structure that isn't there.
Suggested command: `$impeccable layout`

**[P1] Stat tiles look interactive but aren't — and duplicate the warm-intro toggle.**
Why it matters: `.tile` shares surface/border styling with the clickable chips (heuristic #4, Consistency, scored 2/4 for exactly this) but has no `onclick`. "Warm intros" exists twice — once as an inert tile count, once as a separate functioning toggle — which trains the user that the tiles do something, then breaks that expectation.
Fix: either wire the tiles as real filters (click "Warm intros" tile = same as the toggle) or restyle them clearly as non-interactive stat readouts; collapse the duplicate warm-intro entry point into one.
Suggested command: `$impeccable distill`

**[P2] Signal and next-action — the two facts PRODUCT.md names as most important — are visually subordinate to the company name.**
Why it matters: company name renders at 16px/600; signal text and the cadence "Next" action sit at 11–12.5px, the same weight as secondary metadata. The reading order rewards "which company" over "what do I do about it," backwards from the stated priority.
Fix: restructure the card's internal hierarchy so signal + next-action outrank or at least match company name in visual weight/position.
Suggested command: `$impeccable bolder`

**[P2] Category identity is recall-only, and the data model still carries pre-redesign residue.**
Why it matters: `CATS[k].full` ("AI Operators", "Crypto→AI", "Contractors", "Manufacturers") is defined in code but never rendered anywhere — badges show only "Cat1"/"Cat 1," forcing memorization for anyone not already fluent in Prima's internal shorthand (PRODUCT.md confirms mixed technical fluency on the team). Corroborating detector evidence: the `CATS`/`USERS` objects still hold their original pre-redesign hex values (9 of 15 detector findings), now unused by rendering but left in place — a sign the object was routed around, not updated.
Fix: surface the full category name (badge text, a title attribute, or the chip label) so the four-letter code isn't the only cue; separately, either wire `CATS[k].color`/`USERS[].color` to the new palette or remove the dead fields so the source doesn't contradict DESIGN.md.
Suggested command: `$impeccable clarify`

**[P3] Six minor design-token mismatches (polish-level, not structural).**
Radii at 2px/9px/5px and font-sizes at 9px/26px/10px fall outside DESIGN.md's declared scales; `#EDEDF0` (resting cadence-dot background) is undocumented. Low impact, flagged for completeness since the detector caught it.
Suggested command: `$impeccable polish`

## Persona Red Flags

**Alex (Power User):** Clicks `.tile.warm` expecting it to filter (it looks exactly like a clickable chip) — nothing happens. No sort control beyond the hardcoded warm+age order. Category chips are single-select, so comparing Cat1 and Cat3 side by side requires two separate passes. No dense/compact view for scanning past ~15-20 leads.

**Sam (Accessibility-dependent):** The signal-freshness dot (`.sdot`) carries meaning by color alone, no text/`title` fallback. Cadence dots (`.step.now`/`.step.done`) have no `aria-current` or text state — a screen reader announces nothing about pipeline progress. `.list`/`.card` are plain `<div>`s, not `<ul>/<li>` or `role="list"`, so item count and position are never announced.

**Marisol (vendedora, 8am triage under time pressure — PRODUCT.md's mixed-fluency rep persona):** Expects one obvious "call this one first"; gets nine identically-templated cards. The "by category" heading promises sections she doesn't get, so she re-clicks chips category-by-category instead of seeing her whole pipeline at once. Her actual next task — the cadence "Next" label — is the smallest, lowest-weight text on the card.

## Minor Observations

- Sort ignores cadence staleness — a stage-3 lead idle 11 days doesn't outrank a stage-0 lead at 8 days, even though both are arguably overdue in different ways.
- Empty state ("No leads match this filter") has no inline "clear filters" action.
- User switcher shows no per-teammate lead count, so you can't tell at a glance who's overloaded.
- Six token-scale mismatches from the detector (see Priority Issues P3).

## Questions to Consider

1. The sort logic already encodes priority (warm-first, then freshest signal) — should the *layout itself* change shape around that (a distinct top tier vs. a compressed remainder), or is a visible rank/caption enough?
2. Does "by category" mean *grouped* or *filtered*? Right now it's neither fully — pick one and make the DOM match it.
3. If signal and next-action are the two facts that matter most per PRODUCT.md, why does company name still win the page's visual hierarchy?
