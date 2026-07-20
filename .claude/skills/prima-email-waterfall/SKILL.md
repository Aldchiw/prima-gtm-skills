---
name: prima-email-waterfall
description: Given named contacts (the output of `prima-committee`), waterfalls across Deepline email-finding providers to find and verify a corporate email — falls through to the next provider on failure until a verified hit, or leaves the field empty if none succeed. Never returns an unverified guess as if it were good data, and never accepts a personal email (gmail, etc.) as the sendable result. Single contacts or a 10-20 sample run freely; a full batch stops first to show contact count, max provider depth, and estimated cost, and waits for explicit approval. Use this after `prima-committee` has named the buying-committee contacts and before `prima-hook`/`prima-draft` need a real address to send to.
---

# prima-email-waterfall

Given named contacts from `prima-committee` (domain, account_name, sub_segment, committee_role,
contact_name, contact_title), find and verify each person's **corporate** email by falling through
a chain of Deepline providers, stopping at the first verified hit.

## Input

Rows from `prima-committee`'s output. Only rows with `status = CONTACT_FOUND` have a name to look
up — pass every other row (`ROLE_NOT_FOUND`, `SUB_SEGMENT_NOT_SUPPORTED`, `SKIPPED_EXCLUDED`,
`SKIPPED_UNKNOWN`) straight through untouched with `email_status = NOT_APPLICABLE`; there's no
person to search for.

## Provider waterfall (provisional — hardcoded here, correct it as real hit-rate data comes in)

Same exception as `prima-committee`'s role mapping: this order isn't validated against real Prima
data yet, it's a reasonable starting point. Adjust the stages below once enough runs accumulate to
show which providers actually perform for Prima's contacts, instead of guessing indefinitely.

| Stage | Providers (in order) | Role |
|---|---|---|
| 1 — fast/cheap discovery | `findymail` → `hunter` → `prospeo` | Try first: best expected hit-rate-to-cost ratio for corporate emails |
| 2 — broader discovery | `icypeas` → `datagma` → `leadmagic` | Used when Stage 1 comes up empty |
| 3 — contact-database fallback | `contactout` → `lusha` → `rocketreach` → `wiza` | Paid people-search providers; may already have this contact cached if `prima-committee`'s Tier 2 was used for the same person |
| 4 — aggregator waterfalls | `bettercontact` → `fullenrich` | Last resort — these run their own internal cascades across multiple sub-providers |
| Verification gate | `zerobounce` | Always run on any corporate-domain candidate that isn't already self-verified by the provider that found it — see below |

Stop at the **first** provider (in order) that produces a corporate-domain email carrying an
explicit valid/verified status. Don't keep spending through later stages once that happens.

## What "verified" means — three output states, never blur them

- **`VERIFIED`** — a provider (or `zerobounce` run against the candidate) explicitly marked the
  email as valid/deliverable. This is the only state usable for outbound send.
- **`FOUND_UNVERIFIED`** — an email was returned by a provider, but nothing confirmed it as valid
  (e.g. `zerobounce` was inconclusive/unavailable, or the provider doesn't self-verify). **Never
  present this as if it were good data** — a bounced email damages domain deliverability, which is
  worse than an empty field. Flag it clearly; downstream skills must not use it for send.
- **`NOT_FOUND`** — nothing usable turned up after exhausting the whole waterfall.

A `FOUND_UNVERIFIED` corporate candidate does **not** stop the waterfall — keep trying later
providers hoping for an explicitly verified hit. Only stop early on a true `VERIFIED` result. If the
waterfall exhausts every stage without ever reaching `VERIFIED`, output the best `FOUND_UNVERIFIED`
corporate candidate found (still flagged as such) rather than nothing, since it's a real lead a
human might still confirm manually — just never let it look like a ready-to-send address.

## Corporate vs. personal email

Only a **corporate** email (matches the account's domain) counts as a usable result. A personal
email (gmail, hotmail, outlook.com, etc.) is never treated as `VERIFIED` or `FOUND_UNVERIFIED` for
send purposes — if the waterfall only turns up a personal address, `corporate_email` stays empty
and `email_status = NOT_FOUND`. Don't discard the personal address, though — record it separately in
`personal_email_found` so a human knows the person is real and locatable, just through another
channel (LinkedIn, referral). Never move a personal email into the send field.

## Cost gate — batch-level, not per-invocation

Running the waterfall on **one contact, or a sample of up to 20** (the same sample-first protocol
used elsewhere in this pipeline) needs no approval — that's normal, expected use of the skill.

Before running on a **full batch (more than 20 contacts)**, stop and report:
- how many contacts will be searched,
- the maximum provider chain depth per contact (i.e. how many paid calls a single contact could
  rack up if it falls through every stage),
- the estimated total cost for the batch,

then wait for explicit approval before proceeding. This gate exists so a large spend never happens
without Aldahir seeing it coming first — same reasoning as the sample-first protocol, just applied
at the cost layer instead of the coverage layer.

**After** any run (sample or full batch), report the **actual** accumulated cost by provider used
(not just the pre-run estimate) — this feeds the monthly provider-cost business case the Ejecutable
Maestro v2 doc asks to track. Check that doc for the expected report format if one isn't obvious.

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given by `prima-committee` |
| `sub_segment` | `4B` \| `4C` |
| `committee_role` | as given by `prima-committee` |
| `contact_name` | as given by `prima-committee` |
| `corporate_email` | the verified or best-candidate corporate email; blank if `NOT_FOUND` |
| `email_status` | `VERIFIED` \| `FOUND_UNVERIFIED` \| `NOT_FOUND` \| `NOT_APPLICABLE` |
| `verifying_provider` | which provider (or `zerobounce`) produced the final status; blank if `NOT_FOUND`/`NOT_APPLICABLE` |
| `personal_email_found` | a personal email if that's all that turned up; blank otherwise — never used for send |
| `providers_tried` | ordered list of providers actually called for this contact, for cost audit |
| `verified_date` | date this lookup was run |

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep row order stable and matching `prima-committee`'s output.
