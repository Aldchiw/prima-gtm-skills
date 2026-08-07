# Output files

Two local CSVs, two different jobs. Don't mix them, and don't wire either one to Sheets/Canva/Slack
automatically — both are local files; connecting them to anything else is a manual step Aldahir does
afterward, not something a skill run does on its own.

Both files are **append-only**: each account/contact processed through the pipeline adds new rows
at the end. Never overwrite or truncate either file when running a new batch.

## `accounts_processed.csv` — the rich working CSV

One row per **contact** (not per account — an account with 3 committee contacts gets 3 rows), with
every field the full pipeline produced for that contact. This is the source Aldahir connects to
Canva/Slack/wherever, by hand, after the fact.

| Column | Comes from | Notes |
|---|---|---|
| `domain` | `prima-icp-check` | |
| `account_name` | `prima-icp-check` | |
| `sub_segment` | `prima-icp-check` | `4A`\|`4B`\|`4C`\|`4D`\|`UNKNOWN` |
| `priority` | `prima-icp-check` | |
| `vertical_owner` | `prima-icp-check` | |
| `excluded` | `prima-icp-check` | if `yes`, the row stops here — no contact/signal/draft columns apply |
| `exclusion_reason` | `prima-icp-check` | |
| `outsourcing_score` | `prima-scope-score` | `0`–`100` — see below |
| `scope_tier` | `prima-scope-score` | `confirmed_outsources`\|`tier_1`\|`tier_2`\|`tier_3`\|`disqualified_inhouse` — see below |
| `score_rationale` | `prima-scope-score` | one line citing every factor behind the score — never a bare number |
| `needs_manual_scope_confirmation` | `prima-scope-score` | `TRUE`/`FALSE`/blank — only meaningful when `priority = P1`; see below |
| `signal_type` | `prima-signal-scan` | the account's top/strongest verified signal; blank when `signal_status = NO_SIGNAL` |
| `signal_summary` | `prima-signal-scan` | |
| `signal_date` | `prima-signal-scan` | |
| `signal_source_url` | `prima-signal-scan` | renamed from that skill's `source_url` to avoid clashing with `hook_source_url` below |
| `signal_status` | `prima-generate-leads` (Tier 0 only, added 2026-07-22, revised same day) | `VERIFIED`\|`NO_SIGNAL` — only meaningful for candidates discovered via Tier 0's firmographic search (`ai_ark_company_search`); blank for rows from the WebSearch cascade, where surfacing a candidate at all already implies a signal exists. `NO_SIGNAL` means the candidate passed ICP and scope-score but `prima-signal-scan` found no current, citable signal. **This is a label, not a gate** — a `NO_SIGNAL` row still goes through `prima-committee`/`prima-email-waterfall` and still lands in `leads_final.csv` exactly like a `VERIFIED` row once it has a contact; the original 2026-07-22 design stopped `NO_SIGNAL` rows before contact search, but that gate was removed the same day once Aldahir clarified fit alone (ICP + scope-score) is what should decide whether a lead is worth contacting, not whether a signal happened to exist too. See `prima-generate-leads/SKILL.md`'s Tier 0 section for the current rule. |
| `hook_fact` | `prima-hook` | the specific fact actually used to open the draft(s) |
| `hook_source_url` | `prima-hook` | |
| `contact_name` | `prima-committee` | |
| `contact_title` | `prima-committee` | |
| `priority_tier` | `prima-committee` | `ALTA`\|`SECUNDARIA` |
| `linkedin_url` | `prima-committee` (added 2026-07-21) | the contact's LinkedIn profile URL, when found. If two different tools return two different handles for what looks like the same person, record both with a note rather than guessing which is current — don't silently pick one. |
| `contact_email` | `prima-email-waterfall` | blank unless `email_status = VERIFIED` — see that skill's rule against treating `FOUND_UNVERIFIED`/personal emails as usable |
| `email_status` | `prima-email-waterfall` | `VERIFIED`\|`FOUND_UNVERIFIED`\|`NOT_FOUND`\|`NOT_APPLICABLE` |
| `template_id` | `prima-draft` | same across E1/E2/E3 — one contact's 3 drafts always come from one template |
| `draft_status_e1` / `draft_status_e2` / `draft_status_e3` | `prima-draft` | `BORRADOR` per generated slot, blank if that slot doesn't exist (fewer than 3 hooks) or the whole contact is `NO_DRAFT` |
| `audit_status_e1` / `audit_status_e2` / `audit_status_e3` | `prima-guardrail-audit` | `PASS`\|`FAIL`, one per draft — **assumption made here**: the original spec said one `audit_status` column, but each of E1/E2/E3 gets its own independent verdict from that skill, so this file splits it the same way `draft_status` is split. Flag if a single rollup column was actually intended instead. |

