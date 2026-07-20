# Template library index

One row per template. This file is the lookup table `prima-draft` reads to pick a template — don't
open every template file to check applicability, check here first.

`status` values: `seed-v1-unvalidated` (written to unblock Sprint 2, no real reply data yet) →
`validated` (Gaby/Aldahir reviewed it and/or it has real reply data behind it) → `retired`
(superseded by a newer version, kept for historical `template_id` traceability — never delete a
template file once it's been used in a real draft).

| template_id | sub_segment | committee_role | signal_type_fit | status | file |
|---|---|---|---|---|---|
| T-4B-plantpurchasing-v1 | `4B` | Plant Purchasing Manager / Procurement Manager | `capacity_expansion`, `job_opening`, `customs` | `seed-v1-unvalidated` | `T-4B-plantpurchasing-v1.md` |
| T-4C-founder-v1 | `4C` | Founder / CEO / VP Engineering / Head of Manufacturing | `funding`, `job_opening`, `capacity_expansion`, `customs` | `seed-v1-unvalidated` | `T-4C-founder-v1.md` |

## Versioning rule

Never edit a template file's body once it has been used to generate a real (non-dry-run) draft —
`template_id` values must stay stable so reply-rate tracking by template means something over time.
To improve a template, add a new row with a bumped version suffix (e.g. `T-4B-plantpurchasing-v2`)
and a new file; mark the old row `retired` in the `status` column but leave the file in place.

## Language rule

A template's language is determined by the **target contact/account's business language**, not by
the language this repo's operators (Aldahir, Gaby) work in internally. Data Centers channel
templates (Aldahir's verticals — Power & Electrical, Energy Storage) are mostly-US accounts, so
**default to English** for this channel's templates unless a specific account/contact is confirmed
non-English-speaking. Don't write a new template in Spanish just because that's the language of the
conversation that produced it — check who actually receives the email.

(Both seed templates below were corrected to English on 2026-07-20 after being drafted in Spanish
by mistake — Powell Industries and Mainspring Energy are both US-based English-speaking accounts.)

## Known issue — pending Gaby's review, not fixed yet

A `prima-draft` dry-run on 2026-07-20 (Jeanette Cochran/Powell, Tom Linebarger/Mainspring, 6 drafts
total audited by `prima-guardrail-audit`) found that both seed templates tend to drift toward
cost/price language as a subordinate point (3 of 6 drafts triggered `prima-guardrail-audit`'s W5 —
"price subordinate to reliable-supply narrative"), even though neither template's skeleton states a
price angle outright. This is a tone call for Gaby, not something to silently patch here — her
default is to dial that angle down further. Candidate fix for a `v2` of either template once she's
weighed in; don't bump the version pre-emptively.

Only 2 templates exist today, one per supported sub-segment (`4B`, `4C`), each covering just the
sub-segment's primary entry-point role. A contact whose `committee_role` doesn't match any row's
`committee_role` exactly still gets drafted — `prima-draft` falls back to the closest
sub-segment-level template rather than refusing to draft. Log which `template_id` was used either
way; a visible gap (same template reused across very different roles) is the signal that a new,
more specific template should be added here — don't treat the fallback as good enough forever.
