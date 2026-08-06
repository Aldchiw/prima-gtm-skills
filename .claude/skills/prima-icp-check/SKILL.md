---
name: prima-icp-check
description: Classifies Data Centers accounts (Power & Electrical, Energy Storage) against Prima's ICP — sub-segment (4A/4B/4C/4D), priority (P1/P2/P3), vertical owner (Aldahir vs Manu), and exclusions. Use this whenever the user hands over a list or CSV of company domains/account names for the Data Centers GTM channel and wants them qualified, classified, scored, or filtered — even if they don't say "ICP" explicitly, e.g. "revisa esta lista de cuentas", "clasifica este CSV de dominios", "cuáles de estas empresas nos sirven". This is stage 1 of the 7-skill Data Centers pipeline (icp-check → signal-scan → committee → email-waterfall → hook → draft → guardrail-audit) — always run it first on a new account batch, before signal scanning, committee-building, or drafting.
---

# prima-icp-check

Classify a batch of Data Centers accounts against Prima's ICP and hand the result to the next
stage of the pipeline (`prima-signal-scan`).

## Sources of truth — read both before classifying anything

This skill draws on **two** sources, and they are not interchangeable:

1. **Notion "Data Centers GTM"** (live, never cached) — the 7 company Categories (1–7), the
   Priority marking (🔴/🟡/🟢) Notion assigns per category/company, the Category-4 product-line
   segments (Cooling & Thermal Management, Power & Electrical Distribution, Energy Storage, Test &
   Commissioning, Multi-focus), and the **Disqualify** / **Disqualification Signal** criteria used
   for exclusions. Fetch this live at the start of every run — never rely on a memory of a previous
   run, criteria may have changed. If no Notion connector is available in the session, **stop and
   ask the user** to paste the relevant section before classifying anything.
2. **The sub-segment/owner scheme below** — confirmed directly by Aldahir on 2026-07-19. This is
   **not** written anywhere in the Notion page (there is no literal "4A/4B/4C/4D" or "Aldahir/Manu"
   in Notion) — it's this repo's own business-archetype layer on top of Notion's Category-4 OEM
   segment, and it is intentionally kept here rather than in Notion. Do not go looking for it on
   the Notion page, and do not treat a mismatch between this table and Notion's own per-company
   priority marking as an error — they answer different questions (see Process, step 3).

Never invent plausible-sounding sub-segment definitions, owner splits, or exclusion rules beyond
what's below or what Notion returns live. An account marked `UNKNOWN` because the criteria wasn't
available is correct; a confident-looking guess is not — downstream skills and the humans reading
this output will trust the classification at face value.

### Sub-segment scheme (4A–4D) — business archetype within Category 4 (OEMs)

Applies only to accounts that are Category-4 OEMs in Notion (Cooling, Power & Electrical, Energy
Storage, or Test & Commissioning product line). An account that isn't a Category-4 OEM at all
doesn't get a 4A–4D sub-segment. Category-3 accounts (Modular DC Systems Manufacturers) are in
scope but handled separately — see "Category 3 (Modular DC Systems Manufacturers)" below — never
force them into this table. Anything outside Cat 3 and Cat 4 entirely — see "Out of scope" below.

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
Category-3 accounts don't derive priority this way at all — see below.

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

This table applies to **Category-4 accounts only**. Category-3 `vertical_owner` is always
`UNKNOWN` — see "Category 3" above.

Owner is keyed off the Notion Category-4 **product-line segment**, not the 4A–4D archetype:

| Product line (Notion Cat 4 segment) | Vertical owner |
|---|---|
| Power & Electrical Distribution | Aldahir |
| Energy Storage | Aldahir |
| Cooling & Thermal Management | Manu |
| Test & Commissioning | Manu |

- Accounts owned by **Aldahir** (Power & Electrical, Energy Storage) are this repo's working set —
  process them fully through the pipeline.
