# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the Prima Data Centers GTM team — Aldahir (GTM engineer, builds and maintains the
pipeline), Manu (peer vertical owner), Gaby (CRO), and the vendedores who run outreach day to
day. Each teammate sees only the leads assigned to them. Mixed technical fluency — some very
technical, some not. Used from a computer only; no mobile requirement.

## Product Purpose

Outreach Cockpit is the daily working dashboard for Prima's Data Centers outbound pipeline. It
shows every lead's category (Cat1–4), the verified signal that justifies contacting them, that
signal's age, the correct contact, the cadence stage (E1 → LinkedIn → E2 → E3), and whether a
warm intro is available — so a rep can look at their row and decide who to contact first in
seconds.

## Positioning

Not a CRM and not a generic pipeline tracker. It is the one glanceable status board built around
Prima's actual outbound motion — signal-first contact, and warm intros as a first-class fact a
generic board would never surface ("does Gaby or Daniel already know someone here").

## Operating Context

Used daily, at a desk, during active prospecting and follow-up. The intended data source is
`output/leads_master.csv` (the repo's unified lead file — 100 accounts, 179 contacts as of
2026-08-13) and eventually a live Google Sheet feed. As of 2026-08-14 the dashboard itself is
still a static prototype running on hardcoded sample data — the live wiring is a tracked pending
item, not yet built. It sits downstream of `prima-signal-scan`, `prima-committee`, and
`prima-email-waterfall` in the repo's pipeline, and alongside the team's manual outreach cadence.

## Capabilities and Constraints

**Confirmed:**
- Per-user filtering — each teammate's view is scoped to their own leads only.
- Category filter (Cat1–4) plus a warm-intro-only filter.
- Four stat tiles: my leads, fresh signals, warm intros, in sequence.
- Cadence tracker with four fixed steps: E1, LinkedIn, E2, E3.
- Desktop-only. No mobile/touch target requirement.

**Undecided / open:**
- Live data wiring to `leads_master.csv` / Google Sheet — not yet built (tracked in
  `SESION_LOG.md`).
- Whether the card-list layout structure gets reworked in a future pass — the 2026-08-14 visual
  pass restyled the existing structure but did not restructure it; flagged as a next-session
  decision, not yet made.

## Brand Commitments

Prima brand: black, white, and a single red accent (~#C81E3A). Red is reserved — a border, one
key datum, or the active state; it never fills a large area and never becomes the dominant color
of the page. Style reference: Linear, Vercel — minimalist, generous whitespace, clear hierarchy.

Explicit anti-references (confirmed rejections): purple-to-blue gradients, decorative dotted-grid
backgrounds, uppercase-mono treatment on every label, cards nested inside cards, generic
AI-cliché typefaces (named example: Space Grotesk).

Voice: direct, technical, no filler — reads like a B2B sales operator who knows what they're
doing, not like marketing copy.

## Evidence on Hand

The current `docs/outreach-cockpit.html` contains a working data model (`LEADS`, `USERS`, `CATS`
arrays) but it is sample/placeholder data, not live. The real source of truth for future live
data is `output/leads_master.csv`, documented in this repo's root `CLAUDE.md`.

## Product Principles

1. Glanceability over decoration — this is Operate mode; the user must read a lead's status in
   seconds, not study it.
2. Signal-first — every lead's claim on attention traces to a verifiable, sourced signal; nothing
   is invented to fill a gap.
3. Warm intro is the single highest-leverage fact on the page and is the one thing that earns the
   reserved accent color.
4. Per-user scoping is a hard default — no teammate sees another's leads unless explicitly
   switched.
5. Desktop-only is a real constraint, not a placeholder — mobile responsiveness is not traded
   against clarity here.

## Accessibility & Inclusion

Keyboard and screen-reader operability is a confirmed requirement, not optional polish. Hardened
2026-08-14: category filters, the warm-intro toggle, and the user selector are keyboard-navigable
real controls with ARIA state (`aria-pressed` / `aria-checked` / `role="group"`). Text contrast
must clear WCAG AA (≥4.5:1) — the tertiary text token was raised from ~2.6:1 to ~5.0:1 against
both the page background and card surfaces for exactly this reason.
