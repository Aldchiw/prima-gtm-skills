---
name: prima-generate-leads
description: The one-line "director de orquesta" for the Data Centers lead-gen pipeline — a salesperson types only a count and a vertical (e.g. "genera 20 leads de Power & Electrical") and this skill runs discovery → prima-icp-check → prima-signal-scan → prima-scope-score → prima-committee → prima-email-waterfall end to end with no follow-up questions, then writes a single clean row per company to leads_final.csv. Only supports Power & Electrical Distribution and Energy Storage (Aldahir's verticals — prima-scope-score's product table isn't portable to Manu's). Stops before prima-hook/prima-draft/prima-guardrail-audit — this produces a qualified, contactable lead list, not outbound copy. Use this whenever someone asks for N new leads/accounts/empresas in one of these two verticals without specifying a company list themselves.
---

# prima-generate-leads

The single entry point a non-technical vendor uses to get a batch of qualified, contactable leads
without knowing anything about the 8-skill pipeline underneath. This skill doesn't add new logic —
it sequences `prima-icp-check` → `prima-signal-scan` → `prima-scope-score` → `prima-committee` →
`prima-email-waterfall` exactly as each already defines itself, plus one discovery step that isn't
its own skill yet (see Step 0). If any of those five skills' own rules change, this orchestrator
should pick up the change by reading them, not by re-implementing their logic here.

## Invocation

Recognized forms, both equivalent:

```
genera 20 leads de Power & Electrical
genera 15 leads de Energy Storage
/prima-generate-leads 20 Power & Electrical
```

Parse **count** (N) and **vertical** from the phrase. Normalize vertical loosely (case-insensitive,
"Power and Electrical", "P&E", "Energy Storage", "storage" in context all resolve) — but only to one
of the two supported values below. Nothing else is a valid parameter; there is no flag/config surface
for a vendor to get wrong.

| Recognized vertical | Maps to |
|---|---|
| Power & Electrical (Distribution) | `vertical_owner = Aldahir`, Notion product line "Power & Electrical Distribution" |
| Energy Storage | `vertical_owner = Aldahir`, Notion product line "Energy Storage" |

**If the phrase names Cooling & Thermal Management, Test & Commissioning, or anything that isn't
clearly one of the two above:** stop and ask which vertical they meant, the same way an unrecognized
acronym gets clarified rather than guessed. Never silently run `prima-scope-score` against Manu's
verticals — its product-type weighting table is explicitly not portable to them (see that skill's
own `SKILL.md`).

**If N or vertical can't be parsed from the phrase at all:** ask once for the missing piece. Don't
default N to some number or guess the vertical from context.

## What N actually counts

**N = distinct companies that end this run with at least one actionable contact** (a `linkedin_url`
and/or a `contact_email`) — not contacts, not CSV rows, not companies merely discovered. A company
that produces a real, verified signal and passes ICP but where `prima-committee`/
`prima-email-waterfall` can't surface even a LinkedIn profile does **not** count toward N — keep
discovering until N real ones are reached, or the circuit breaker below trips.

## Step 0 — Discover candidate companies (signal-first, not in a given list)

This is the one step with no dedicated skill of its own yet — it's the same generator-mode process
used in Sprint 2's 20-account discovery, applied continuously here instead of as a one-off batch.

1. WebSearch for Data Centers-relevant signals in the requested vertical — capacity-expansion
   announcements, funding/grant news (Series B/C sweet spot), plant/procurement job openings — the
   same signal categories `prima-signal-scan` formally verifies in Step 2, used here just to surface
   **candidate company names** worth running through the full pipeline.
2. **Dedup before spending any more effort on a candidate:** check it isn't already on Notion's
   "Data Centers GTM" tracked-account list and isn't already a row in `output/accounts_processed.csv`
   from a prior run. A company that's already tracked/processed doesn't count as a new discovery,
   even if it would otherwise qualify.
3. Feed every surviving candidate into Step 1.

### Circuit breaker (provisional, adjust as real runs accumulate)

Stop discovery and report honestly (see "If N isn't reached" below) once **either**:
- N companies with an actionable contact are reached, **or**
- 3×N distinct candidates have been evaluated through the full pipeline without reaching N.

