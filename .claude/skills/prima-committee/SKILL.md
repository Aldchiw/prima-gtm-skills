---
name: prima-committee
description: Identifies the buying committee — 2-3 real, named contacts per account — for accounts already classified `4B` or `4C` by `prima-icp-check` (`4A`/`4D` not supported yet). Sources names via free WebSearch (company site + public LinkedIn snippets) first; only falls back to paid Deepline providers (ContactOut, Lusha, RocketReach, etc.) after stopping to show how many accounts need paid lookup and the estimated cost, and getting explicit approval — same gate as the Clay-vs-Terminal pilot. Never fabricates a name — if no verifiable contact is found for a role, outputs the target role/title only. Use this after `prima-icp-check` (and ideally after `prima-signal-scan` has confirmed the target-title door exists) and before `prima-email-waterfall` needs a named person to find an email for.
---

# prima-committee

Given an account already classified by `prima-icp-check` (`sub_segment`, `priority`,
`vertical_owner`, `excluded`), identify the 2-3 real people who make up its buying committee and
hand named contacts to `prima-email-waterfall`.

## Scope — 4B and 4C only, this sprint

Only accounts with `sub_segment = 4B` or `4C` (and `excluded = no`) get worked. `4A` and `4D`
buying-committee roles aren't defined yet — don't invent them. Mark those accounts
`SUB_SEGMENT_NOT_SUPPORTED` and move on; add them in a follow-up sprint once 4A/4D committee roles
are defined.

`excluded = yes` or `sub_segment = UNKNOWN` accounts are skipped outright (`SKIPPED_EXCLUDED` /
`SKIPPED_UNKNOWN`) — there's no committee to find on an account that shouldn't be pursued or isn't
even classified yet.

## Target title dictionary (hardcoded, provisional) — same exception as prima-icp-check's 4A–4D scheme

**This is a dictionary of what to search for, not a list of contacts to write to.** Named
individuals cited as "evidence" below are proof that a title exists in the real world at a real
account of this sub-segment — they are not recipients, and finding one at Account X says nothing
about who holds that title at Account Y. Every real search still has to find its own name.

Like the 4A–4D archetypes themselves, this dictionary doesn't exist anywhere in Notion — it's this
repo's own layer, hardcoded here rather than fetched live. **Provisional**: built from real job
postings and named executives observed at reference accounts during Sprint 2 testing
(2026-07-20), not yet confirmed as complete by Aldahir/Gaby — flag any account whose real committee
uses a title not listed here so the dictionary grows over time.

**Reoriented around who actually buys fabrication, not who runs the company.** Prima sells a
supply-chain/procurement purchase, not an executive decision — a plant purchasing manager or a
commodity manager evaluates and picks a fabrication supplier; a CEO or COO almost never does. Titles
are grouped into two priority tiers per sub-segment:

- **PRIORIDAD ALTA** — supply chain / purchasing / sourcing titles. Search these first; the first
  verifiable name found in this tier becomes contact #1.
- **PRIORIDAD SECUNDARIA** — executives (founder/CEO, COO, VP Engineering, VP Operations). These
  fill contact #2/#3, or become contact #1 only when nothing in PRIORIDAD ALTA turns up a
  verifiable name for that account.

### `4B`

| Tier | Title | Evidence |
|---|---|---|
| ALTA | Buyer | Real — active posting, Delta Star |
| ALTA | Director of Sourcing | Real — Trystar (Sourcing Management team) |
| ALTA | Strategic Sourcing Manager / New Product Sourcing Manager / Indirect Sourcing Manager | Real — Trystar |
| ALTA | Commodity Manager (e.g. Strategic Sourcing Commodity Manager) | Real — Trystar |
| ALTA | Senior Supply Chain Manager | Real — active posting, Trystar |
| ALTA | Materials Control Manager | Real — Powell Industries (division-level, more tactical) |
| ALTA | Master Planner / Supply Chain Specialist-Planner | Real — active postings, Delta Star (tactical, likely not the sole decision-maker, but a real operational contact) |
| ALTA | Plant Purchasing Manager / Procurement Manager | **Inferred, no direct evidence found yet** — the original generic guess; no 4B reference account showed this exact title, only more specific variants above |
| SECUNDARIA | VP of Operations | Real — Powell Industries |
| SECUNDARIA | Senior Director, Operations | Real — Powell Industries |
| SECUNDARIA | Plant Manager / Director of Manufacturing | **Inferred, no evidence found** |

### `4C`

| Tier | Title | Evidence |
|---|---|---|
| ALTA | Director, Electrical Strategic Sourcing (or equivalent "Director, [domain] Strategic Sourcing") | Real — active posting, Mainspring Energy |
| ALTA | Senior Staff Commodity Manager, [domain] Strategic Design Sourcing | Real — active posting, Mainspring Energy |
| ALTA | Global Supply Manager | Real — active posting, a 4C battery-storage reference account (scope: sourcing battery cells/strategic materials) |
| ALTA | Head of Supply Chain | Real function, **title string inferred** — a reference account's supply-chain lead (ex-procurement background); confirm exact title before using verbatim |
| SECUNDARIA | Founder & CEO — **only when the account is small/early enough that the founder plausibly still touches procurement directly**; don't default to this for a scaled-up 4C | Real — an existing-customer reference account (see note below); use as title evidence only |
| SECUNDARIA | CEO (non-founder, post-transition) | Real — Mainspring Energy (Tom Linebarger; see [[account_mainspring_ceo_transition]] memory) |
| SECUNDARIA | Co-founder & President (post-CEO-transition) | Real — Mainspring Energy (Shannon Miller) |
| SECUNDARIA | Co-founder & COO | Real — an existing-customer reference account; use as title evidence only |
| SECUNDARIA | VP Engineering / VP Systems Engineering | Real — an existing-customer reference account; use as title evidence only |
| SECUNDARIA | Director of Manufacturing | Real — Mainspring Energy |
| SECUNDARIA | Head of Manufacturing (e.g. "runs the deployment factory") | Real function, **title string inferred** — a reference account; confirm exact title before using verbatim |

