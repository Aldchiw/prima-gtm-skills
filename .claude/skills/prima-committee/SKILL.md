---
name: prima-committee
description: Identifies the buying committee — real, named contacts per account — for accounts already classified `4B`/`4C` (via `sub_segment`) or `Cat3` (via `company_category`) by `prima-icp-check` (`4A`/`4D` sub-segments not supported yet). Caps at 3 contacts for 4B/4C, 2 for Cat3 — Cat3 also enforces a stricter manufacturing-division-only rule and, since its targeting logic is an unvalidated v1 hypothesis (Aldahir, 2026-08-03), sourcing runs on every Cat3 priority but `P1` contacts always come back as `NEEDS_HUMAN_REVIEW` (never auto-cleared `CONTACT_FOUND`) until the hypothesis is validated on `P2` data. Sources names via free WebSearch (company site + public LinkedIn snippets) first; only falls back to paid Deepline providers (ContactOut, Lusha, RocketReach, etc.) after stopping to show how many accounts need paid lookup and the estimated cost, and getting explicit approval — same gate as the Clay-vs-Terminal pilot. Never fabricates a name — if no verifiable contact is found for a role, outputs the target role/title only. Use this after `prima-icp-check` (and ideally after `prima-signal-scan` has confirmed the target-title door exists) and before `prima-email-waterfall` needs a named person to find an email for.
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

Cap at 3 contacts per account for `4B`/`4C` regardless of tier. If more than 3 verifiable names
surface, keep the most PRIORIDAD ALTA-weighted ones — don't pad the output with a 4th just because
more names were found, and don't let a SECUNDARIA name bump an ALTA one out of the top 3. For `4C`,
the same rule extends to FALLBACK: a FALLBACK (Founder/CEO) name never bumps an ALTA or SECUNDARIA
name out of the top 3 — it only fills a slot that would otherwise be empty. Cat3 has its own, lower
cap of 2 — see below.

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
becomes contact #1 only when Principal turns up nothing verifiable. Cap at **2** contacts total for
Cat3 — don't extend to 3 the way 4B/4C does.

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
   ALTA and SECUNDARIA have been exhausted with nothing verifiable).
5. For `4B`/`4C`: fill contact #2/#3 from any additional ALTA titles that also produced a verifiable
   name, then from SECUNDARIA titles. If **no** ALTA title produced anything verifiable at all, a
   SECUNDARIA title may become contact #1 instead — don't leave contact #1 empty when a real (if
   lower-priority) contact exists. For `4C` specifically: only if **neither** ALTA **nor** SECUNDARIA
   produced anything verifiable may a FALLBACK (Founder/CEO) title become contact #1 — FALLBACK never
   bumps an ALTA or SECUNDARIA name that was already found. For Cat3: fill contact #2 from Secundario
   only if Principal found something for #1 (or let Secundario become #1 if Principal found nothing)
   — cap at 2 total.
6. For every Cat3 candidate found (in either tier), apply the division rule before accepting it: if
   the evidence ties the person to the parent contracting company's corporate side rather than the
   manufacturing/prefab division itself, don't accept it as `CONTACT_FOUND` — output it as
   `NEEDS_HUMAN_REVIEW` with `flag_reason` explaining the risk instead (see "Division rule" above).
   Also apply the Cat3 exclusions (parent-corporate procurement, project/jobsite purchasing agents,
   construction executives) at this same step — reject a title match against any of those outright,
   don't even flag it, just treat it as not found and keep searching.
7. If the account is Cat3 **and** `priority = P1`: downgrade the status from step 6 — even a contact
   the division rule already accepted — from `CONTACT_FOUND` to `NEEDS_HUMAN_REVIEW`, with
   `flag_reason` noting this is a Cat3 `P1` account under the unvalidated-hypothesis gate and needs
   operator confirmation before use (see "Cat3 hard gate" above). This downgrade always applies to
   Cat3 `P1`, regardless of how clean the division-rule check came out.
8. Collect the accounts/titles where Tier 1 failed (and weren't already resolved as
   `NEEDS_HUMAN_REVIEW` or excluded) into the Tier-2 candidate set.
9. If that set is non-empty, run the Tier 2 approval gate above before touching any paid provider.
10. Merge Tier 1 + (approved) Tier 2 results; anything still unresolved becomes a role-only row.
11. For multi-entity accounts flagged by `prima-icp-check` (e.g. the Applied Digital/ChronoScale
    split), source a committee per entity, not per domain — same rule as that skill's edge case.

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given by `prima-icp-check` (disambiguates multi-entity accounts) |
| `company_category` | `Cat3` \| `Cat4` \| `UNKNOWN` — as given by `prima-icp-check` |
| `sub_segment` | `4B` \| `4C` \| `N/A-Cat3` |
| `committee_role` | the title label matched from the target title dictionary (e.g. "Director of Sourcing", or "Director of Supply Chain" for Cat3) |
| `priority_tier` | `ALTA` \| `SECUNDARIA` \| `FALLBACK` (`FALLBACK` is `4C`-only) for `4B`/`4C` — `PRINCIPAL` \| `SECUNDARIO` for `Cat3` — which tier of the relevant dictionary this contact's title came from |
| `contact_name` | blank if not found |
| `contact_title` | the actual title found (may read slightly differently than the generic role bucket) |
| `profile_url` | blank if not found |
| `source` | `WebSearch` \| `Deepline: <provider>` \| blank |
| `verified_date` | date the contact was found/confirmed |
| `status` | `CONTACT_FOUND` \| `ROLE_NOT_FOUND` \| `NEEDS_HUMAN_REVIEW` \| `SUB_SEGMENT_NOT_SUPPORTED` \| `SKIPPED_EXCLUDED` \| `SKIPPED_UNKNOWN` |
| `flag_reason` | free text — required when `status = NEEDS_HUMAN_REVIEW`. Explains either (a) a Cat3 division-vs-parent-corporate risk found during sourcing, or (b) that this is a Cat3 `P1` account under the unvalidated-hypothesis gate and needs operator confirmation before use (see "Cat3 hard gate"). Blank otherwise. |

One row per (account, committee_role) — 2-3 rows per qualifying `4B`/`4C` account, up to 2 rows per
qualifying Cat3 account. Cat3 `P1` rows always carry `status = NEEDS_HUMAN_REVIEW` instead of
`CONTACT_FOUND`, per the Cat3 hard gate — they're still real, sourced rows, just not auto-cleared.
Accounts that are skipped or unsupported get exactly one row with `status` set accordingly and the
rest of the row-specific columns blank.

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep account order stable and match `prima-icp-check`'s row order.
