# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`prima-gtm-skills` holds reusable Claude Code skills for Prima's GTM channel targeting **Data Centers**
(Power & Electrical, and Energy Storage sub-verticals). It is not a traditional software repo — there is
no build, lint, or test tooling. The "code" is 7 Markdown skill files that Claude executes directly,
operating on local CSVs via natural-language instructions in the terminal plus pay-per-use provider APIs.

This is the **terminal-first** replacement for a Clay-style enrichment UI: classification, signal
extraction, hook writing, and the email waterfall all run as Claude instructions over CSVs instead of
UI-based workflow nodes.

## Sources of truth — never duplicate these into the repo

- **"Ejecutable Maestro v2"** (Word doc in the Claude project, not Notion) — defines the full system
  architecture: the 5 layers (data → signals → enrichment → execution → measurement), the tool stack,
  the 7 skills below, guardrails, and the sprint plan. Read this before proposing any architecture change.
- **Notion "Data Centers GTM"** — the source of truth for the formal ICP: the 7 company Categories,
  Category-4 product-line segments, Priority marking, Disqualify/Disqualification-Signal criteria,
  and message guardrails. Skills reference it at run time; they must never hardcode a copy of this
  criteria or guardrail text that could drift out of sync.
  **Exception:** the 4A/4B/4C/4D sub-segment archetypes and the Aldahir/Manu vertical-owner split
  are this repo's own classification layer on top of Notion's Category-4 OEM segment — they do not
  exist in Notion under any name, so they are intentionally hardcoded in
  `prima-icp-check/SKILL.md` instead of being fetched live. Confirmed with Aldahir on 2026-07-19.

## The 5-layer pipeline

Data → Signals → Enrichment → Execution → Measurement. The 8 skills map onto this pipeline roughly in
the order listed below — a typical account moves through icp-check → signal-scan → scope-score →
committee → email-waterfall → hook → draft → guardrail-audit before anything is sent.

## The 8 skills

| Skill | Purpose |
|---|---|
| `prima-icp-check` | Validates an account (domain or name in) against the Notion ICP: sub-segment (4A/4B/4C/4D), priority (P1/P2/P3), vertical owner (Aldahir vs Manu), and exclusions. Outputs classification + reason in columns. |
| `prima-signal-scan` | Given a domain, scans 5 sources for verifiable signals: plant purchasing/supply chain/procurement job openings, capacity-expansion announcements, recent funding (Series B/C), target titles via Sales Navigator, and imports from Mexico (Import Genius). Outputs a dated, sourced signal list — empty if nothing verifiable turns up. **Never fabricates a signal.** |
| `prima-scope-score` | Estimates the probability (0-100, tiered) that an account actually subcontracts structural fabrication rather than manufacturing 100% in-house — Notion's "Equipment Procurement Scope" criterion, which is rarely publicly confirmable. Two hard overrides (confirmed in-house / confirmed Import Genius import) dominate the weighted score. Sets a P1 anti-burn flag so high-value accounts never reach a draft on score alone. Vertical-specific (Aldahir's product-type weight table only) — not portable to Manu's verticals as-is. |
| `prima-committee` | Identifies the buying committee — the 2-3 right contacts per account based on sub-segment (e.g. 4B → plant purchasing; 4C → founder/VP Engineering). |
| `prima-email-waterfall` | Waterfalls across data providers to find and verify a contact's email: falls through to the next provider on failure until a verified hit, or leaves the field empty if none succeed. |
| `prima-hook` | Pulls a specific, verifiable, sourced (URL-backed) fact from the account's site/news to open the email with — the first-line signal. **Never invents a claim.** |
| `prima-draft` | Generates 3 email drafts (E1/E2/E3) per contact under the message guardrails: 6-8 lines, signal first, "reliable supply" narrative (not cheap pricing), 10,000 tons/month, zero customer name-drops, zero unvalidated certifications, zero AI-sounding language. Always output marked as BORRADOR (draft). |
| `prima-guardrail-audit` | Final auditor — checks every draft against the full guardrail list and marks PASS or lists violations. Runs unconditionally before any email goes out; no exceptions. |

## Output files

A full pipeline run for a contact lands in two append-only local CSVs under `output/` —
`accounts_processed.csv` (the rich working file, one row per contact) and `tracker_light.csv` (a
minimal outreach log for Aldahir's own Google Sheet). See `output/README.md` for the exact schema
and which skill produces each column. Neither file connects to Sheets/Canva/Slack automatically —
that's a manual step Aldahir does afterward.

## Working conventions

- Treat `prima-signal-scan` and `prima-hook` outputs as strictly evidence-based: an empty result is
  correct and expected when no verifiable signal/hook exists — do not fill gaps with plausible-sounding
  invented content.
- `prima-guardrail-audit` is a mandatory gate, not optional QA — every draft from `prima-draft` must pass
  through it before it's considered sendable.
- When a skill's behavior seems to need to change, check the Ejecutable Maestro v2 doc and the Notion
  "Data Centers GTM" page first — this repo's skills should stay a thin execution layer over those, not
  grow independent logic that duplicates or contradicts them.