**Note on "an existing-customer reference account" above:** several 4C titles were sourced from
Antora Energy, which is an existing Prima customer (confirmed 2026-07-20 — see
[[account_antora_existing_customer]] memory and the "existing customer" exclusion added to
`prima-icp-check`). The titles stay in this dictionary as valid vocabulary evidence; the account
name is intentionally not printed here since this file could otherwise get copied toward outbound
material — never write "Antora" into an actual draft (`prima-guardrail-audit` Blocker B3 would
catch it anyway, but don't rely on that backstop when it's this avoidable).

Cap at 3 contacts per account regardless of tier. If more than 3 verifiable names surface, keep the
most PRIORIDAD ALTA-weighted ones — don't pad the output with a 4th just because more names were
found, and don't let a SECUNDARIA name bump an ALTA one out of the top 3.

## Sourcing — two tiers, with a mandatory approval gate before Tier 2

There is no Sales Navigator seat or API in this session — only WebSearch and Notion are
tool-connected directly, though Deepline (with paid people-search providers) is available as a
separate, cost-bearing system.

### Tier 1 — WebSearch (free, always run first)

For each target role, search:
- The company's own site: About / Leadership / Team / Press / Newsroom pages.
- `site:linkedin.com/in "[title]" "[company]"`-style WebSearch queries — this surfaces a name,
  title, and profile URL from the public snippet without needing a LinkedIn seat or login.
- Press releases, news articles, investor filings, or conference speaker lists that name someone in
  the target role at this company.

### Tier 2 — Deepline paid providers (gated, never automatic)

Only for roles where Tier 1 found nothing verifiable. Before calling **any** paid Deepline provider
(ContactOut, Lusha, RocketReach, linkedin_scraper, crustdata, etc.) on a batch:

1. **Stop.** Do not make the paid call yet.
2. Report to the user: how many accounts/roles in this run have no Tier-1 result and would need
   Tier 2, and the estimated cost of running that sample (per Deepline's provider credit pricing).
3. Wait for explicit approval — the same gate as the Clay-vs-Terminal pilot. A prior approval does
   not carry over to a new batch/session.
4. If approved, run Tier 2 **only** for the specific accounts/roles that failed Tier 1 — not the
   whole batch — and merge results into the same output.

### What counts as "verifiable"

A public source showing the name attached to that specific title at that specific company: a
company leadership/team page, a public LinkedIn profile/snippet with a visible title+company match,
a press release/news article naming the person in the role, or a Deepline provider hit with a
current, matching employment record. A bare name with no title/company match doesn't count.

### If nothing verifiable turns up

Output the role/title only — no name, no profile URL, nothing invented. This mirrors
`prima-signal-scan`'s "never fabricate" rule: an empty or partial committee is the correct, expected
output when the evidence isn't there.

## Process

1. Take input from `prima-icp-check`'s output (`domain`/`account_name`, `sub_segment`, `priority`,
   `vertical_owner`, `excluded`). An account already `excluded = yes` (including the "Existing
   customer" reason — see that skill's Exclusions section) never reaches this skill in the first
   place; don't re-check customer status here, `prima-icp-check` already gates it upstream.
2. Filter: keep `sub_segment` in `{4B, 4C}` and `excluded = no`. Everything else gets a single
   skipped/unsupported row (see Output) with no sourcing attempted.
3. For each remaining account, work the sub-segment's PRIORIDAD ALTA titles first — try each ALTA
   title in the dictionary until one produces a verifiable name; that becomes contact #1.
4. Run Tier 1 (WebSearch) for each title attempted, in ALTA-then-SECUNDARIA order.
5. Fill contact #2/#3 from any additional ALTA titles that also produced a verifiable name, then
   from SECUNDARIA titles. If **no** ALTA title produced anything verifiable at all, a SECUNDARIA
   title may become contact #1 instead — don't leave contact #1 empty when a real (if lower-priority)
   contact exists.
6. Collect the accounts/titles where Tier 1 failed into the Tier-2 candidate set.
7. If that set is non-empty, run the Tier 2 approval gate above before touching any paid provider.
8. Merge Tier 1 + (approved) Tier 2 results; anything still unresolved becomes a role-only row.
9. For multi-entity accounts flagged by `prima-icp-check` (e.g. the Applied Digital/ChronoScale
   split), source a committee per entity, not per domain — same rule as that skill's edge case.

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given by `prima-icp-check` (disambiguates multi-entity accounts) |
| `sub_segment` | `4B` \| `4C` |
| `committee_role` | the title label matched from the target title dictionary (e.g. "Director of Sourcing") |
| `priority_tier` | `ALTA` \| `SECUNDARIA` — which tier of the dictionary this contact's title came from |
| `contact_name` | blank if not found |
| `contact_title` | the actual title found (may read slightly differently than the generic role bucket) |
| `profile_url` | blank if not found |
| `source` | `WebSearch` \| `Deepline: <provider>` \| blank |
| `verified_date` | date the contact was found/confirmed |
| `status` | `CONTACT_FOUND` \| `ROLE_NOT_FOUND` \| `SUB_SEGMENT_NOT_SUPPORTED` \| `SKIPPED_EXCLUDED` \| `SKIPPED_UNKNOWN` |

One row per (account, committee_role) — 2-3 rows per qualifying account. Accounts that are skipped
or unsupported get exactly one row with `status` set accordingly and the rest of the row-specific
columns blank.

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep account order stable and match `prima-icp-check`'s row order.
