---
name: prima-icp-check
description: Classifies Data Centers accounts (Power & Electrical, Energy Storage) against Prima's ICP — sub-segment (4A/4B/4C/4D for Cat4; N/A-Cat1/N/A-Cat2/N/A-Cat3 for the other in-scope categories, or G1/G2/G3 for the adjacent-groups overlay), priority (P1/P2/P3, or read from Notion's curated Prima Priority for Cat1/2/3), vertical owner (Aldahir vs Manu vs UNKNOWN), an explicit `company_type`, and exclusions. Category 1 (AI Infrastructure Operators) and Category 2 (Crypto Miners Pivoting to AI) are in scope alongside Cat3/Cat4, gated on Notion's "Equipment Procurement Scope" — its own documented "core qualification gate" for those two categories, distinct from Cat4's Disqualify criteria. This is **GATE #0** for the whole pipeline: it runs before any paid enrichment tool, anywhere downstream, and nothing `excluded = yes` or `company_type = unknown`/`wrong-industry` may proceed to a paid step. Use this whenever the user hands over a list or CSV of company domains/account names for the Data Centers GTM channel and wants them qualified, classified, scored, or filtered — even if they don't say "ICP" explicitly, e.g. "revisa esta lista de cuentas", "clasifica este CSV de dominios", "cuáles de estas empresas nos sirven". This is stage 1 of the 7-skill Data Centers pipeline (icp-check → signal-scan → committee → email-waterfall → hook → draft → guardrail-audit) — always run it first on a new account batch, before signal scanning, committee-building, or drafting.
---

# prima-icp-check

Classify a batch of Data Centers accounts against Prima's ICP and hand the result to the next
stage of the pipeline (`prima-signal-scan`).

## Sources of truth — read all three before classifying anything

This skill draws on **three** sources, and they are not interchangeable:

1. **Notion "Data Centers GTM"** (live, never cached) — the 7 company Categories (1–7), the
   Priority marking (🔴/🟡/🟢) Notion assigns per category/company, the Category-4 product-line
   segments (Cooling & Thermal Management, Power & Electrical Distribution, Energy Storage, Test &
   Commissioning, Multi-focus), and the **Disqualify** / **Disqualification Signal** criteria used
   for exclusions. Fetch this live at the start of every run — never rely on a memory of a previous
   run, criteria may have changed. If no Notion connector is available in the session, **stop and
   ask the user** to paste the relevant section before classifying anything. Notion always wins —
   nothing below overrides it.
2. **The sub-segment/owner scheme below** — confirmed directly by Aldahir on 2026-07-19. This is
   **not** written anywhere in the Notion page (there is no literal "4A/4B/4C/4D" or "Aldahir/Manu"
   in Notion) — it's this repo's own business-archetype layer on top of Notion's Category-4 OEM
   segment, and it is intentionally kept here rather than in Notion. Do not go looking for it on
   the Notion page, and do not treat a mismatch between this table and Notion's own per-company
   priority marking as an error — they answer different questions (see Process, step 3).
3. **`reference/icp-complement.md`** (2026-09-15, approved by Gaby Zacarias) — a purely **additive**
   overlay defining the G1/G2/G3 adjacent-group experiment (see "Relevance gate" below). It only
   fills in silences Notion leaves — it never overrides Notion, and it is not a license to invent a
   new bucket beyond the three it defines. If this file doesn't exist in a given checkout, treat
   G1/G2/G3 as unavailable — classify against Notion's Cat1–7 only, don't improvise an equivalent.

Never invent plausible-sounding sub-segment definitions, owner splits, or exclusion rules beyond
what's below or what Notion (or the icp-complement overlay) returns live. An account marked
`UNKNOWN` because the criteria wasn't available is correct; a confident-looking guess is not —
downstream skills and the humans reading this output will trust the classification at face value.

## GATE #0 — this classification runs before any paid spend, anywhere downstream

This skill's whole reason for sitting first in the pipeline is cost control, not just taxonomy.
**Nothing this skill marks `excluded = yes`, or gives `company_type = unknown` or
`company_type = wrong-industry`, may proceed to a paid enrichment step in any downstream skill** —
`prima-committee`'s Tier 2 paid people-search, `prima-email-waterfall`'s Hunter/icypeas/dropleads
waterfall, `prima-signal-scan`'s paid sources, or any ad-hoc paid provider call made outside a named
skill. A row that's still genuinely ambiguous belongs in `NEEDS_HUMAN_REVIEW` (see "Relevance gate"
below), never waved through to a paid call on the theory that enrichment might clear up the
ambiguity — that inverts the gate and spends money to answer a question this skill exists to answer
for free.