Never pad past this ceiling by loosening ICP/exclusion criteria to manufacture a hit — a shortfall is
a valid, expected outcome some runs, not a bug to hide.

## Steps 1-5 — run each existing skill exactly as it defines itself

| Step | Skill | Notes for this orchestrator |
|---|---|---|
| 1 | [`prima-icp-check`](../prima-icp-check/SKILL.md) | Classifies + excludes (existing customer, out-of-scope, ICP disqualify). A candidate excluded here stops right there — it goes toward the "excluded" bucket in the shortfall accounting, not toward N. |
| 2 | [`prima-signal-scan`](../prima-signal-scan/SKILL.md) | Formally re-verifies the signal that got the candidate discovered in Step 0 (own URL, own date) — don't just carry the Step 0 finding forward uncited. |
| 3 | [`prima-scope-score`](../prima-scope-score/SKILL.md) | Tier + `needs_manual_scope_confirmation`. A `disqualified_inhouse` result stops the candidate here (excluded bucket). A P1 with `needs_manual_scope_confirmation = TRUE` **keeps going** through Steps 4-5 — the anti-burn gate only blocks `prima-draft`, which this skill never reaches — but gets flagged in the final summary (see below). |
| 4 | [`prima-committee`](../prima-committee/SKILL.md) | Sources 2-3 real ALTA/SECUNDARIA contacts per company, same as always. |
| 5 | [`prima-email-waterfall`](../prima-email-waterfall/SKILL.md) | See "Contact selection" below for which contact this orchestrator actually sends through this step. |

**Known deviation, deliberate:** `prima-committee`'s Tier 2 and `prima-email-waterfall`'s provider
list still name placeholder providers (ContactOut/Lusha/RocketReach.../the findymail-first waterfall)
that were never validated against Deepline's real catalog — this is already logged as an open item in
`SPRINT2_GABY_REVIEW.md`. This orchestrator uses the **actual validated Deepline calls** confirmed
during Sprint 2 batch runs instead of those placeholder names:
- Committee sourcing: `company_titles` (free precheck — skip the paid call entirely if no relevant
  titles are registered for the domain) → `ai_ark_people_search` with
  `contact.function.any.include: ["purchasing"]`, size 2-3.
- Email: `hunter_email_finder` with `first_name`+`last_name`+`domain` (not `linkedin_handle` — it
  doesn't reliably match AI Ark's index). `verification.status = "valid"` → `VERIFIED`.
  `verification.status = "accept_all"` → `FOUND_UNVERIFIED`, never sendable, even though Hunter
  still returns a candidate address.
This doesn't change `prima-committee`/`prima-email-waterfall`'s own files — reconciling those is
still a separate, standing to-do — it just means this orchestrator doesn't blindly follow a provider
list nobody actually validated.

## Contact selection — one contact per company reaches the deliverable

`prima-committee` may surface 2-3 real names per company; only **one** — the highest-ranked ALTA
(sourcing/purchasing) title — goes through `prima-email-waterfall` and into `leads_final.csv`.
Ranking is seniority within the ALTA tier (Director/Manager/Category Manager/Strategic Sourcing
outranks Buyer/Associate/Analyst-level titles). If the top-ranked contact doesn't produce a
`VERIFIED` email, try the next-ranked ALTA contact at the **same company** (cap: 2-3 attempts per
company, same as the contact cap already in `prima-committee`) before settling for its best
available result (`FOUND_UNVERIFIED` or `linkedin_url`-only).

The other 1-2 contacts `prima-committee` found are never discarded — they're written to
`accounts_processed.csv` as backup (multiple rows per company there, same as every prior batch), just
not carried into `leads_final.csv`.

## Rules that apply automatically — the vendor never has to know these exist

- Sample-first / cost-gate protocol from `prima-email-waterfall` and `prima-committee`'s Tier 2 gate
  — but per Aldahir's standing approval for this validated method, this orchestrator runs Deepline
  calls directly without pausing for per-batch approval. It still reports the real accumulated cost
  at the end, every time, no exceptions.
- Never fabricate a signal, a contact, or an email — every "no data" case is a real, correctly empty
  result, not a gap to fill with a plausible guess.