This file does **not** carry the actual draft subject/body text — just status/tracking columns.
The email content itself lives wherever `prima-draft` printed or saved it during that run.

### `outsourcing_score` / `scope_tier` / `score_rationale` / `needs_manual_scope_confirmation` — the probability gate

These four come from `prima-scope-score` (added 2026-07-20, replacing an earlier binary
`procurement_scope_status` field). They estimate Notion's own "Equipment Procurement Scope"
criterion — does the account actually subcontract structural fabrication, or manufacture 100%
in-house? — as a probability instead of a yes/no, because hard public confirmation is rare. See
`.claude/skills/prima-scope-score/SKILL.md` for the full weighting (product type 45 / capacity
expansion 35 / sourcing-team evidence 20) and the two hard overrides that dominate it.

**Why a score instead of a binary:** discovered 2026-07-20 during a generator-mode research run — 4
new accounts (Stryten Energy, Eos Energy, Moment Energy, Enercon Engineering) all matched every
other ICP criterion, but a plain confirmed/not-confirmed flag left all but one stuck in the same
"not confirmed" bucket with no way to prioritize among them. Enercon is the case that proves the
override matters: it would have scored 70% (`tier_1`) on the weighted signals alone, and only the
negative override (its own site confirms 100% in-house/vertically integrated) caught the
disqualification. See `SPRINT2_GABY_REVIEW.md` for the still-open question of what source can
actually *confirm* this (WebSearch alone hasn't been reliable for it) — the score is a
prioritization tool for that gap, not a replacement for real confirmation.

**Hard flow rule (the anti-burn rule): a `priority = P1` account never reaches `prima-draft` on
tier/score alone.** `needs_manual_scope_confirmation = TRUE` for any P1 account whose `scope_tier`
isn't already `confirmed_outsources` — the actual block is enforced in `prima-draft`'s dependency
table (see that `SKILL.md`), not here; this column is just the signal that gate should be checked.
`prima-committee`/`prima-hook`/`prima-email-waterfall` can still run on a P1 in this state — they
prepare material — only the draft itself waits for a human to confirm scope directly.
`priority = P2`/`P3` accounts are never subject to this rule; their tier decides on its own. A
`scope_tier = disqualified_inhouse` row is blocked for every priority, no exceptions — that override
should already show up as `excluded = yes` upstream, so `needs_manual_scope_confirmation` is left
blank for it rather than set to either value.

## `leads_final.csv` — the clean actionable view (added 2026-07-21)

A distilled export derived from `accounts_processed.csv` — **not** a third source of truth,
just the subset that's actually ready to act on, reshaped for handing to Sheets/Aldahir directly. This
file's 14 columns, in this order: `account_name`, `company_category`, `scope_tier`, `notion_scope`,
`signal_summary`, `signal_source_url`, `contact_name`, `contact_title`, `linkedin_url`,
`contact_email`, `email_status`, `best_channel`, `stage`, `contact_count`.

- `company_category` and `notion_scope` (added 2026-08-06) come straight from `prima-icp-check` —
  carried through unchanged, never recomputed here. **`notion_scope` is Cat3-only in practice**: for
  a `Cat3` row it's the curated "Fabrication Outsourcing Scope" text `prima-icp-check` read from
  Notion (the same value that stands in for a computed score, since `prima-scope-score` doesn't
  support `Cat3` — see that skill's own note); for a `Cat4` row it's normally blank, since
  `scope_tier` already answers the same question for Cat4. `scope_tier` itself is unchanged by this
  addition — still `prima-scope-score`'s computed tier, still Cat4-only, blank for `Cat3` rows.
- One row per **actionable contact** — a contact only makes it in if it has a `linkedin_url` and/or a
  `contact_email`. Placeholder rows (no named contact, or a named contact with neither) are dropped
  entirely — this file has no "empty" rows by design.
- `contact_email` is populated only when the source `email_status` was `VERIFIED`; `FOUND_UNVERIFIED`
  emails are dropped from this file's `contact_email` column on purpose (never sendable) — those
  contacts still appear here via `linkedin_url` with `email_status = "solo LinkedIn"`.
- `email_status` here is simplified to two values: `VERIFIED` / `solo LinkedIn` (collapses
  `accounts_processed.csv`'s `FOUND_UNVERIFIED`/`NOT_FOUND` into "no usable email, use LinkedIn instead").
- `best_channel` is derived: `email` if `VERIFIED`, else `LinkedIn`.
- `contact_title` and `linkedin_url` are cleaned of the internal provenance/attribution notes that
  `accounts_processed.csv` carries (e.g. "-- [DEEPLINE, ai_ark_people_search] found where WebSearch
  could not...") — just the title/URL itself. `signal_summary` is shortened to one clause per account.
  The full detail always still lives in `accounts_processed.csv`; nothing here is a new fact, only a
  trimmed presentation of one.
- Sorted by `scope_tier` (`tier_1` before `tier_2`/`tier_3`), then `VERIFIED` before `solo LinkedIn`
  within a tier.
- Regenerated (not appended) after each batch — it's a full derived snapshot of whatever's currently
  actionable in `accounts_processed.csv`, not an append-only log like the other two files.

### `stage` / `contact_count` — manual sales-tracking columns (added 2026-07-21)

These two are **not derived from any skill** and never auto-populated or inferred from other columns —
they're pure manual-capture fields for whoever is actually working the leads (Aldahir or another
vendor) to update by hand in Sheets as outreach progresses.

- `stage` — one of exactly: `Not Contacted` (default) · `Contacted (E1)` · `Follow-up (E2/E3)` ·
  `Replied` · `Meeting Booked` · `RFQ Sent` · `Not Interested` · `Cooldown`. In Sheets this column
  should carry a dropdown (data validation, reject-invalid) restricted to that exact list. A plain CSV
  can't encode data validation or bold formatting — apply the dropdown and header bold by hand in
  Sheets after importing (`Datos` → `Validación de datos` → `Lista de elementos` with the 8 values
  above, in that order; select "Rechazar la entrada" so invalid values are blocked).
- `contact_count` — an integer `0`–`5` (default `0`), same manual-dropdown treatment (`Datos` →
  `Validación de datos` → `Lista de elementos`: `0, 1, 2, 3, 4, 5`, reject invalid).

**Fixed 2026-07-21 (was a standing risk):** `leads_final.csv` is regenerated from scratch (not
appended) on every new `prima-generate-leads` batch, but the regeneration step now **merges by
`account_name`** before writing — an account that already had a row keeps its existing `stage`/
`contact_count` untouched; only a genuinely new account gets the `Not Contacted`/`0` defaults. This is
now a hard rule documented in `prima-generate-leads/SKILL.md` — verified 2026-07-21 by simulating
manual progress on two rows and confirming a full regeneration preserved both instead of resetting
them. Known limitation: the match is by `account_name` text (this file doesn't carry `domain`), so if
an account's display name changes between runs it won't be recognized as the same row — see the
skill's own note on catching that by eye if it ever happens.

### Cómo llevar `leads_final.csv` a mi Google Sheet

Nivel A (manual, el que usamos por ahora — el Nivel B, escritura automática vía API de Google Sheets,
queda como mejora futura, ver `SPRINT2_GABY_REVIEW.md`):

1. Abre el Google Sheet fijo donde vives el tracking de leads.
2. `Archivo` → `Importar`.
3. Pestaña `Subir` → arrastra o selecciona `output/leads_final.csv`.
4. En "Ubicación de importación" elige **Insertar nueva hoja**.
5. Nombra la hoja nueva con la fecha del batch (ej. `leads_2026-07-21`) — no sobreescribas una hoja
   existente, cada batch va en su propia hoja para no perder el historial.
6. Tipo de separador: detectar automáticamente (es coma).
7. Importar.

Siempre el mismo procedimiento, siempre hoja nueva con fecha — así el Sheet fijo acumula un historial
de batches en vez de perder el anterior.

## `tracker_light.csv` — the outreach log

A minimal log of who got contacted, for Aldahir's own Google Sheet. Nothing else — resist adding
columns here even if they'd be convenient; that's what `accounts_processed.csv` is for.

| Column | Comes from |
|---|---|
| `account_name` | `prima-icp-check` |
| `contact_name` | `prima-committee` |
| `contact_title` | `prima-committee` |
| `sub_segment` | `prima-icp-check` |
| `signal_source` | `prima-signal-scan` (or `prima-hook`'s `signal_type` if that reads clearer at a glance) |
| `template_id` | `prima-draft` |
| `fecha` | the date this contact was processed |

One row per contact, same as `accounts_processed.csv` (not per draft — E1/E2/E3 don't each get a
tracker row).

## Who writes these

Neither file is owned by a single skill — a contact's row isn't complete until `prima-committee`,
`prima-email-waterfall`, `prima-hook`, `prima-draft`, and `prima-guardrail-audit` have all run for
them. Whoever is driving a full pipeline run for a contact (the conversation orchestrating the 7
skills) compiles the row from each skill's output and appends it to both files at the end of that
contact's run — this is a session-level convention, not internal logic inside any one `SKILL.md`.
