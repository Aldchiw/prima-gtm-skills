---
name: prima-committee
description: Identifies the buying committee — real, named contacts per account — for accounts already classified `4B`/`4C` (via `sub_segment`) or `Cat3` (via `company_category`) by `prima-icp-check` (`4A`/`4D` sub-segments not supported yet). Sources widely (3-4 verifiable names per account — the "banca") but writes narrowly: the outreach guardrail still caps actual contact at 2 people per account regardless of segment, with the rest held on the bench for later promotion if a contact doesn't respond. Cat3 also enforces a stricter manufacturing-division-only rule and, since its targeting logic is an unvalidated v1 hypothesis (Aldahir, 2026-08-03), sourcing runs on every Cat3 priority but `P1` contacts always come back as `NEEDS_HUMAN_REVIEW` (never auto-cleared `CONTACT_FOUND`) until the hypothesis is validated on `P2` data. Writes/updates an accumulative `output/account_roster.csv` (never regenerated) tracking every sourced name — skill-owned columns vs. operator-owned lifecycle columns (`contact_status`, touches, outcome) — and only hands `active`-status contacts to `prima-email-waterfall`; bench contacts stay `email_status = NOT_ATTEMPTED` so Deepline credits are never spent on an unpromoted name. Sources names via free WebSearch (company site + public LinkedIn snippets) first; only falls back to paid Deepline providers (ContactOut, Lusha, RocketReach, etc.) after stopping to show how many accounts need paid lookup and the estimated cost, and getting explicit approval — same gate as the Clay-vs-Terminal pilot. Never fabricates a name — if no verifiable contact is found for a role, outputs the target role/title only. Use this after `prima-icp-check` (and ideally after `prima-signal-scan` has confirmed the target-title door exists) and before `prima-email-waterfall` needs a named person to find an email for.
---

# prima-committee

Given an account already classified by `prima-icp-check` (`sub_segment`, `priority`,
`vertical_owner`, `excluded`), identify the 2-3 real people who make up its buying committee and
hand named contacts to `prima-email-waterfall`.

## Scope — 4B, 4C, and Cat3 (P2 only), this sprint

An account gets worked if `excluded = no` AND either:
- `sub_segment` is `4B` or `4C` (the 4A–4D scheme, from `prima-icp-check`), or
- `company_category = Cat3` (from `prima-icp-check` — Cat3 accounts carry `sub_segment = N/A-Cat3`
  and don't use the 4A–4D scheme at all; see "Cat3 (`company_category = Cat3`)" below for its own
  target-title dictionary, division rule, and exclusions).

`4A` and `4D` buying-committee roles aren't defined yet — don't invent them. Mark those accounts
`SUB_SEGMENT_NOT_SUPPORTED` and move on; add them in a follow-up sprint once 4A/4D committee roles
are defined.

`excluded = yes`, `sub_segment = UNKNOWN`, or `company_category = UNKNOWN` accounts are skipped
outright (`SKIPPED_EXCLUDED` / `SKIPPED_UNKNOWN`) — there's no committee to find on an account that
shouldn't be pursued or isn't even classified yet.

### Cat3 hard gate: `P2`/`P3` auto-clear, `P1` always requires human confirmation

The Cat3 targeting logic below (division rule, exclusions, title dictionary) is an **unvalidated v1
hypothesis** — see the callout under "Cat3" for why. This gate does **not** block Cat3 `P1` accounts
from sourcing: with only two Cat3 `P2` accounts currently in Notion, freezing `P1` out entirely would
leave too small a sample to ever validate the hypothesis. The real protection is a human confirming
the actual person, not blocking the account:

- **`company_category = Cat3` and `priority = P2`** (or `P3`): sourcing runs normally, and a
  verifiable contact clears straight to `status = CONTACT_FOUND`, same as today. This is where the
  hypothesis gets tested.
- **`company_category = Cat3` and `priority = P1`** (e.g. Rosendin, Mission Critical Group,
  Excellerate): sourcing runs exactly the same way — **don't skip it.** But the result is **never**
  delivered as `CONTACT_FOUND`. Always output it as `status = NEEDS_HUMAN_REVIEW`, with `flag_reason`
  stating that this is a Cat3 `P1` account with unvalidated targeting logic, and that the operator
  must confirm the person actually belongs to the manufacturing/prefab division (see "Division rule"
  below) before the contact is handed to `prima-email-waterfall`. The message-risk itself is already
  covered downstream by the send-approval flow — this gate exists solely to force a human look at
  the contact before that.

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

