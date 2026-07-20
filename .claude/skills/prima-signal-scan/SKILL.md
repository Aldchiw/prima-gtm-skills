---
name: prima-signal-scan
description: Given a domain, scans 5 sources for verifiable Data Centers signals — plant purchasing/supply chain/procurement job openings, capacity-expansion news, recent funding or grants, target-title presence (Sales Navigator proxy), and Mexico→US customs imports (Import Genius). Outputs a dated, sourced signal list — empty (NO_SIGNAL) if nothing verifiable turns up, and explicitly NOT_CHECKED if a source couldn't be reached this run. Use this after `prima-icp-check` has classified an account and before `prima-committee`/`prima-hook` need something to work with. Never fabricates a signal.
---

# prima-signal-scan

Given a domain (already classified by `prima-icp-check`), scan 5 sources for verifiable,
dated, sourced signals and hand the result to `prima-committee` / `prima-hook`.

## Sources of truth

- **Target titles**: reuse the per-sub-segment entry-point table already defined in
  [`prima-icp-check/SKILL.md`](../prima-icp-check/SKILL.md#sub-segment-scheme-4a4d--business-archetype-within-category-4-oems)
  (4A → VP Strategic Sourcing / Director Procurement, 4B → plant purchasing / procurement,
  4C → founder / CEO / VP Engineering / Head of Manufacturing). Don't duplicate that table here —
  if it changes, this skill should pick up the change automatically by reading it fresh.
- **Notion "Data Centers GTM"** — the "Growth Signals" text already present for many accounts is a
  **lead, not a signal**. It tells you where to look; it was not written with a verification date
  and may be stale. Every signal that actually goes into this skill's output must be independently
  re-verified live, with its own URL and date. If you can't re-verify it, it doesn't go in the
  output — citing Notion's own prose as if it were a live source is exactly the kind of fabrication
  this skill exists to prevent.

## Tooling per source — what's available and what isn't

| # | Source | How it's checked | If unavailable |
|---|---|---|---|
| 1 | Job openings | WebSearch (LinkedIn Jobs, Indeed, company careers page — any public listing) | Always attempted; mark `NO_SIGNAL` if nothing turns up |
| 2 | Capacity-expansion news | WebSearch (press releases, trade press, company newsroom) | Always attempted; mark `NO_SIGNAL` if nothing turns up |
| 3 | Funding / grants | WebSearch (funding databases, press releases, company announcements) | Always attempted; mark `NO_SIGNAL` if nothing turns up |
| 4 | Target-title presence | WebSearch as a public-web proxy for Sales Navigator (no seat/API access exists, and none is planned) | Always attempted; mark `NO_SIGNAL` if no public evidence found |
| 5 | Import Genius (customs) | **Not tool-accessible at all.** Ivan and Zadrac run Import Genius manually and hand data to the user, who pastes it into this skill as input. | If no Import Genius data was provided in this session, mark `NOT_CHECKED`. **Never** search the public web to substitute for this — a WebSearch guess at customs data is not the same as an actual Import Genius record, and would be worse than saying nothing. |

Never invent a signal to fill a gap, and never blur `NOT_CHECKED` into `NO_SIGNAL` — the first means
"we don't know," the second means "we looked and there's nothing." Downstream skills and the humans
reading this output need that distinction to not misread "we didn't check" as "no activity."

## The 5 sources, in detail

### 1. Job openings (`signal_type = job_opening`)

Search for open or recently-posted roles at the account matching plant purchasing, procurement,
supply chain, or strategic sourcing. The title list is **open, not closed** — variants that count
(per existing ICP briefs, already seen documenting scaling accounts): Sourcing Manager, Commodity
Manager, Supply Chain Manager, Manufacturing Engineer, and equivalents. Use judgment for titles not
listed here, but don't stretch to unrelated roles just to produce a hit.

Freshness (provisional — adjust once we have real data):

| Posting status | Freshness | Usable as a first-line hook? |
|---|---|---|
| Open now | `fresh` | Yes — strongest job-opening signal |
| Closed, but posted ≤90 days ago | `recent` | Weak — context, not a hook |
| Posted >90 days ago | `stale` | No — report it, but don't hook on it |

### 2. Capacity-expansion news (`signal_type = capacity_expansion`)

Search for public news of the account expanding manufacturing capacity, opening/expanding a plant,
new production lines, or similar. Always independently verified and dated — see the Notion note
above. Use the generic freshness bucket: `fresh` ≤30 days, `recent` ≤90 days, `stale` >90 days.
Report what you find regardless of bucket; freshness just tells downstream skills how to use it.

### 3. Funding / grants (`signal_type = funding` or `grant`)

Two distinct signal types under one source:

- **`funding`** — equity rounds (Series A/B/C/D or later). B/C is the sweet spot (matches the
  typical 4C post-Series-B/C profile facing contract-delivery pressure); Series A also counts for
  young 4C accounts but log it as a weaker signal.
- **`grant`** — non-equity funding (e.g. a DOE grant). Always check whether the grant is active or
  frozen/stalled/paused. **A frozen or stalled grant is not a positive signal and must never be used
  as a hook** — still report it (it's real, verifiable information) but say so explicitly in
  `signal_summary` (e.g. "$87M DOE grant — FROZEN, not usable as a hook") so nobody downstream
  mistakes it for good news. This is exactly the Mainspring Energy case: the DOE grant is frozen —
  that's a red flag/context note, not an opening line.

Freshness / usability window (provisional — adjust once we have real data):

| Age | Freshness | Usable as a first-line hook? |
|---|---|---|
| ≤90 days | `fresh` | Yes (unless frozen/stalled — see above) |
| 90 days – 12 months | `recent` | No — context only |
| >12 months | — | **Not a signal.** Don't report it as a row at all — this is the one case where age alone drops it out of the output entirely, unlike job openings and news which still get logged as `stale`. |

**Observed edge case (evidence for window validation, not yet a reason to change the window):**
Mainspring Energy's $258M Series F (announced 2025-04-14, General Catalyst-led) aged out of the
12-month funding window during a live test run on 2026-07-19 (~15 months old) — it was excluded from
output as `NO_SIGNAL` even though it's clearly still relevant context for a 4C account. This is the
kind of case Aldahir wants to see accumulate before deciding whether 12 months is the right cutoff —
log similar borderline cases here as they come up, but the window stays provisional/unchanged until
there's a real decision to revisit it.

### 4. Target-title presence (`signal_type = target_title`) — boundary with `prima-committee`

This is a **boolean signal only**: "do people holding the entry-point titles for this account's
sub-segment exist today, with public evidence (e.g. a visible LinkedIn profile, a leadership/team
page)?" Answer yes/no with a source URL.

**Do not bring back names, profiles, or contact details** — identifying *who* holds the role is
100% `prima-committee`'s job. This skill only confirms the door exists; `prima-committee` identifies
who's behind it. If you catch yourself writing a person's name into `signal_summary`, stop — that
belongs in the next skill, not this one.

Use the title list already defined per sub-segment in `prima-icp-check` (see Sources of truth above)
— don't maintain a second copy of it here.

### 5. Import Genius / customs (`signal_type = customs`) — the strongest signal in the system

**This source is never searched or fabricated by the skill.** Import Genius is operated manually by
Ivan and Zadrac; the user pastes the resulting data into the session as input. This skill's only job
is to parse what's given and register it — if nothing was provided, the source is `NOT_CHECKED`, full
stop.

What counts as a signal: the account **imports from Mexico into the US** (not the reverse — exports
to Mexico are not the signal). This demonstrates existing nearshoring precedent, which is exactly
Prima's pitch. The merchandise must be relevant metal fabrication of the kind Prima produces —
enclosures/cabinets, transformers, switchgear components, structural steel, battery casings,
assemblies. Unrelated imports (e.g. consumer electronics) don't count, even if the direction is
right.

**When a customs signal exists, it outranks every other signal for this account.** Flag it clearly
in the account-level rollup (see Output) so downstream skills default to it as the strongest hook
material.

## Output

Emit **one row per (domain, signal_type) at minimum** — every account gets a row for all applicable
signal types even when nothing was found, so `NO_SIGNAL` and `NOT_CHECKED` are always explicit rather
than implied by absence. When a signal type turns up more than one distinct finding for an account
(e.g. two open job postings), add one additional `SIGNAL_FOUND` row per finding.

| Column | Values |
|---|---|
| `domain` | the account domain |
| `signal_type` | `job_opening` \| `capacity_expansion` \| `funding` \| `grant` \| `target_title` \| `customs` |
| `signal_summary` | one factual line — blank when `status != SIGNAL_FOUND` |
| `signal_date` | date the underlying event/posting/filing happened — blank when `status != SIGNAL_FOUND` |
| `freshness` | `fresh` \| `recent` \| `stale` — blank when `status != SIGNAL_FOUND` (see per-source windows above) |
| `source_url` | link backing the signal — blank when `status != SIGNAL_FOUND`; for `customs`, cite what the user provided (e.g. "Import Genius data provided by user, [date]") since there may be no public URL |
| `status` | `SIGNAL_FOUND` \| `NO_SIGNAL` \| `NOT_CHECKED` |

### Account-level rollup

After the per-signal rows, add one rollup row (or block) per account with: `domain`,
`signal_types_found` (list), `has_customs_signal` (`yes`/`no` — the override flag from source #5),
and a one-line `top_signal` pointer (the customs signal if one exists; otherwise the freshest usable
hook among the rest). This is a pointer for humans and downstream skills to orient quickly — it
doesn't replace reading the full row set.

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep one block of rows per input account, in the order the accounts were
given.