**Why this needed to be said explicitly (2026-09-15):** before this was written down, several
sourcing batches ran real paid discovery (theirstack, predictleads, CrustData) and only applied the
fab-buyer/relevance gate *after* the paid pull had already happened — which is a legitimate way to
*test* a new discovery provider's raw hit rate (that's what those sample runs were for), but it is
not how the pipeline is supposed to work once a provider is validated: gating happens first, on free
signal, and only the accounts that survive it should ever reach a paid step. Free discovery
(WebSearch, `wiza_search_prospects`, CrustData's own free autocomplete/identify endpoints) is exempt
from this gate — it's discovery, not spend, and this skill needs *something* to classify before it
can gate anything.

## `company_type` — mandatory explicit classification, independent of `company_category`

Every account gets an explicit `company_type` in addition to `company_category`. The two axes catch
different failure modes: `company_category` answers "which of Notion's 7 categories, if any" — but a
domain can *look* like it belongs to a category from its name, industry tag, or a keyword match, and
still turn out to be the wrong kind of business entirely once you actually read what it does.
`company_type` is the real-business check that catches that — it is not a restatement of
`company_category`, it's the fact-check on it.

**Values (pick exactly one, never invent another):**

| `company_type` | Use when the account is real and confirmed to be… | Typically pairs with |
|---|---|---|
| `operator-ai` | An AI infrastructure operator that directly operates/buys its own compute equipment | `Cat1` |
| `miner-crypto-ai` | A crypto miner pivoting to AI/HPC hosting, same direct-equipment-buyer profile as Cat1 | `Cat2` |
| `fabricator-modular` | A modular DC systems manufacturer (builds integrated systems, not a single-product OEM) | `Cat3` |
| `oem-4A-4D` | A Category-4 OEM that manufactures its own product and outsources fabrication overflow | `Cat4` (any of 4A–4D), or `G1`/`G2`/`G3` |
| `contractor-gc` | A general contractor / integrator that buys structural steel for building interiors, not for its own product | `Cat7`, or the GC/Integrator side of `Cat5` |
| `utility-line` | A transmission, substation, or utility infrastructure *developer* — builds/operates the line or campus shell, doesn't fabricate or buy equipment for a product of its own | usually excluded — see "Out of scope" |
| `esco` | An energy-as-a-service / equipment-as-a-service provider that leases or operates equipment on behalf of customers rather than manufacturing and selling it | usually excluded unless Notion documents a specific fit |
| `wrong-industry` | Confirmed, on reading what the account actually does, to have nothing to do with Data Centers power/storage/fabrication at all | always excluded |
| `unknown` | Not enough evidence to confirm any of the above | never proceeds to paid enrichment — see GATE #0 |

**How to determine it:** read the account's own description of what it does (its site, a firmographic
provider's `description` field, a press release) — never infer `company_type` from `company_category`,
industry tag, or company name alone. A company whose LinkedIn industry tag says "Electrical Equipment
Manufacturing" and whose name sounds like a power company can still be `wrong-industry` (a coatings
company that happens to mention "enclosures" as an application) or `utility-line` (a transmission
developer, not a fabricator) once you actually read the description. This is exactly the check that
caught American Terawatt (real "Head of Procurement" vacancy, sounds like a power company, but reading
its own site shows it develops HVDC transmission lines — `utility-line`, not `oem-4A-4D`) and Sun
Electric Inc. (real "power" name, but it designs/builds/maintains powerlines for utilities — `utility-line`,
not a fabricator) during 2026-09-15 sourcing.

## Relevance gate — mapping to a real bucket, never defaulting to `Cat4`

This gate is what actually decides whether an account is written up as a qualified lead. It runs
**after** `company_category`/`company_type` are set and **before** `prima-scope-score` or any
committee/enrichment work.

**An account CALIFICA (qualifies) only if both of the following are true:**

1. It maps to a **real bucket** — one of Notion's Cat1–7, or one of the three overlay groups
   (`G1`/`G2`/`G3`) from `reference/icp-complement.md` — based on **what the account's business
   actually is**, not on a keyword or industry-tag coincidence.
2. It is a genuine **fab-buyer**: a company that buys custom metal fabrication under order —
   enclosures, skids, structure, e-houses, cabinets, containers, power modules — either directly (an
   OEM outsourcing overflow) or as the physical form its product ships in (a G1/G2/G3 integrator
   packaging its system into a fabricated enclosure/skid/container).

**If it doesn't clearly satisfy both, it does not qualify.** A company that's real, US, and vaguely
power-adjacent but doesn't clearly satisfy #1 or #2 goes to `NEEDS_HUMAN_REVIEW` with the specific
gap named in `reasoning` — it is not written up as excluded-forever, and it is not waved through as a
qualified lead either. `NEEDS_HUMAN_REVIEW` rows never proceed to paid enrichment (GATE #0 applies to
them too).

