---
name: prima-signal-scan
description: Given a domain, scans 5 sources for verifiable Data Centers signals — plant purchasing/supply chain/procurement job openings, capacity-expansion news, recent funding or grants, target-title presence (Sales Navigator proxy), and Mexico→US customs imports (Import Genius). Target titles for job-opening and target-title checks are read fresh from `prima-committee`'s dictionaries (`4B`/`4C`/`Cat3`) — this skill keeps no title list of its own, and matches by function (not exact string) the same way committee does. Outputs a dated, sourced signal list — empty (NO_SIGNAL) if nothing verifiable turns up, and explicitly NOT_CHECKED if a source couldn't be reached this run. Use this after `prima-icp-check` has classified an account and before `prima-committee`/`prima-hook` need something to work with. Never fabricates a signal.
---

# prima-signal-scan

Given a domain (already classified by `prima-icp-check`), scan 5 sources for verifiable,
dated, sourced signals and hand the result to `prima-committee` / `prima-hook`.

## Sources of truth

- **Target titles**: reuse the target-title dictionaries already defined in
  [`prima-committee/SKILL.md`](../prima-committee/SKILL.md#target-title-dictionary-hardcoded-provisional--same-exception-as-prima-icp-checks-4a4d-scheme)
  — `4B`, `4C` (ALTA/SECUNDARIA/FALLBACK), and `Cat3` (Principal/Secundario) — fetched fresh, never
  copied into this file. `4A`/`4D` aren't supported yet (`prima-committee` doesn't have a dictionary
  for them either); mark job-opening/target-title checks `NOT_CHECKED` for those rather than
  guessing at titles. Also inherit `prima-committee`'s **function-match rule**: a title counts
  toward a signal if it performs the target function (buys/manages supply, or runs
  production/plant/prefabrication), even when the exact string differs from committee's examples —
  see that skill's "Title matching: function, not exact string" section.
  **This skill used to keep its own separate, hardcoded title list here — that duplication went
  stale and caused a real miss (see the 2026-08-04 learning under "Job openings" below). There is
  now exactly one title dictionary for the whole pipeline, and it lives in `prima-committee`, not
  here.**
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

## Query pattern for Cat3 manufacturing-division accounts (learning, 2026-08-04)

Many `Cat3` accounts are a named manufacturing division inside a larger parent company (Excellerate
inside Faith Technologies, RK Mission Critical inside RK Industries, and equivalents). Searching by
the **division's name alone**, for any of the 5 sources below, risks pulling in an unrelated,
same-named company — during the Excellerate signal-scan run, a plain `"Excellerate"` job-openings
search surfaced a South African property-management firm ("Excellerate JHI") with zero relation to
Faith Technologies. The pattern that actually works: search by the **parent company's name**, and
require the **division's name inside the specific posting/article/title** — e.g. `"Faith
Technologies" "Excellerate"` rather than `"Excellerate"` alone. Apply this to every WebSearch query
this skill runs for a `Cat3` account, not just job openings — capacity-expansion news and
target-title checks carry the same homonym risk.

## The 5 sources, in detail

### 1. Job openings (`signal_type = job_opening`)

Search for open or recently-posted roles matching the account's target-title dictionary in
`prima-committee/SKILL.md` (see "Sources of truth" above): `4B`/`4C` ALTA → SECUNDARIA → FALLBACK,
or `Cat3` Principal → Secundario, depending on the account's classification. Apply committee's
**function-match rule**: a posting counts as a job-opening signal if the role buys/manages
materials/fabrication supply, or runs production/plant/prefabrication — even when the exact title
isn't one of committee's listed examples. For a `Cat3` account, also apply the query pattern above
(parent company name + division name in the title) to avoid homonym false positives.

**Learning (2026-08-04, Excellerate run):** this section used to hardcode its own separate, generic
list here — Sourcing Manager, Commodity Manager, Supply Chain Manager, Manufacturing Engineer — kept
out of sync with `prima-committee`'s dictionary. Run literally against Excellerate (a `Cat3`
account), it returned **zero results**: none of those four generic titles are close enough to the
real open reqs ("Excellerate Procurement Manager," "Plant Manager - Excellerate") for a
title-matching WebSearch to surface them, and the old list had no `Cat3` entry point at all — this
skill didn't even know `Cat3` existed. The real postings only turned up after manually reformulating
the query around the actual `Cat3` Principal/Secundario titles and the parent+division query
pattern. That's why this skill no longer keeps a title list of its own — see "Sources of truth"
above.

#### Domain-scoped fallback for generic titles (learning, 2026-08-04)

Fixing the title dictionary and the parent+division query pattern (above) isn't always enough on its
own: a **generic, short title** (one or two common words — "Plant Manager," "Buyer," "Category
Manager") can still get drowned out in open-web search even when the query correctly quotes the
target phrase and requires the parent+division terms. Open-web search engines rank by semantic
relevance, not strict phrase-AND matching, so a generic title can pull in noise from unrelated
companies that happen to rank higher, burying (or fully excluding) the real posting from the results
shown.

**Rule: a target title is only marked not-found after it's been searched scoped to the company's own
domain, not just the open web.** Before concluding `NO_SIGNAL` for a title that came back empty (or
suspiciously all-noise) on an open-web query, retry scoped to the account's domain:
- `site:[account-domain] "[target title]"` (e.g. `site:faithtechnologies.com "Plant Manager"`)
- The company's own careers/jobs page directly, if one is known or discoverable
- The domain of its ATS, if identifiable (e.g. `myworkdayjobs.com`, `greenhouse.io`, `lever.co`,
  `icims.com` — often visible from other postings already found for the same account)

Only after a domain-scoped attempt also comes back empty does the title get logged `NO_SIGNAL`.

**Learning (2026-08-04, Excellerate run):** this is exactly the gap the pattern above didn't close.
A specific-enough title — "Procurement Manager" — surfaced on the very first open-web query. But
"Plant Manager," a generic two-word title, returned only noise from unrelated companies (Rockwool,
Plant Prefab) on the same well-formed query (parent+division terms, quoted phrase) — the real
"Plant Manager - Excellerate" posting only surfaced once the search was scoped to
`faithtechnologies.com`.

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
sub-segment (or, for `Cat3`, its `company_category`) exist today, with public evidence (e.g. a
visible LinkedIn profile, a leadership/team page)?" Answer yes/no with a source URL.

**Do not bring back names, profiles, or contact details** — identifying *who* holds the role is
100% `prima-committee`'s job. This skill only confirms the door exists; `prima-committee` identifies
who's behind it. If you catch yourself writing a person's name into `signal_summary`, stop — that
belongs in the next skill, not this one.

Use the target-title dictionaries defined in `prima-committee` — `4B`/`4C` or `Cat3`
Principal/Secundario, per the account's classification (see "Sources of truth" above) — don't
maintain a second copy of them here. Apply the same function-match rule as in "Job openings" above:
a person's title counts as evidencing the role even if it isn't one of committee's listed examples,
as long as it performs the target function. For a `Cat3` account, use the parent+division query
pattern above for this search too.

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