- Accounts owned by **Manu** (Cooling, Test & Commissioning) are still real ICP fits — classify
  them fully (sub-segment, priority, reasoning) but mark them as a **handoff** in `reasoning` (e.g.
  "owner: Manu — handoff, not pursued in this repo"). They are **not** excluded — `excluded` stays
  `no` for these unless a genuine Disqualify signal applies independently.
- An account that is neither Category-3 nor Category-4 in Notion (i.e. it's Category 1, 2, 5, 6, or
  7) is **out of scope** for this repo. Mark it `excluded = yes` with `exclusion_reason` starting
  "Out of scope: ..." (distinct from an ICP disqualification — see below), and `company_category` /
  `sub_segment` / `priority` / `vertical_owner` = `UNKNOWN`. Category 3 is exempt from this rule —
  see "Category 3" above for its own handling — and Category 4 is covered by the table above.

### Exclusions

Use Notion's own **❌ Disqualify** criterion (present per-category in the "ICP for Lead Generation"
tables) plus the **"E. Disqualification Signal"** row in the "ICP for Qualification" table (e.g.
campus builders / landlords who don't operate their own equipment — redirect to the tenant instead).
Fetch these live along with everything else in source #1 above.

An account can be excluded for either reason — a genuine Notion Disqualify/Disqualification-Signal
hit, or the out-of-scope rule above. Prefix `exclusion_reason` accordingly ("ICP disqualified: ..."
vs "Out of scope: ...") so a human can tell which kind of exclusion it is at a glance.

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

## Input

A CSV (or a list pasted inline) of accounts, one per row, identified by **domain** and/or
**account name**. Extra columns the user already has (e.g. employee count, industry tags) can stay
in the sheet — this skill only needs to add its own columns, not replace what's there.

One input row does not always mean one output row — see "Edge case: one domain, multiple business
entities" below before assuming a 1:1 mapping.

## Process

For each account:

1. Resolve the domain/account name to whatever's needed to classify it — Notion Category (1–7) —
   and set **`company_category`** from that: `Cat3` (Modular DC Systems Manufacturers), `Cat4` (and
   if so, also resolve the product-line segment: Cooling / Power & Electrical / Energy Storage /
   Test & Commissioning / Multi-focus), or `UNKNOWN` for anything else (Cat 1, 2, 5, 6, 7, or not
   determinable). Pull this from the account itself, from Notion's existing leads tables if the
   company is already listed there, or from whatever enrichment data the user already supplied.
   Don't invent facts about the account any more than you'd invent ICP rules.
2. If `company_category = UNKNOWN`: mark it out of scope (see Exclusions) and stop — no
   sub-segment, priority, owner, or `notion_scope` to determine.
3. If `company_category = Cat3`: follow "Category 3 (Modular DC Systems Manufacturers)" above —
   `sub_segment = N/A-Cat3`; `priority` read from Notion's curated Prima Priority for that company
   (or `UNKNOWN` if not listed); `vertical_owner = UNKNOWN` with the cross-vertical note in
   `reasoning`. Steps 4–5 below are Cat-4-only — skip them.
4. If `company_category = Cat4`: determine **sub-segment** (`4A`/`4B`/`4C`/`4D`/`UNKNOWN`), then
   **priority** from the sub-segment table (or `UNKNOWN` if sub-segment is `UNKNOWN`) — note any
   conflict with Notion's own per-company priority marking in `reasoning` rather than resolving it
   yourself — then **vertical owner** (`Aldahir`/`Manu`) from the product-line table.
5. Read **`notion_scope`**: whatever curated scope text Notion has for this company — "Fabrication
   Outsourcing Scope" for Cat 3, "Equipment Procurement Scope" for Cat 4 — verbatim, as text. Leave
   blank if Notion doesn't have it for this company. Don't interpret, score, or convert it to a
   number here — that's `prima-scope-score`'s job (and, for Cat 3 today, a job that skill can't do
   yet at all — see the note under Output schema).
6. Check **exclusions** — Notion Disqualify / Disqualification Signal, or the out-of-scope rule.
   An excluded account still gets a sub-segment/priority/owner if that was determinable (exclusion
   is a separate flag, not a reason to skip classification) — except out-of-scope accounts, which
   aren't Cat-3 or Cat-4 at all, so there's no segment (Cat-3's `N/A-Cat3` or Cat-4's `4A`–`4D`) to
   classify against.
7. Write one line of plain-language **reasoning** per account: what pushed it into that sub-segment/
   priority/owner, or why it landed on `UNKNOWN`/excluded/handoff. This is what a human (or the next
   skill) will actually read to sanity-check the call — don't just restate the label.

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
case where the same domain covers two entities with different Equipment Procurement Scope.

## Producto ancla (Eje 3)

Al clasificar la cuenta, determina qué familia(s) de producto Prima le corresponden según QUÉ FABRICA la cuenta, mapeando su categoría contra el Application Index de `reference/prima-catalog.md` (sección B.1). Carga los item numbers en `anchor_products`.

Esto es la ruta para cuentas SIN señal (fit-only). Una cuenta con señal recibe su producto ancla más adelante, de `prima-hook`, derivado de la señal específica; una cuenta fit-only nunca llega a `prima-hook`, así que su ancla se calcula aquí, desde su clasificación ICP. Ambas rutas leen el mismo catálogo y producen el mismo tipo de dato — la diferencia es sólo el disparador (señal vs. clasificación).

Nunca adivines. Si la clasificación no deja claro qué fabrica la cuenta, pon `anchor_products` en `UNCLEAR` y déjalo así. Un ancla equivocada es peor que ninguna — le daría al bot de outreach un producto falso que Prima supuestamente le fabricaría.

## Output schema (stable — downstream skills depend on this)

Return the same rows the user gave you, with these columns added (in this order):

| Column | Values |
|---|---|
| `company_category` | `Cat3` \| `Cat4` \| `UNKNOWN` |
| `sub_segment` | `4A` \| `4B` \| `4C` \| `4D` \| `N/A-Cat3` \| `UNKNOWN` |
| `priority` | `P1` \| `P2` \| `P3` \| `UNKNOWN` |
| `vertical_owner` | `Aldahir` \| `Manu` \| `UNKNOWN` |
| `anchor_products` | Prima catalog item(s) que esta cuenta probablemente necesita, según QUÉ FABRICA, mapeado vía el Application Index de `reference/prima-catalog.md` (ej. "1.1 switchboard skids; 3.5 switchgear enclosures") — o `UNCLEAR` si no se puede determinar qué fabrica la cuenta. Base del gancho para cuentas fit-only sin señal. |
| `notion_scope` | Notion's curated scope text, verbatim — "Fabrication Outsourcing Scope" value for Cat 3, "Equipment Procurement Scope" value for Cat 4. Blank if Notion doesn't have it for this company. Raw text only — never interpreted, scored, or converted to a number here. |
| `excluded` | `yes` \| `no` |
| `exclusion_reason` | text, blank if `excluded = no` |
| `reasoning` | free text — the classification rationale |

Don't rename these columns or change the value vocabulary once `prima-signal-scan` is built against
it — if the schema needs to change later, that's a deliberate cross-skill decision, not a one-off
tweak.

**`prima-scope-score` does not support Category 3 yet.** Its weighted score is built on a Cat-4-only
product-type table (Power & Electrical Distribution / Energy Storage product categories) — it has no
equivalent table for Modular DC Systems Manufacturers. Don't route `Cat3` rows into `prima-scope-score`
until that skill is updated with its own Cat-3 weights; hold them after this skill in the meantime
(they still have `notion_scope` as raw text, just no probability/tier on top of it yet).

## Output format

Same shape as the input (CSV in → CSV out), written back to a file next to the input unless the user
asks for something else (e.g. printed inline for a short list). Keep row order stable.