**`Cat4` is never a default.** Don't classify an account as `Cat4`/`oem-4A-4D` because nothing else
seems to fit better, or because it's "probably some kind of OEM." If the evidence doesn't clearly
support Cat4 (or a G1/G2/G3 bucket, or another Notion category), the account doesn't qualify — full
stop. This rule exists because of a real, confirmed miss (2026-09-16): GameChange Energy and Falco
Electronics were both defaulted into `Cat4`/`oem-4A-4D` on a prior pass because they're real,
US, power-adjacent manufacturers — but neither actually clears the bar once checked against the hard
excludes below (GameChange's own brand identity is "Solar Tracker | Solar Racking | Transformers |
eBOS" — a solar-tracker company that also happens to make transformers; Falco makes potted/molded
electromagnetic components, not fabricated enclosures/structure). Both got corrected from PASS to
EXCLUDED on re-gate. Treat that correction as the standard to hold every future account to, not as a
one-off fix.

**Hard excludes — deterministic, never override these even if the account otherwise looks like a fit:**

- Solar utility-scale generation or **solar trackers/racking** (the physical mounting-structure
  business, even when the same company also makes transformers or other genuinely relevant
  equipment — the company's core identity decides, not its side lines)
- **Wind** power generation/equipment
- **Tidal/marine** power generation/equipment
- **Off-grid solar** (rural/remote solar+storage systems sold as a consumer/community energy
  product — distinct from grid-scale or DC-relevant BESS/on-site-power integrators)
- **Pure electronics** — a company whose core product is electronic/electromagnetic components
  (potted, molded, or PCB-level) rather than fabricated structure, even when those components are
  literally used inside transformers/power systems (they're a materials/component input to someone
  else's fabrication, not a fab-buyer themselves)

These five sit alongside the exclusions already documented below (Notion Disqualify, out-of-scope
Cat5/6/7, existing customer) — they don't replace those, they're specific to the relevance gate and
apply on top.

**When `reference/icp-complement.md` is missing or stale:** stop and ask the user, the same way
you'd stop for a missing Notion connector — don't reconstruct G1/G2/G3 from memory of a prior run,
and don't silently fall back to only Notion's Cat1-7 without telling the user G1/G2/G3 weren't
evaluated.

### Sub-segment scheme (4A–4D) — business archetype within Category 4 (OEMs)

Applies only to accounts that are Category-4 OEMs in Notion (Cooling, Power & Electrical, Energy
Storage, or Test & Commissioning product line). An account that isn't a Category-4 OEM at all
doesn't get a 4A–4D sub-segment. Category-1 (AI Infrastructure Operators), Category-2 (Crypto
Miners Pivoting to AI), and Category-3 (Modular DC Systems Manufacturers) accounts are in scope but
handled separately — see "Category 1 & 2" and "Category 3" below — never force them into this
table. Anything outside Cat 1, 2, 3, and 4 entirely — see "Out of scope" below.

| Sub-segment | Archetype | Priority | Entry point (function) | Signals to look for |
|---|---|---|---|---|
| `4A` | Integrated platforms — large OEM spanning multiple product lines | `P2` | Procurement / supply-chain function, per division | Notion tags it "Multi-focus"; multiple manufacturing sites; broad product catalog |
| `4B` | Established single-category — one dominant, mature product | `P1` | Procurement / supply-chain function (plant purchasing tier first) | Single clear product line; established company (not early-stage); meaningful revenue scale |
| `4C` | Founder-led scale-up | `P1` | Procurement / supply-chain function first, manufacturing/operations function second — Founder/CEO only as a last resort when neither exists | Young company; rapid growth signals (funding, hiring, capacity expansion); founder still leading |
| `4D` | Niche custom, low volume | `P3` | Not yet defined — don't invent one, leave blank and flag for the user | Small custom fabricator; highly bespoke product; low production volume |

**"Entry point" here names a function, never a specific title — the real, current target-title
dictionary (who to actually search for and contact) lives in exactly one place:
[`prima-committee/SKILL.md`](../prima-committee/SKILL.md#target-title-dictionary-hardcoded-provisional--same-exception-as-prima-icp-checks-4a4d-scheme)
— its `4B`/`4C` ALTA/SECUNDARIA/FALLBACK tables, matched by function per that skill's own
"Title matching: function, not exact string" rule.** This skill used to spell out example titles
in this column (e.g. "Founder / CEO / VP Engineering / Head of Manufacturing" for `4C`) — that
duplicated committee's dictionary in a second place and went stale the moment committee's targeting
changed: committee's 2026-08-03 decision demoted Founder/CEO to a FALLBACK used only when nothing
else is found, and dropped `VP Engineering` from the `4C` dictionary entirely, while this column
still read as if both were primary entry points. Don't restore a title list here, and don't add one
for `4A`/`4D` either — if the function description above ever needs to change, fetch it fresh from
`prima-committee` rather than re-describing it a second time in this file.

**Priority is driven by sub-segment for Category-4 accounts only**, per the table above — it is a
separate question from whatever 🔴/🟡/🟢 priority Notion shows for that company's Category-4 row. If
Notion's own priority marking for a specific company visibly conflicts with the sub-segment-derived
priority, don't silently pick one — note both in `reasoning` and let a human reconcile it.
Category-1, Category-2, and Category-3 accounts don't derive priority this way at all — see below.

### G1/G2/G3 — the adjacent-groups overlay (`reference/icp-complement.md`)

These three groups are **not** in Notion — they're an explicitly-approved experiment (Gaby
Zacarias, 2026-09-15) sitting adjacent to Category 4, for accounts whose business doesn't fit
Notion's Cat4 product-line segments cleanly but is still a genuine fab-buyer. All three are
`priority = P2` and `status = approved-experiment` — never promote one to `P1` on an unvalidated
angle (anti-quema: a P1 send against an unvalidated hypothesis burns a high-value relationship for a
guess, the same reasoning `prima-scope-score`'s P1 anti-burn flag exists for).

| Group | Name | Vertical | Why it's ICP |
|---|---|---|---|
| `G1` | BESS / containerized storage (systems integrators) | Energy Storage (Aldahir) | Buys fabricated metal under order — enclosures, skids, containers, structure |
| `G2` | On-site / behind-the-meter power for DC (packagers) | Power & Electrical (Aldahir) | Packages its generation into skids/enclosures/structure — fabrication under order |
| `G3` | E-house / substation integrators for DC campuses | Power & Electrical (Aldahir) | The e-house/power skid/substation package *is* metal fabrication |

Read `reference/icp-complement.md` for each group's full keyword include/exclude list, entry
persona, and signal sources — don't re-derive or memorize them here, fetch the file live the same
way you fetch Notion. `sub_segment` for a G1/G2/G3 account is the literal group id (`G1`, `G2`, or
`G3`), not a 4A–4D value — they're a parallel scheme, not a fifth 4A–4D entry. `vertical_owner` for
all three groups is `Aldahir` per the table above (both Energy Storage and Power & Electrical are
Aldahir's verticals).

### Category 1 & 2 (AI Infrastructure Operators / Crypto Miners Pivoting to AI) — in scope, not on the 4A–4D scheme

Category 1 (AI Infrastructure Operators) and Category 2 (Crypto Miners Pivoting to AI/HPC) are
real, in-scope company categories — the "Out of scope" exclusion below no longer applies to them.
Like Category 3, the 4A–4D archetype table above is a Category-4-only classification layer; it does
not get forced onto Cat-1/Cat-2 accounts either. Handle them as follows instead:

- **`sub_segment`** = `N/A-Cat1` for Category 1, `N/A-Cat2` for Category 2 — literal values, not
  `UNKNOWN`, same reasoning as Cat3's `N/A-Cat3`: this flags "the 4A–4D scheme doesn't apply here"
  as distinct from "we couldn't determine it."
- **`priority`** = read directly from Notion's own curated "Prima Priority" field for that specific
  company (🔴/🟡/🟢) — do **not** derive it from any sub-segment table, same rule as Cat3. If the
  company isn't listed in Notion's leads table at all, `priority = UNKNOWN` — don't guess from
  scale, funding, or anything else.
- **`vertical_owner`** = `UNKNOWN`, always, for now — for a different reason than Cat3's
  cross-vertical mix, though: Cat1/Cat2 accounts' equipment scope spans cooling skids (Manu's
  vertical per the product-line table below) alongside power/energy-storage equipment (Aldahir's),
  so there's no clean single-owner mapping. Note in `reasoning` that this is pending a human
  decision (to be worked out with Manu), and never assign an owner for a Cat1/Cat2 account on your
  own judgment.
- **`notion_scope`** = Notion's curated "Equipment Procurement Scope" text, verbatim — same field
  name Cat4 reads; Cat1/Cat2 don't have a separately-named scope field in Notion.
- **`anchor_products`** = same process as Cat3/Cat4 — map via the Application Index in
  `reference/prima-catalog.md` based on what the account fabricates or buys.

**Qualification gate — this is the important difference from Cat3/Cat4.** For Cat1/Cat2, Notion
explicitly documents "Equipment Procurement Scope" as **"the core qualification gate"** — not just
supporting context the way it reads for Cat4. Apply it as a hard gate:

- If the curated `notion_scope` for the account is **❌ Disqualify**, set `excluded = yes` with
  `exclusion_reason = "ICP disqualified: scope = Disqualify (no direct equipment operation)"`.
- For **Category 1 specifically**, also add this note (from Notion) to `reasoning` when Disqualify
  fires: the correct next action is to redirect outreach to the account's actual equipment buyer —
  its tenant — not to keep pursuing this account itself.

Cat1/Cat2 accounts still go through the other exclusion checks (existing customer) exactly like any
other account — this qualification gate is in addition to those, not instead of them.

### Category 3 (Modular DC Systems Manufacturers) — in scope, but not on the 4A–4D scheme

Category 3 is a real, in-scope company category — it is **not** subject to the "Out of scope"
exclusion below. But the 4A–4D archetype table above is a Category-4-only classification layer; it
does not get forced onto Cat-3 accounts. Handle Cat 3 as follows instead:

- **`sub_segment`** = `N/A-Cat3` — a literal value, not `UNKNOWN`. This flags "the 4A–4D scheme
  doesn't apply here" as distinct from "we couldn't determine it."
- **`priority`** = read directly from Notion's own curated "Prima Priority" field for that specific
  company in its leads table — do **not** derive it from any sub-segment table (there isn't one for
  Cat 3). If the company isn't listed in Notion's leads table at all, `priority = UNKNOWN` — don't
  guess from scale, funding, or anything else.
- **`vertical_owner`** = `UNKNOWN`, always, for now. Cat-3 companies build integrated systems that
  cross the Aldahir/Manu product-line split (Power & Electrical, Energy Storage, Cooling, and Test &
  Commissioning components can all show up inside one modular DC system) — there's no clean
  single-owner mapping yet. Note in `reasoning` that this is pending a human decision (to be worked
  out with Manu), and never assign an owner for a Cat-3 account on your own judgment.
- **`anchor_products`** = same process as Cat 4 — map via the Application Index in
  `reference/prima-catalog.md` based on what the account fabricates.

Cat-3 accounts still go through exclusions (Disqualify / Disqualification Signal / existing
customer) exactly like any other account — exemption from "Out of scope" doesn't exempt them from a
genuine ICP disqualification.

### Vertical owner — independent axis, not derived from sub-segment

This table applies to **Category-4 accounts, and to `G1`/`G2`/`G3`**. Category-1, Category-2, and
Category-3 `vertical_owner` are always `UNKNOWN` — see "Category 1 & 2" and "Category 3" above.

Owner is keyed off the Notion Category-4 **product-line segment** (or, for G1/G2/G3, the overlay's
own stated vertical — see the G1/G2/G3 table above), not the 4A–4D archetype:

| Product line (Notion Cat 4 segment, or overlay group) | Vertical owner |
|---|---|
| Power & Electrical Distribution (incl. `G2`, `G3`) | Aldahir |
| Energy Storage (incl. `G1`) | Aldahir |
| Cooling & Thermal Management | Manu |
| Test & Commissioning | Manu |

- Accounts owned by **Aldahir** (Power & Electrical, Energy Storage, and all of `G1`/`G2`/`G3`) are
  this repo's working set — process them fully through the pipeline.
- Accounts owned by **Manu** (Cooling, Test & Commissioning) are still real ICP fits — classify
  them fully (sub-segment, priority, reasoning) but mark them as a **handoff** in `reasoning` (e.g.
  "owner: Manu — handoff, not pursued in this repo"). They are **not** excluded — `excluded` stays
  `no` for these unless a genuine Disqualify signal applies independently.
- An account that is Category 5, 6, or 7 in Notion is **out of scope** for this repo. Mark it
  `excluded = yes` with `exclusion_reason` starting "Out of scope: ..." (distinct from an ICP
  disqualification — see below), and `company_category` / `sub_segment` / `priority` /
  `vertical_owner` = `UNKNOWN`. Categories 1, 2, and 3 are exempt from this rule — see "Category 1
  & 2" and "Category 3" above for their own handling — and Category 4 is covered by the table
  above.

### Exclusions

Use Notion's own **❌ Disqualify** criterion (present per-category in the "ICP for Lead Generation"
tables) plus the **"E. Disqualification Signal"** row in the "ICP for Qualification" table (e.g.
campus builders / landlords who don't operate their own equipment — redirect to the tenant instead).
Fetch these live along with everything else in source #1 above. For Cat1/Cat2 specifically, this
Disqualify check **is** the qualification gate described in "Category 1 & 2" above (gated on the
curated `notion_scope` value) — apply that instead of looking for a separate per-category Disqualify
list for those two.

An account can be excluded for any of four reasons now — a genuine Notion Disqualify/
Disqualification-Signal hit (including the Cat1/Cat2 scope gate), the out-of-scope rule above, a
relevance-gate miss (see "Relevance gate" above), or an existing customer (below). Prefix
`exclusion_reason` accordingly so a human can tell which kind of exclusion it is at a glance:

- `"ICP disqualified: ..."` — a genuine Notion Disqualify/Disqualification-Signal hit
- `"Out of scope: ..."` — Category 5/6/7, or not one of Cat1–4/G1–G3 at all
- `"Relevance gate: ..."` — mapped to a real bucket but failed the fab-buyer test, hit a hard
  exclude (solar utility/trackers, wind, tidal/marine, off-grid solar, pure electronics), or never
  produced a real bucket mapping at all — name which one in the text
- `"Existing customer: ..."` — see below

### Third exclusion reason: existing customer

An account that's already a Prima customer must never enter the cold-outbound pipeline — mark it
`excluded = yes`, `exclusion_reason` prefixed "Existing customer: ..." (a third category, alongside
the two above). **There is no live source of truth for "who's already a customer" today** — this
repo has no connected system that lists current Prima customers, so this exclusion can currently
only be applied when a human explicitly flags an account as an existing customer (e.g. Aldahir
naming one directly), never inferred or guessed from signals like an account seeming
"already-engaged." Don't skip checking for this just because there's no live source — ask the user
if an account might already be a customer when it's unclear, the same way you'd ask for Notion
criteria if the connector were unavailable. See `SPRINT2_GABY_REVIEW.md` at the repo root for this
gap logged as a pending item (a real customer, Antora Energy, surfaced it during Sprint 2 testing).

**Known existing customers (hardcoded until a live source exists):**

- **Antora Energy** — flagged during Sprint 2 testing (see `SPRINT2_GABY_REVIEW.md`).
- **Crusoe** (confirmed by Aldahir, 2026-08-05) — appears in Notion as a Cat1 P1 account ("Crusoe
  Cloud") and would otherwise classify and score as a strong Cat1 fit. The exclusion applies to the
  **whole Crusoe entity**, not just the "Crusoe Cloud" name as it appears in Notion's Cat1 table —
  match on **Crusoe Cloud** or **Crusoe Energy Systems** (or any other Crusoe-branded entity/domain
  encountered), the same way the Applied Digital / ChronoScale entity-split logic treats related
  names as one account for a given determination (see "Edge case: one domain, multiple business
  entities" below) — don't let a differently-worded entity name let a Crusoe account slip through.

If a human names another existing customer during a run, add it here the same way — this list is
maintained by explicit human confirmation only, never inferred.

## Input

A CSV (or a list pasted inline) of accounts, one per row, identified by **domain** and/or
**account name**. Extra columns the user already has (e.g. employee count, industry tags) can stay
in the sheet — this skill only needs to add its own columns, not replace what's there.

One input row does not always mean one output row — see "Edge case: one domain, multiple business
entities" below before assuming a 1:1 mapping.

## Process

For each account:

1. Resolve the domain/account name to whatever's needed to classify it — Notion Category (1–7) —
   and set **`company_category`** from that: `Cat1` (AI Infrastructure Operators), `Cat2` (Crypto
   Miners Pivoting to AI/HPC), `Cat3` (Modular DC Systems Manufacturers), `Cat4` (and if so, also
   resolve the product-line segment: Cooling / Power & Electrical / Energy Storage / Test &
   Commissioning / Multi-focus), `UNKNOWN` for anything else determinable only as out-of-scope
   (Cat 5, 6, 7), or leave `company_category` blank with `sub_segment` set to `G1`/`G2`/`G3` if the
   account maps to the icp-complement overlay instead of a Notion category. Pull this from the
   account itself, from Notion's existing leads tables if the company is already listed there, or
   from whatever enrichment data the user already supplied. Don't invent facts about the account any
   more than you'd invent ICP rules.
2. Set **`company_type`** — read what the account's own description/site actually says it does, and
   pick the one value from the "`company_type`" table above that matches. Do this from real evidence,
   never from `company_category`, an industry tag, or the company's name. If the evidence doesn't
   clearly support any value but `unknown`, use `unknown` — see GATE #0: this account cannot proceed
   to paid enrichment until a human resolves it.
3. Run the **relevance gate** (see above): does the account map to a real bucket (Cat1–7 or
   G1/G2/G3) by what it actually does, AND is it a genuine fab-buyer? Check the five hard excludes
   first — a hit on any of them ends the gate immediately, `exclusion_reason` prefixed
   `"Relevance gate: ..."`, regardless of how good the rest of the evidence looks. If it doesn't
   clearly pass both parts of the gate, set `excluded = yes` (relevance-gate exclusion) or, if the
   ambiguity is genuine rather than a clear miss, flag it in `reasoning` as `NEEDS_HUMAN_REVIEW` and
   still don't let it proceed to paid enrichment. If `company_category = UNKNOWN` (out of scope) or
   `company_type = wrong-industry`: mark it out of scope/excluded (see Exclusions) and stop — no
   sub-segment, priority, owner, or `notion_scope` to determine.
4. If `company_category = Cat1` or `Cat2`: follow "Category 1 & 2 (AI Infrastructure Operators /
   Crypto Miners Pivoting to AI)" above — `sub_segment = N/A-Cat1` or `N/A-Cat2`; `priority` read
   from Notion's curated Prima Priority for that company (or `UNKNOWN` if not listed);
   `vertical_owner = UNKNOWN` with the pending-Manu-decision note in `reasoning`; `notion_scope` =
   the curated "Equipment Procurement Scope" text, verbatim. Apply the qualification gate from that
   section before Step 8 (exclusions) below. Steps 6–7 below are Cat-4-only — skip them.
5. If `company_category = Cat3`: follow "Category 3 (Modular DC Systems Manufacturers)" above —
   `sub_segment = N/A-Cat3`; `priority` read from Notion's curated Prima Priority for that company
   (or `UNKNOWN` if not listed); `vertical_owner = UNKNOWN` with the cross-vertical note in
   `reasoning`. Steps 6–7 below are Cat-4-only — skip them.
6. If `company_category = Cat4`: determine **sub-segment** (`4A`/`4B`/`4C`/`4D`/`UNKNOWN`), then
   **priority** from the sub-segment table (or `UNKNOWN` if sub-segment is `UNKNOWN`) — note any
   conflict with Notion's own per-company priority marking in `reasoning` rather than resolving it
   yourself — then **vertical owner** (`Aldahir`/`Manu`) from the product-line table. If instead the
   account maps to `G1`/`G2`/`G3` (no Notion `company_category` at all), set `sub_segment` to the
   literal group id, `priority = P2`, and `vertical_owner = Aldahir` per the G1/G2/G3 table above.
7. Read **`notion_scope`**: whatever curated scope text Notion has for this company — "Fabrication
   Outsourcing Scope" for Cat 3, "Equipment Procurement Scope" for Cat 1/2/4 — verbatim, as text.
   Leave blank if Notion doesn't have it for this company, or if the account is a `G1`/`G2`/`G3`
   overlay account with no Notion entry at all. Don't interpret, score, or convert it to a number
   here — that's `prima-scope-score`'s job for Cat 4 (and, for Cat 1/2/3, a job that skill
   deliberately never does at all — see the note under Output schema).
8. Check **exclusions** — Notion Disqualify / Disqualification Signal (including the Cat1/Cat2
   qualification gate above), the out-of-scope rule, or a relevance-gate miss from step 3. An
   excluded account still gets a sub-segment/priority/owner if that was determinable (exclusion is a
   separate flag, not a reason to skip classification) — except out-of-scope accounts, which aren't
   Cat-1/2/3/4/G1-3 at all, so there's no segment to classify against.
9. Write one line of plain-language **reasoning** per account: what pushed it into that sub-segment/
   priority/owner/company_type, or why it landed on `UNKNOWN`/excluded/`NEEDS_HUMAN_REVIEW`/handoff.
   This is what a human (or the next skill) will actually read to sanity-check the call — don't just
   restate the label.

### Edge case: one domain, multiple business entities

A single domain doesn't always represent a single buying reality. Some accounts are actually two
(or more) distinct business entities under one corporate umbrella, with **different** Equipment
Procurement Scope — one side disqualified, another side a real buyer. Collapsing them into one row
either wrongly excludes a real buyer or wrongly qualifies a non-buyer.

**Documented example: Applied Digital / ChronoScale** (`applieddigital.com`). Notion's own account
page for this company ("🏭 Applied Digital (ChronoScale)") splits it explicitly:
- **APLD** (the public parent, campus developer/landlord) — builds and leases DC shells. Equipment
  Procurement Scope = ❌ Disqualify. Not a buyer; the tenant (e.g. CoreWeave) buys the equipment.
- **ChronoScale** (the spun-out cloud operation) — operates GPU infrastructure directly. Equipment
  Procurement Scope = ✅ Strong. A real equipment buyer, with its own entry points (VP Infrastructure
  / Head of Operations at ChronoScale).

If Notion (or any other source) shows this split for an account, **return one row per entity**, not
one row for the domain. Each entity gets its own sub_segment/priority/vertical_owner/excluded
determination against the criteria above — don't average them, don't pick the "dominant" one, and
don't apply one entity's exclusion to the other. Label the `account_name` for each row so it's
unambiguous which entity the row is about (e.g. "Applied Digital — APLD (developer)" vs
"Applied Digital — ChronoScale"), since `domain` alone won't disambiguate them.

This isn't unique to Applied Digital — treat it as the general rule whenever a source you're
reading during step 1 describes a landlord/operator split, a parent/spin-out split, or any other
case where the same domain covers two entities with different Equipment Procurement Scope. The same
one-row-per-entity logic applies if a company has one division that's a genuine fab-buyer and
another (e.g. a parent's corporate/services arm) that isn't — same principle prima-committee's Cat3
division rule already applies at the contact-sourcing stage, just one stage earlier here.

## Producto ancla (Eje 3)

Al clasificar la cuenta, determina qué familia(s) de producto Prima le corresponden según QUÉ FABRICA la cuenta, mapeando su categoría contra el Application Index de `reference/prima-catalog.md` (sección B.1). Carga los item numbers en `anchor_products`.

Esto es la ruta para cuentas SIN señal (fit-only). Una cuenta con señal recibe su producto ancla más adelante, de `prima-hook`, derivado de la señal específica; una cuenta fit-only nunca llega a `prima-hook`, así que su ancla se calcula aquí, desde su clasificación ICP. Ambas rutas leen el mismo catálogo y producen el mismo tipo de dato — la diferencia es sólo el disparador (señal vs. clasificación).

Nunca adivines. Si la clasificación no deja claro qué fabrica la cuenta, pon `anchor_products` en `UNCLEAR` y déjalo así. Un ancla equivocada es peor que ninguna — le daría al bot de outreach un producto falso que Prima supuestamente le fabricaría.

## Output schema (stable — downstream skills depend on this)

Return the same rows the user gave you, with these columns added (in this order):

| Column | Values |
|---|---|
| `company_category` | `Cat1` \| `Cat2` \| `Cat3` \| `Cat4` \| `UNKNOWN` — blank if the account maps to `G1`/`G2`/`G3` instead of a Notion category |
| `company_type` | `operator-ai` \| `miner-crypto-ai` \| `fabricator-modular` \| `oem-4A-4D` \| `contractor-gc` \| `utility-line` \| `esco` \| `wrong-industry` \| `unknown` — see "`company_type`" above. Mandatory on every row; never blank. |
| `sub_segment` | `4A` \| `4B` \| `4C` \| `4D` \| `N/A-Cat1` \| `N/A-Cat2` \| `N/A-Cat3` \| `G1` \| `G2` \| `G3` \| `UNKNOWN` |
| `priority` | `P1` \| `P2` \| `P3` \| `UNKNOWN` |
| `vertical_owner` | `Aldahir` \| `Manu` \| `UNKNOWN` |
| `anchor_products` | Prima catalog item(s) que esta cuenta probablemente necesita, según QUÉ FABRICA, mapeado vía el Application Index de `reference/prima-catalog.md` (ej. "1.1 switchboard skids; 3.5 switchgear enclosures") — o `UNCLEAR` si no se puede determinar qué fabrica la cuenta. Base del gancho para cuentas fit-only sin señal. |
| `notion_scope` | Notion's curated scope text, verbatim — "Fabrication Outsourcing Scope" value for Cat 3, "Equipment Procurement Scope" value for Cat 1/2/4. Blank if Notion doesn't have it for this company, or if the account is a G1/G2/G3-only account with no Notion entry. Raw text only — never interpreted, scored, or converted to a number here. |
| `excluded` | `yes` \| `no` |
| `exclusion_reason` | text, blank if `excluded = no` — prefixed `"ICP disqualified: ..."`, `"Out of scope: ..."`, `"Relevance gate: ..."`, or `"Existing customer: ..."` per "Exclusions" above |
| `reasoning` | free text — the classification rationale, including the `company_type` call and, if applicable, why the account is `NEEDS_HUMAN_REVIEW` rather than a clean pass/exclude |

Don't rename these columns or change the value vocabulary once `prima-signal-scan` is built against
it — if the schema needs to change later, that's a deliberate cross-skill decision, not a one-off
tweak.

**`prima-scope-score` is Cat4-only and never runs on Cat1/Cat2/Cat3 rows — for two different
reasons.** For `Cat3`, its weighted score is built on a Cat-4-only product-type table (Power &
Electrical Distribution / Energy Storage product categories) with no equivalent for Modular DC
Systems Manufacturers, and Cat3 already has a human-confirmed `notion_scope` anyway. For `Cat1`/
`Cat2`, the reason is deeper than a missing table: that skill's whole model penalizes in-house
manufacturing (it's hunting for who secretly subcontracts) — but for Cat1/Cat2 the Notion scope
criterion is **polarity-inverted**: operating and buying equipment directly in-house is exactly
what qualifies these accounts ("✅ Full = builds AND equips own campus"). Running Cat4's scoring
against a Cat1/Cat2 row would misclassify the best-fit accounts as disqualified. Don't route
`Cat1`/`Cat2`/`Cat3` rows into `prima-scope-score` — hold them after this skill instead (they still
have `notion_scope` as raw text, plus the qualification-gate `excluded` verdict from "Category 1 &
2" above where it applies). `G1`/`G2`/`G3` rows likewise skip `prima-scope-score` — the overlay
groups don't have a Notion-curated scope value to score against; the relevance gate's fab-buyer test
above is the closest equivalent for them.

## Output format

Same shape as the input (CSV in → CSV out), written back to a file next to the input unless the user
asks for something else (e.g. printed inline for a short list). Keep row order stable.