### Title matching: function, not exact string

Every title listed in the `4B`, `4C`, and `Cat3` dictionaries below (and their Cat3 equivalents,
Principal/Secundario) is an **example of a function**, not a literal string a real title has to
match word-for-word. Match by function; accept a real contact whose title clearly performs that
function even when the exact wording differs.

- **Procurement / supply-chain / sourcing tier** (`ALTA` for `4B`/`4C`, `Principal` for `Cat3`): a
  title counts if that person buys or manages the sourcing of materials/fabrication for the
  account — regardless of exact wording. Real examples that should count even though none appear
  verbatim in any dictionary table: "Head of Global Sourcing," "Materials Manager," "Senior
  Manager, Indirect Procurement," "Commodity Manager," "Purchasing Director," "Supply Chain Lead."
  This isn't a closed list — the test is the function (do they buy/manage supply?), not the string.
- **Manufacturing / operations tier** (`SECUNDARIA` for `4B`/`4C`, `Secundario` for `Cat3`): a title
  counts if that person runs production, plant, or prefabrication — again by function, not by
  matching one of the example titles word-for-word.
- **`contact_title` always records the real title found** — never the dictionary's example string.
  **`committee_role` records the functional bucket it was matched to** (e.g. "Procurement / Supply
  Chain," "Manufacturing / Operations"), not the specific dictionary example that prompted the
  search.
- **The hard exclusions do not loosen under this rule.** Function-matching only expands what counts
  *within* a tier — it never overrides an exclusion. Project/jobsite purchasing agents, the parent
  contracting company's corporate procurement/leadership (`Cat3`), and construction executives are
  still always rejected, no matter how closely their title's function resembles a target tier.

**Why (decision: Aldahir, 2026-08-03):** the roster's purpose is having **live contact options** per
account for when one path doesn't work — not finding one exact title string. A real,
functionally-matching person is worth more than an empty row waiting for a title that happens to say
"Director of Supply Chain" verbatim. If genuinely nobody in either functional tier exists, Founder/
CEO remains a valid `FALLBACK` (`4C` only) — that's exactly the case the tier exists for.

**Reoriented around who actually buys fabrication, not who runs the company.** Prima sells a
supply-chain/procurement purchase, not an executive decision — a plant purchasing manager or a
commodity manager evaluates and picks a fabrication supplier; a CEO or COO almost never does. Titles
are grouped into two priority tiers per sub-segment:

- **PRIORIDAD ALTA** — supply chain / purchasing / sourcing titles. Search these first; the first
  verifiable name found in this tier becomes contact #1.
- **PRIORIDAD SECUNDARIA** — manufacturing / operations leadership (VP Manufacturing, VP Operations,
  Plant Manager, etc.). These fill contact #2/#3, or become contact #1 only when nothing in
  PRIORIDAD ALTA turns up a verifiable name for that account.
- **FALLBACK** (`4C` only — the lowest tier, below SECUNDARIA) — Founder/CEO. Used **only** when
  neither ALTA nor SECUNDARIA produced a verifiable name for that account — never as contact #1
  when someone from either of the other two tiers exists. See the `4C` table and its decision note
  below for why this moved here from where it used to sit.

### Banca vs. contacto — sourcing wide, writing narrow

Two different caps, on purpose, and easy to conflate:

- **Banca ("who we know")** — sourcing now aims for **3-4 verifiable names per account**, for every
  segment (`4B`, `4C`, and `Cat3` alike — this replaces the old caps of 3 for `4B`/`4C` and 2 for
  `Cat3`). Keep working down the tiers in priority order (ALTA→SECUNDARIA→FALLBACK for `4B`/`4C`;
  Principal→Secundario for Cat3) instead of stopping the moment enough names exist to write to.
  Every extra verifiable name found goes on the bench instead of being discarded — that's the whole
  point of widening sourcing.
- **Contacto ("who we write to")** — the outreach guardrail is unchanged and applies regardless of
  segment: **maximum 2 people per account** get an actual message. The top 2 verifiable names by
  tier order become the contact set; everyone else sourced stays on the bench, ranked, ready to
  promote later if a contact goes unanswered.

This distinction is what `output/account_roster.csv` (see "Contact roster" below) exists to track:
`contact_status = active` for the 2 being written to, `contact_status = bench` for the rest — so a
non-response can be promoted from the bench instead of re-sourcing the account from scratch, or
giving up on it too early.

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
| ALTA | Director of Supply Chain | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| ALTA | VP Supply Chain | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| ALTA | Director of Procurement | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| ALTA | Procurement Manager | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| ALTA | Strategic Sourcing Manager | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| ALTA | Category Manager (Metals / Fabrication) | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| SECUNDARIA | VP Manufacturing | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| SECUNDARIA | Head of Manufacturing (e.g. "runs the deployment factory") | Real function, **title string inferred** — a reference account; confirm exact title before using verbatim |
| SECUNDARIA | Director of Manufacturing Operations | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| SECUNDARIA | VP Operations | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| SECUNDARIA | Plant Manager | Real — per operator review of actual 4C outreach contacts, 2026-08-03 (see decision note below) |
| FALLBACK | Founder & CEO — **only when the account is small/early enough that the founder plausibly still touches procurement directly**, and never used if an ALTA/SECUNDARIA name already exists; don't default to this for a scaled-up 4C | Real — an existing-customer reference account (see note below); use as title evidence only |
| FALLBACK | CEO (non-founder, post-transition) | Real — Mainspring Energy (Tom Linebarger; see [[account_mainspring_ceo_transition]] memory) |
| FALLBACK | Co-founder & President (post-CEO-transition) | Real — Mainspring Energy (Shannon Miller) |

**Decision note (2026-08-03, operator: Aldahir):** Founder/CEO used to sit in PRIORIDAD SECUNDARIA —
the original dictionary design assumed 4C scale-ups had no real procurement function yet, so the
founder/CEO was treated as the closest thing to a buyer. That assumption doesn't hold: the real 4C
accounts already worked (Form Energy, EnerVenue, Eos, Redwood) turned out to already have an actual
supply-chain organization, surfaced while reviewing the contacts already chosen for their outreach.
Prima sells supply — that's a purchasing conversation, not an executive one — so ALTA and SECUNDARIA
were rebuilt around supply-chain/procurement and manufacturing/operations titles, and Founder/CEO
dropped to a last-resort FALLBACK tier: still real and still usable, but only when nothing else
verifiable turns up, and never as contact #1 over an ALTA/SECUNDARIA name. `Co-founder & COO` and
`VP Engineering` / `VP Systems Engineering` (both former SECUNDARIA rows) are dropped from this
dictionary entirely — they don't fit the new ALTA/SECUNDARIA/FALLBACK framing and weren't part of
what actually got chosen for outreach.

**Note on "an existing-customer reference account" above:** the Founder & CEO title in this
dictionary was sourced from Antora Energy, which is an existing Prima customer (confirmed
2026-07-20 — see [[account_antora_existing_customer]] memory and the "existing customer" exclusion
added to `prima-icp-check`). The title stays in this dictionary as valid vocabulary evidence; the
account name is intentionally not printed here since this file could otherwise get copied toward
outbound material — never write "Antora" into an actual draft (`prima-guardrail-audit` Blocker B3
would catch it anyway, but don't rely on that backstop when it's this avoidable).

Per "Banca vs. contacto" above: source up to 3-4 verifiable names per `4B`/`4C` account, ranked ALTA
before SECUNDARIA before FALLBACK. Only the top **2** become the contact set that actually gets
written to — don't let a lower-tier name bump a higher-tier one out of those 2 slots, whether it's
SECUNDARIA bumping ALTA or FALLBACK bumping either. Everyone else verifiable, up to the 3-4 sourced,
is bench — keep them ranked in `output/account_roster.csv`, don't discard them just because they
didn't make the contact set.

### `Cat3` (`company_category = Cat3`) — not on the 4A–4D scheme, capped at 2 contacts

> **⚠️ Unvalidated v1 hypothesis.** Everything in this subsection — the two target titles, the
> division rule, and the exclusions — is a judgment call assigned by the operator (Aldahir,
> 2026-08-03), not something confirmed by reply data yet. It has **not** been tested against real
> outbound responses. Treat it as a hypothesis to validate, not settled targeting logic: review it
> against **interested-reply-rate by segment** once enough Cat3 sends exist, and expect it to change.
> This is exactly why the Cat3 hard gate above lets `P2` accounts (e.g. Cupertino Electric, Southland
> Industries) auto-clear while always routing `P1` accounts (Rosendin, Mission Critical Group,
> Excellerate) through human confirmation instead — a wrong guess on a P2 account is a cheap lesson;
> a wrong guess on a P1 account is a burned high-value relationship, so a human confirms the person
> before it ever reaches `prima-email-waterfall`.

Cat3 companies (Modular DC Systems Manufacturers) are typically a manufacturing division operating
inside — or alongside — a larger parent contracting/construction business. The buying committee
lives in the manufacturing/prefab side, not the parent's corporate structure. Two targets, tried in
this order:

| Priority | Target | Titles |
|---|---|---|
| Principal | Procurement / supply chain **of the manufacturing division** | Director of Supply Chain, Procurement Manager, Strategic Sourcing Manager, Category Manager (Steel / Fabrication / Weldments) |
| Secundario | Manufacturing / prefabrication leadership | VP of Manufacturing, Director of Prefabrication, Director of Manufacturing Operations, Plant Manager |

The first verifiable name found under Principal becomes contact #1; Secundario fills contact #2, or
becomes contact #1 only when Principal turns up nothing verifiable. That's the contact set —
capped at **2**, same as before. Per "Banca vs. contacto" above, sourcing itself now goes wider:
keep searching past those first 2 hits, up to 3-4 verifiable names total per Cat3 account, and bench
the extras instead of stopping once the contact set is full.

#### Division rule (critical) — manufacturing division only, never the parent's corporate

A contact only counts if they clearly belong to the manufacturing/prefab division itself — **not**
the parent contracting company's corporate procurement or leadership. Notion's own account notes
give the pattern directly:
- **Excellerate** is approached directly, as its own manufacturing arm — separate from **Faith
  Technologies Inc.**, the parent contracting business.
- **RK Mission Critical** is the target — not **RK Industries**, the parent corporate.

If Tier 1 (or Tier 2) only turns up a contact on the parent-corporate side — their title, team, or
profile ties them to the parent contractor rather than the manufacturing/prefab division — **do not
return them as a valid committee contact.** Instead, flag the account for human review: keep the
name/title found, but set `status = NEEDS_HUMAN_REVIEW` and fill `flag_reason` with a concrete note
on why (e.g. "only found VP Supply Chain at [Parent Co] corporate — no division-level contact
surfaced; risk of emailing the wrong org"). A human decides whether that's close enough to use or
whether to keep searching.

#### Exclusions (Cat3-specific)

Never accept any of these as a valid Cat3 committee contact, even if the title superficially matches
a target role above:
- **Parent-contractor corporate procurement** — procurement/sourcing roles that sit at the parent
  contracting company level, not the manufacturing/prefab division (see Division rule above).
- **Project/jobsite purchasing agents** — buyers who source for a specific construction project or
  jobsite, not for the factory/shop itself. Prima sells to the factory, not the job.
- **Construction executives** — titles like VP Construction, Project Executive, or equivalent —
  these run field/project delivery, not fabrication sourcing.

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

1. Take input from `prima-icp-check`'s output (`domain`/`account_name`, `company_category`,
   `sub_segment`, `priority`, `vertical_owner`, `excluded`). An account already `excluded = yes`
   (including the "Existing customer" reason — see that skill's Exclusions section) never reaches
   this skill in the first place; don't re-check customer status here, `prima-icp-check` already
   gates it upstream.
2. Filter: keep `excluded = no` and either `sub_segment` in `{4B, 4C}` or `company_category = Cat3`.
   Everything else gets a single skipped/unsupported row (see Output) with no sourcing attempted.
3. For a `4B`/`4C` account, work the sub-segment's PRIORIDAD ALTA titles first — try each ALTA title
   in the dictionary until one produces a verifiable name; that becomes contact #1. For a Cat3
   account (any priority — `P1` sources exactly like `P2`/`P3`, see "Cat3 hard gate" above), work
   the Principal title first instead.
4. Run Tier 1 (WebSearch) for each title attempted, in priority order (ALTA-then-SECUNDARIA for
   4B/4C; Principal-then-Secundario for Cat3; `4C` only tries FALLBACK — Founder/CEO — after both
   ALTA and SECUNDARIA have been exhausted with nothing verifiable). Per "Banca vs. contacto" above,
   **don't stop at 2** — keep working down the tiers (and trying additional real candidates within a
   tier, if more than one surfaces) until either 4 verifiable names are found for the account or
   every tier/title has genuinely been exhausted. This is what builds the banca.
5. For `4B`/`4C`: rank every verifiable name found by tier (ALTA above SECUNDARIA above FALLBACK).
   For Cat3: rank by tier (Principal above Secundario). Don't let a lower-tier name outrank a
   higher-tier one regardless of the order they were actually found in.
6. For every Cat3 candidate found (in either tier), apply the division rule before accepting it: if
   the evidence ties the person to the parent contracting company's corporate side rather than the
   manufacturing/prefab division itself, don't accept it as `CONTACT_FOUND` — output it as
   `NEEDS_HUMAN_REVIEW` with `flag_reason` explaining the risk instead (see "Division rule" above).
   Also apply the Cat3 exclusions (parent-corporate procurement, project/jobsite purchasing agents,
   construction executives) at this same step — reject a title match against any of those outright,
   don't even flag it, just treat it as not found and keep searching. This applies to every
   candidate, active or bench — the division rule is about the person's identity, not who gets
   written to.
7. If the account is Cat3 **and** `priority = P1`: downgrade the status from step 6 — even a contact
   the division rule already accepted — from `CONTACT_FOUND` to `NEEDS_HUMAN_REVIEW`, with
   `flag_reason` noting this is a Cat3 `P1` account under the unvalidated-hypothesis gate and needs
   operator confirmation before use (see "Cat3 hard gate" above). This downgrade always applies to
   Cat3 `P1`, regardless of how clean the division-rule check came out, and regardless of active/
   bench.
8. Collect the accounts/titles where Tier 1 failed (and weren't already resolved as
   `NEEDS_HUMAN_REVIEW` or excluded) into the Tier-2 candidate set — i.e. accounts still short of
   either the 3-4 banca target or a filled contact set.
9. If that set is non-empty, run the Tier 2 approval gate above before touching any paid provider.
10. Merge Tier 1 + (approved) Tier 2 results; anything still unresolved becomes a role-only row.
11. From the ranked, verified list per account (step 5, after steps 6-7's checks), assign
    `contact_status`: the top **2** are `active` (the contact set); anyone else verifiable, up to
    the 3-4 sourced, is `bench`.
12. For multi-entity accounts flagged by `prima-icp-check` (e.g. the Applied Digital/ChronoScale
    split), source a committee per entity, not per domain — same rule as that skill's edge case.
13. Write/update `output/account_roster.csv` for every candidate sourced this run (both `active` and
    `bench`) — see "Contact roster" below for the accumulate/dedup/column-ownership rules. Set
    `contact_email` blank and `email_status = NOT_ATTEMPTED` on every row this skill touches
    regardless of `active`/`bench` — this skill never looks up emails itself.
14. Of everything just written, only rows with `contact_status = active` are eligible to be handed
    to `prima-email-waterfall` next. Don't pass `bench` rows forward for an email lookup — see
    "Why bench contacts don't get an email lookup" below for why.

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given by `prima-icp-check` (disambiguates multi-entity accounts) |
| `company_category` | `Cat3` \| `Cat4` \| `UNKNOWN` — as given by `prima-icp-check` |
| `sub_segment` | `4B` \| `4C` \| `N/A-Cat3` |
| `committee_role` | the **functional bucket** the contact was matched to (e.g. "Procurement / Supply Chain", "Manufacturing / Operations") — per "Title matching: function, not exact string" above, this is the bucket, not the specific dictionary example that prompted the search |
| `priority_tier` | `ALTA` \| `SECUNDARIA` \| `FALLBACK` (`FALLBACK` is `4C`-only) for `4B`/`4C` — `PRINCIPAL` \| `SECUNDARIO` for `Cat3` — which tier of the relevant dictionary this contact's title came from |
| `contact_status` | `active` \| `bench` — per "Banca vs. contacto" above: the top 2 verifiable names (by `priority_tier` rank) are `active`; anything beyond that, sourced but not written to, is `bench`. This run-level value only ever takes these two values — the operator-managed lifecycle (`exhausted`/`responded`/`do_not_contact`) lives only in `output/account_roster.csv`, never here |
| `contact_name` | blank if not found |
| `contact_title` | the real title found, verbatim — per "Title matching: function, not exact string" above, this is deliberately expected to read differently from any dictionary example |
| `profile_url` | blank if not found |
| `source` | `WebSearch` \| `Deepline: <provider>` \| blank |
| `verified_date` | date the contact was found/confirmed |
| `status` | `CONTACT_FOUND` \| `ROLE_NOT_FOUND` \| `NEEDS_HUMAN_REVIEW` \| `SUB_SEGMENT_NOT_SUPPORTED` \| `SKIPPED_EXCLUDED` \| `SKIPPED_UNKNOWN` |
| `flag_reason` | free text — required when `status = NEEDS_HUMAN_REVIEW`. Explains either (a) a Cat3 division-vs-parent-corporate risk found during sourcing, or (b) that this is a Cat3 `P1` account under the unvalidated-hypothesis gate and needs operator confirmation before use (see "Cat3 hard gate"). Blank otherwise. |

One row per (account, committee_role) — up to 3-4 rows per qualifying account (`4B`/`4C` or `Cat3`
alike): 2 `active` rows (the contact set) plus however many verifiable `bench` names were found on
top of that. Cat3 `P1` active rows always carry `status = NEEDS_HUMAN_REVIEW` instead of
`CONTACT_FOUND`, per the Cat3 hard gate — they're still real, sourced rows, just not auto-cleared.
Accounts that are skipped or unsupported get exactly one row with `status` set accordingly and the
rest of the row-specific columns blank.

## Contact roster — `output/account_roster.csv` (accumulative, cross-run)

In addition to the per-run CSV above, this skill writes/updates a second file every run:
`output/account_roster.csv`. Unlike every other output in this pipeline, this file **accumulates** —
it is never regenerated and never overwritten wholesale. If it doesn't exist yet, create it with
headers only. If it exists, only ever append new rows or update specific columns on existing rows.

### Unique key

One row per **(`account_name`, `contact_name`)** pair. Before writing a candidate, check whether
that exact pair already has a row:
- **Exists already** — update only the skill-owned columns below on that row. Never duplicate the
  row, and never touch the operator-owned columns.
- **New pair** — append a new row.

### Column ownership

| Ownership | Columns |
|---|---|
| **Skill** — written/updated freely on both new and existing rows | `account_name`, `company_category`, `sub_segment`, `contact_name`, `contact_title`, `priority_tier`, `profile_url`, `contact_email`, `email_status`, `source`, `found_date` |
| **Operator** — human-managed; this skill must **never** modify these on an existing row | `contact_status`, `touches`, `last_touch_date`, `last_channel`, `outcome`, `notes` |

**One exception, at row creation only:** when a row is first created (a new `account_name` +
`contact_name` pair), initialize `contact_status` — `active` for the 2 contacts that made the
contact set (see "Banca vs. contacto" above), `bench` for everyone else sourced this run. That's the
only time this skill ever writes to `contact_status`. Once the row exists, that column belongs to
the operator: a later run that re-finds the same person updates the skill-owned columns only and
leaves `contact_status` exactly as the operator last left it — even if it's since moved to
`responded`, `exhausted`, or `do_not_contact`.

`contact_status` valid values: `active` \| `bench` \| `exhausted` \| `responded` \| `do_not_contact`.

Within this skill, `contact_email` is always written blank and `email_status = NOT_ATTEMPTED` on
every row it touches, active or bench — this skill doesn't look up emails; `prima-email-waterfall`
does, later, for `active` rows only.

The file is in English (headers and values), regardless of what language the rest of the run is
conducted in.

### Why bench contacts don't get an email lookup (decision: Aldahir, 2026-08-03)

Only `contact_status = active` rows should be handed to `prima-email-waterfall` next. Bench rows
stay with `email_status = NOT_ATTEMPTED` and no `contact_email` — don't run email-waterfall (or any
paid Deepline provider) against a bench contact. Reasoning: names come from free WebSearch, but a
verified email costs Deepline credits — paying for a bench contact's email before it's clear the
account even needs one is money that may never get used. The roster exists precisely so a
non-response can promote a bench name to `active` later without re-sourcing the account from
scratch; the email gets paid for **then**, not now. This also gives Aldahir a durable per-account
history — who's been tried, who's in reserve, and whether an account's real options are exhausted
before writing it off as dead.

## Output format

Per-run committee CSV (or printed inline for a short list): written back to a file next to the
input unless the user asks for something else. Keep account order stable and match
`prima-icp-check`'s row order. Separately, and regardless of where that per-run file goes, every run
also writes/updates `output/account_roster.csv` per the rules above.
