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

### PENDING IMPROVEMENT — signal cascade for Step 0 (designed 2026-07-22, not implemented)

**Do not build this yet — this is the target design for a future change, written down so it doesn't
get lost, not something to act on today.** The problem it's meant to fix: Step 0 today runs a single
WebSearch pass mixing all signal categories together (capacity-expansion news, funding, job openings)
and just stops — reporting a shortfall — once dedup exhausts what that pass turns up. Confirmed real
case, 2026-07-22: a "genera 3 leads de Power & Electrical" run returned **0 of 3** because 33 of the
41 accounts already in `accounts_processed.csv` were discovered via `capacity_expansion` alone (80%
of the tracker) — that well was dry, and the run had no fallback, so it just reported the shortfall
instead of trying a different signal category. `job_opening` and `customs` (Import Genius) have
**never** been used as a discovery signal in this repo's history — 0 of 41 tracked accounts came from
either.

**Target behavior:** Step 0 tries signal categories in priority order, strongest-first, and only
drops to the next tier when the current tier stops producing enough *new* (non-duplicate) candidates
to plausibly reach N — not when it hits zero, and not as a blanket first pass across every signal type
at once like today.

1. `capacity_expansion` (news of a new/expanded plant) — strongest signal, tried first, same as today.
2. `funding` (Series B/C, PE recapitalization/roll-up) — already validated as productive in real runs
   (Ayr Energy, CORE Transformers, DG Matrix, Exowatt, ARC Clean Technology, Amperesand all came from
   this tier) — drop to this tier once (1) isn't yielding enough new candidates.
3. `job_opening` (active postings for plant purchasing / sourcing / supply chain roles at electrical
   or storage equipment manufacturers) — untapped; a real buying-intent signal even with zero press
   coverage of any physical expansion.
