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
(e.g. it's actually a Cat 1 AI Infrastructure Operator, Cat 3 Modular DC manufacturer, etc.) doesn't
get a sub-segment — see "Out of scope" below.

| Sub-segment | Archetype | Priority | Entry point | Signals to look for |
|---|---|---|---|---|
| `4A` | Integrated platforms — large OEM spanning multiple product lines | `P2` | Corporate procurement / supply chain, per division | Notion tags it "Multi-focus"; multiple manufacturing sites; broad product catalog |
| `4B` | Established single-category — one dominant, mature product | `P1` | Plant purchasing / procurement | Single clear product line; established company (not early-stage); meaningful revenue scale |
| `4C` | Founder-led scale-up | `P1` | Founder / CEO / VP Engineering / Head of Manufacturing | Young company; rapid growth signals (funding, hiring, capacity expansion); founder still leading |
| `4D` | Niche custom, low volume | `P3` | Not yet defined — don't invent one, leave blank and flag for the user | Small custom fabricator; highly bespoke product; low production volume |

**Priority is driven by sub-segment**, per the table above — it is a separate question from
whatever 🔴/🟡/🟢 priority Notion shows for that company's Category-4 row. If Notion's own priority
marking for a specific company visibly conflicts with the sub-segment-derived priority, don't
silently pick one — note both in `reasoning` and let a human reconcile it.

### Vertical owner — independent axis, not derived from sub-segment

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
- An account whose product line doesn't fall into any of these four Cat-4 lines — i.e. it isn't a
  Category-4 OEM at all — is **out of scope** for this repo. Mark it `excluded = yes` with
  `exclusion_reason` starting "Out of scope: ..." (distinct from an ICP disqualification — see
  below), and `sub_segment` / `priority` / `vertical_owner` = `UNKNOWN`.

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

1. Resolve the domain/account name to whatever's needed to classify it — Notion Category (1–7),
   and if Category 4, the product-line segment (Cooling / Power & Electrical / Energy Storage /
   Test & Commissioning / Multi-focus). Pull this from the account itself, from Notion's existing
   leads tables if the company is already listed there, or from whatever enrichment data the user
   already supplied. Don't invent facts about the account any more than you'd invent ICP rules.
2. If the account isn't a Category-4 OEM in one of the four product lines above: mark it out of
   scope (see Exclusions) and stop — no sub-segment, priority, or owner to determine.
3. Determine **sub-segment**: `4A`, `4B`, `4C`, `4D`, or `UNKNOWN` if it doesn't clearly fit any
   archetype or the signals aren't available.
4. Determine **priority** from the sub-segment table above (`P1`/`P2`/`P3`), or `UNKNOWN` if the
   sub-segment itself is `UNKNOWN`. Note any conflict with Notion's own per-company priority marking
   in `reasoning` rather than resolving it yourself.
5. Determine **vertical owner** (`Aldahir` / `Manu`) from the product-line table above.
6. Check **exclusions** — Notion Disqualify / Disqualification Signal, or the out-of-scope rule.
   An excluded account still gets a sub-segment/priority/owner if that was determinable (exclusion
   is a separate flag, not a reason to skip classification) — except out-of-scope accounts, which
   have no Category-4 segment to classify against in the first place.
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
| `sub_segment` | `4A` \| `4B` \| `4C` \| `4D` \| `UNKNOWN` |
| `priority` | `P1` \| `P2` \| `P3` \| `UNKNOWN` |
| `vertical_owner` | `Aldahir` \| `Manu` \| `UNKNOWN` |
| `anchor_products` | Prima catalog item(s) que esta cuenta probablemente necesita, según QUÉ FABRICA, mapeado vía el Application Index de `reference/prima-catalog.md` (ej. "1.1 switchboard skids; 3.5 switchgear enclosures") — o `UNCLEAR` si no se puede determinar qué fabrica la cuenta. Base del gancho para cuentas fit-only sin señal. |
| `excluded` | `yes` \| `no` |
| `exclusion_reason` | text, blank if `excluded = no` |
| `reasoning` | free text — the classification rationale |

Don't rename these columns or change the value vocabulary once `prima-signal-scan` is built against
it — if the schema needs to change later, that's a deliberate cross-skill decision, not a one-off
tweak.

## Output format

Same shape as the input (CSV in → CSV out), written back to a file next to the input unless the user
asks for something else (e.g. printed inline for a short list). Keep row order stable.
