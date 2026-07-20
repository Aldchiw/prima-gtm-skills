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
| `signal_type` | `prima-signal-scan` | the account's top/strongest verified signal |
| `signal_summary` | `prima-signal-scan` | |
| `signal_date` | `prima-signal-scan` | |
| `signal_source_url` | `prima-signal-scan` | renamed from that skill's `source_url` to avoid clashing with `hook_source_url` below |
| `hook_fact` | `prima-hook` | the specific fact actually used to open the draft(s) |
| `hook_source_url` | `prima-hook` | |
| `contact_name` | `prima-committee` | |
| `contact_title` | `prima-committee` | |
| `priority_tier` | `prima-committee` | `ALTA`\|`SECUNDARIA` |
| `contact_email` | `prima-email-waterfall` | blank unless `email_status = VERIFIED` — see that skill's rule against treating `FOUND_UNVERIFIED`/personal emails as usable |
| `email_status` | `prima-email-waterfall` | `VERIFIED`\|`FOUND_UNVERIFIED`\|`NOT_FOUND`\|`NOT_APPLICABLE` |
| `template_id` | `prima-draft` | same across E1/E2/E3 — one contact's 3 drafts always come from one template |
| `draft_status_e1` / `draft_status_e2` / `draft_status_e3` | `prima-draft` | `BORRADOR` per generated slot, blank if that slot doesn't exist (fewer than 3 hooks) or the whole contact is `NO_DRAFT` |
| `audit_status_e1` / `audit_status_e2` / `audit_status_e3` | `prima-guardrail-audit` | `PASS`\|`FAIL`, one per draft — **assumption made here**: the original spec said one `audit_status` column, but each of E1/E2/E3 gets its own independent verdict from that skill, so this file splits it the same way `draft_status` is split. Flag if a single rollup column was actually intended instead. |

This file does **not** carry the actual draft subject/body text — just status/tracking columns.
The email content itself lives wherever `prima-draft` printed or saved it during that run.

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