4. `customs` (Mexico→US import records via Import Genius, per `prima-signal-scan`'s own source list) —
   untapped; the only signal type that's directly, positively correlated with actually outsourcing
   fabrication rather than just growing.

Each tier still runs through the same dedup, ICP, scope-score, committee, and email-waterfall steps
already defined below — this only changes what Step 0 searches for and when it moves on, not anything
downstream. The circuit breaker above (N reached, or 3×N evaluated) still applies across the whole
cascade, not per tier — don't let this turn into 4 separate circuit breakers stacked on top of each
other.

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
  Same 12 columns, same order, as already defined in `output/README.md` (the last 2, `stage` and
  `contact_count`, are manual sales-tracking fields — see the hard rule right below, never skip it).

### Hard rule: merge `stage`/`contact_count`, never reset them (added 2026-07-21)

`leads_final.csv` is regenerated from scratch every run — but `stage` and `contact_count` are
**manual fields a human fills in by hand in Sheets** between runs (see `output/README.md`). A naive
full rewrite would blow that away every time this skill runs. **Before writing the new file, always**:

1. Read whatever `output/leads_final.csv` currently contains (if it exists) and build a map of
   `account_name -> {stage, contact_count}` from it.
2. Compute the fresh one-row-per-company list as normal (discovery + pipeline + contact selection).
3. For each row in the fresh list, look it up by `account_name` in that old map:
   - **Found (an account that already existed):** carry its `stage` and `contact_count` forward
     unchanged. Never overwrite real sales progress with `Not Contacted`/`0`, no exceptions.
   - **Not found (a genuinely new account this run discovered):** only then default to
     `Not Contacted` / `0`.
4. Write the merged result.

**Known limitation, not fully solved:** the match key is `account_name` (exact string), since
`leads_final.csv` doesn't carry `domain`. If an account's `account_name` string changes between runs
for the same underlying company (e.g. a rename), the merge won't recognize it as the same row and will
incorrectly default it — treat that as a real bug to catch by eye (compare row counts before/after: a
sudden jump in "new" accounts that weren't actually new is the tell), not a silently-accepted risk.

## Presentation mode — default, silent execution

This is the intended way a non-technical vendor experiences this skill — the one-line invocation
("genera 5 leads de Power & Electrical") is the whole interaction; everything else in this section
is about what does **not** get shown, not new logic. This doesn't change Steps 0-5 or the merge rule
above — it changes what surfaces to the screen while they run.

**Run every internal step silently.** While discovery and Steps 1-5 execute, do not narrate or print:
- Which company is currently being processed, or the running list of candidates evaluated.
- Which Deepline provider was called for a given step (`ai_ark_people_search`, `hunter_email_finder`,
  `company_titles`, etc.) or its raw response.
- Any CSV dump, `Format-List`/table printout, or raw row-by-row view of `accounts_processed.csv`
  or `leads_final.csv` while building them.
- Raw verification strings from a provider (e.g. "Hunter source_type=generated,
  verification.status=valid...") — that detail lives in the file, not on screen.
- Per-account skip/no-match rows from `prima-committee` (`SUB_SEGMENT_NOT_SUPPORTED`,
  `ROLE_NOT_FOUND`, `SKIPPED_EXCLUDED`, `SKIPPED_UNKNOWN`) or from any other step's own status
  vocabulary. These are real, correct outcomes — they just aren't vendor-facing; they stay in the
  CSV and in the shortfall/P1 blocks of the final message where they're already accounted for.

**The only output during the run is a minimal progress indicator** — short, plain-language, no
technical nouns:

```
Buscando empresas...
Verificando contactos...
Listo.
```

Three lines like this (or similarly minimal phrasing) is the ceiling — not a per-company tick, not a
per-step breakdown, not a percentage. Its only job is confirming the run is alive, not reporting on
it.

**The only real output is the final vendor-facing block**, defined in the next section, shown once,
in full, isolated — nothing printed before it lingers on screen mixed in with it, and nothing prints
after it.

**Known technical noise — silence it at the call site, every time.** Every `deepline` CLI invocation
on Windows currently prints a startup block to **stderr** — "Deepline skills changed; syncing agent
skills...", a Node `DEP0190` deprecation warning, and `SDK skills sync failed: failed to start npx:
spawn npx ENOENT` followed by a 300+ character suggested manual command. Confirmed root cause
(2026-07-21/22): `deepline` decides whether to re-sync by checking its own internal state file
(`~/.local/deepline/code-deepline-com/sdk-cli/compat-cache.json`, field `skills.local.version`) against
the remote skills hash — that local marker can only be written by `deepline`'s own internal sync path,
which is the same path broken by the Windows `npx` spawn bug. Manually running the equivalent
`npx skills add ...` command from outside `deepline` installs the skill files correctly but does
**not** update that marker, so `deepline` keeps declaring the skills changed and keeps retrying (and
failing) the same broken internal sync on every single call — installing the skills yourself does not
fix this. It is confirmed cosmetic — stdout carries the real response cleanly every time, verified by
capturing the two streams separately; no output has ever been affected — but it prints in red to
whatever terminal is running the command, so anyone driving `prima-generate-leads` (this repo's
assistant, or a human typing `deepline` directly) must append a stderr redirect:

- Bash tool / Git Bash: `2>/dev/null`
- PowerShell tool: `2>$null`

**This applies to every `deepline` call this skill makes, automatically, with no exception** — not just
during a demo. The assistant running this skill appends the redirect itself on every `deepline`
invocation; the user never has to type anything for calls the assistant makes on their behalf. The one
case this doesn't cover: a human typing a `deepline` command directly into their own terminal (not
through this skill) has to add the redirect themselves, or they'll see the noise. Drop this rule the
day Deepline ships a fix for the Windows sync bug (tracked as a pending report — see below) — don't
carry a stale workaround once the root cause is gone.

**Pending, not yet done:** report this bug to Deepline via `deepline feedback` (or the
`deepline-feedback` skill) — the local-workaround above unblocks this repo's own use, but the actual
fix has to happen in Deepline's CLI.

**Exception — real failures.** If something genuinely fails in a way that blocks completion
(a required tool is unreachable, a file can't be read/written, etc.), surface that — but in plain
language a vendor can act on, not a stack trace or a raw error string. E.g. "No pude leer el archivo
de leads anterior — avísame antes de que siga" rather than a dumped exception. A partial/expected
outcome (shortfall in N, a P1 needing manual confirmation) is **not** a failure — that's already
handled by the normal final-message blocks below and never triggers this exception path.

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