- Existing-customer exclusion, ICP disqualification, out-of-scope exclusion (`prima-icp-check`).
- The P1 anti-burn gate (`needs_manual_scope_confirmation`) — doesn't block this orchestrator's work,
  but is surfaced in the final summary so nobody drafts to one of these accounts on tier alone later.
- Corporate-email-only rule — a personal email is never written to `contact_email`/promoted to
  `VERIFIED`.
- Placeholder discipline — a company with no named contact gets no fabricated placeholder row; it
  simply doesn't count toward N (see "If N isn't reached" below).

## Output

Two files, same as every other batch, **not** a third format:

- **`output/accounts_processed.csv`** — full backup, appended (all 2-3 contacts per company, every
  column the pipeline produces). Unchanged convention.
- **`output/leads_final.csv`** — regenerated (not appended), but with a stricter shape for this
  orchestrator's runs: **exactly one row per company** (the single contact selected above), not one
  row per contact. This differs from a hand-run batch where multiple contacts per company might all
  make it into `leads_final.csv` — for `prima-generate-leads`, N companies always means N rows.
  Same 10 columns, same order, as already defined in `output/README.md`.

## What the vendor sees at the end — plain language, not a data dump

This is the only thing most users of this skill will ever read. No column names, no jargon, no wall
of CSV.

```
Listo — batch de {N_solicitado} leads de {vertical} {cerrado u OJO}

RESULTADO
- {N_logrado} de {N_solicitado} empresas con contacto accionable
- {n_verified} con email verificado — listas para escribir directo
- {n_linkedin_only} solo con LinkedIn (sin email confirmado) — contáctalas por ahí primero

Archivo: output/leads_final.csv (impórtalo a tu Sheet — pasos en output/README.md)

COSTO
Esta corrida: ${costo_real} · Saldo Deepline: {saldo_creditos} créditos

{bloque de déficit, solo si N_logrado < N_solicitado — ver abajo}

{bloque de P1 pendiente de confirmación, solo si aplica — ver abajo}
```

`{cerrado u OJO}` is literally "— cerrado" when `N_logrado = N_solicitado`, or
"— no se completó el número pedido, ver abajo" when it isn't. No emoji, no tables, no technical
column names — this message is for someone who has never opened `accounts_processed.csv` and never
will.

## If N isn't reached — say so, honestly, with reasons

**Never pad the output to hit the requested number.** If the circuit breaker trips before N is
reached, the deliverable has fewer than N rows and the summary says exactly that, plus why:

```
NO SE ALCANZARON LAS {N_solicitado} — se quedó en {N_logrado} empresas reales. Por qué:
- {n} ya estaban en el tracker o en corridas anteriores (no cuentan como nuevas)
- {n} se excluyeron (cliente existente / fuera de Categoría 4 / confirmado 100% in-house)
- {n} tenían señal real y pasaron ICP, pero ni Deepline ni WebSearch encontraron un contacto de
  sourcing localizable — ni LinkedIn ni email
Ninguna de las {N_logrado} de arriba se rellenó para completar el número — son las reales.
```

Every bucket in that breakdown must sum to the number of candidates actually evaluated (the
Step-0 circuit-breaker count) — if the arithmetic doesn't add up, something was miscounted, not
just under-reported.

## If any P1 needs manual scope confirmation

Add this block whenever at least one company in the batch has `priority = P1` and
`needs_manual_scope_confirmation = TRUE`:

```
OJO: {n} cuenta(s) de alto valor (P1) necesitan que confirmes tú a mano que sí subcontratan
fabricación antes de que alguien les escriba — quedaron con contacto listo, pero no se les debe
armar un draft todavía. Están marcadas en accounts_processed.csv; pregúntame si quieres la lista.
```

## What this skill does NOT do

- Does not run `prima-hook`, `prima-draft`, or `prima-guardrail-audit` — this produces a qualified,
  contactable lead list, stopping right where a human decides what to actually say to each contact.
- Does not commit or push to git on its own — same standing convention as every other batch in this
  repo; the user asks for that separately when they're ready.
- Does not run for Manu's verticals (Cooling & Thermal Management, Test & Commissioning) — asks for
  clarification instead of guessing if the request is ambiguous.
