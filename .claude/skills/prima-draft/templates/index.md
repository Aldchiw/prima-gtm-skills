# Template library index

One row per template. This file is the lookup table `prima-draft` reads to pick a template — don't
open every template file to check applicability, check here first.

## Matching rule

`committee_role` is a **list**, not a single string — a template can legitimately serve more than
one committee role (e.g. `T-4C-founder-v1` covers both "Founder / CEO" and "VP Engineering / Head
of Manufacturing" with the same peer-to-peer tone). A match means the contact's `committee_role`
(from `prima-committee`, always a single role) **appears in** the template's list — never require
the two to be equal as whole strings, and never fuse multiple roles into one list entry just to
force a match. If no template's list contains the contact's exact role, that's when the
sub-segment-level fallback below applies — a match found via the list still counts as a real match,
not a fallback.

`status` values: `seed-v1-unvalidated` (written to unblock Sprint 2, no real reply data yet) →
`validated` (Gaby/Aldahir reviewed it and/or it has real reply data behind it) → `retired`
(superseded by a newer version, kept for historical `template_id` traceability — never delete a
template file once it's been used in a real draft).

| template_id | sub_segment | committee_role (list) | signal_type_fit | draft_slot | priority_scope | status | file |
|---|---|---|---|---|---|---|---|
| T-4B-plantpurchasing-v1 | `4B` | Plant Purchasing Manager / Procurement Manager | `capacity_expansion`, `job_opening`, `customs` | E1/E2/E3 | any | `seed-v1-unvalidated` | `T-4B-plantpurchasing-v1.md` |
| T-4C-founder-v2 | `4C` | Founder / CEO; VP Engineering / Head of Manufacturing | `funding`, `job_opening`, `capacity_expansion`, `customs` | E1/E2/E3 | any | `active-v2` | `T-4C-founder-v2.md` |
| e1_datacenter_overflow | any Cat 4 sub-segment (angle-matched — see below, not role-matched) | *(any — this template ignores `committee_role` entirely)* | `capacity_expansion` **(the E1 hook specifically, not just "present somewhere")** | **E1 only** | all tiers — P1 still gated by the existing `needs_manual_scope_confirmation` rule, same as every other template | `DRAFT — pending Gaby sign-off (do NOT send until approved)` | `e1_datacenter_overflow.md` |

### New matching dimensions added for `e1_datacenter_overflow` (2026-07-21)

This is the first **angle-matched** template — matched by the account's live signal rather than the
contact's role. Added two columns to support it, both blank/`any` for the two existing seed templates:

- `draft_slot` — which of E1/E2/E3 this template is eligible for. The two seed templates are full
  skeletons reused across all three (per the hook-rank mapping in `prima-draft/SKILL.md`).
  `e1_datacenter_overflow` is **E1 only** — it was written and named as a first-touch template, not a
  reusable 3-slot skeleton. **E2/E3 for the same contact still come from the normal sub_segment/
  committee_role template (T-4B or T-4C), even when E1 came from this one.** Don't extend this
  template to E2/E3 without a deliberate decision to do so — that's a different, larger change than
  what was asked for here.
- `priority_scope` — **no template-level tier restriction on `e1_datacenter_overflow` itself**
  (revised 2026-07-21 — see below for why the original `P2/P3 only` framing was wrong). The only
  thing gating a `P1` account away from *any* draft (this template or the normal one) is `prima-draft`'s
  existing, unchanged anti-burn rule: `priority = P1` and `needs_manual_scope_confirmation = TRUE` →
  `NO_DRAFT`, full stop, regardless of template. A `P1` account that's already cleared that gate
  (confirmed `scope_tier = confirmed_outsources`, or a human confirmed scope directly) is exactly as
  eligible for `e1_datacenter_overflow` as a `P2`/`P3` account is — nothing in this template
  special-cases `P1` beyond the gate that already exists for every template.
- **Why the original `P2/P3 only` line was wrong, not just cautious:** `priority` is *derived from*
  `sub_segment` in `prima-icp-check` (`4B → P1`, `4C → P1`, always, barring the rare Notion-priority
  conflict that skill flags but doesn't resolve). A template meant to apply to `4B`/`4C` accounts
  "regardless of sub-segment" but restricted to `P2`/`P3` tier is close to self-contradictory — `4B`/
  `4C` accounts are P1 by construction, so a strict `P2/P3 only` rule would have meant this template
  almost never actually fired for the population it was written for. Removing the tier restriction
  (and relying on the pre-existing P1 anti-burn gate instead, which every template already respects)
  is what makes "applies to 4B or 4C, regardless of which" actually true in practice.
- Sending (not drafting) still requires **two separate things** to both be true for a real send,
  same logic as the template's own frontmatter states: (1) the account-level anti-burn gate cleared
  (as above, applies to every template, not specific to this one), and (2) this specific template's
  own `status` reaching something past `DRAFT — pending Gaby sign-off` (i.e. Gaby actually approves
  it). Neither gate substitutes for the other.

### Selection precedence when `e1_datacenter_overflow` could apply

Check this **before** the normal sub_segment/committee_role lookup, only for the `E1` slot, and only
for a contact that already cleared `prima-draft`'s existing dependency table (i.e. didn't already get
`NO_DRAFT` for hook/scope-confirmation/disqualification reasons — see that skill's own table):

1. Is the `E1` hook's `signal_type` (from `prima-hook`, `hook_rank = 1`) exactly `capacity_expansion`?
   If not (e.g. it's `funding`, `customs`, `job_opening`), skip this template — go to the normal table.
2. If it is, use `e1_datacenter_overflow` for `E1` — regardless of the contact's `sub_segment`,
   `committee_role`, or `priority`. It applies the same way to a `4B` plant-purchasing contact and a
   `4C` founder, as long as the account's top signal is a capacity-expansion story and the contact
   already reached the draft stage at all.
3. `E2`/`E3` always resolve via the normal sub_segment/committee_role table (step 2 never applies to
   them) — never carry this template's selection into the other two slots.

### Known incompatibilities to watch for

- **[FIXED 2026-07-21] Placeholder syntax now matches the seed templates.** `e1_datacenter_overflow`
  originally used single-brace placeholders with different field names (`{first_name}`, `{company}`,
  `{signal_line}`) than the seed templates' `{{double_brace}}` convention — a real risk of an
  unsubstituted placeholder leaking into a real email if `prima-draft` didn't recognize the syntax.
  Rewritten to use the exact same `{{double_brace}}` style and the same field names the seed templates
  already use (`{{account_name}}`, `{{contact_name}}`, `{{hook_fact}}`, `{{prima_products}}`) — see
  the template's own Changelog. This was a pre-use edit (never used in a real draft yet), so it didn't
  violate the versioning rule above. The template's frontmatter block (plain markdown header, not a
  YAML `---` block like the seed templates) was deliberately left as-is — that's a cosmetic metadata
  difference, not a placeholder-substitution risk, since frontmatter never appears in a sent email.
- **Body length conflicts with `prima-draft`'s own guardrail.** `prima-draft/SKILL.md` states "6-8
  lines in the email body" as a rule it applies directly. `e1_datacenter_overflow`'s body is 4 lines —
  this is called out in the template's own Changelog as an open item for Gaby ("body is 4 lines vs
  6-8 guardrail — approve relaxing count"). Until Gaby resolves this, treat it as a real, unresolved
  conflict — don't pad the body to force 6-8 lines (that would silently override what was specified
  here) and don't relax the guardrail unilaterally either. A draft generated from this template will
  likely fail `prima-guardrail-audit` on line count until this is explicitly decided.
- **Status vocabulary doesn't match the standard 3-state one.** The versioning rule above defines
  `seed-v1-unvalidated` → `validated` → `retired`. This template's own frontmatter says
  `DRAFT — pending Gaby sign-off (do NOT send until approved)` instead. Functionally treat it as
  equivalent to `seed-v1-unvalidated` (usable for dry-runs, never for a real send without going
  through `prima-guardrail-audit` and explicit approval) — but the literal string is kept as
  written rather than forced into the existing vocabulary, since Gaby's sign-off gate here is more
  explicit than the standard seed status implies. Don't silently relabel it `seed-v1-unvalidated`.

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

Only 2 templates exist today, one per supported sub-segment (`4B`, `4C`). `T-4B-plantpurchasing-v1`
covers only 4B's primary entry-point role (Plant Purchasing Manager / Procurement Manager) — 4B's
other two roles (Supply Chain Director/VP Operations, Plant Manager/Director of Manufacturing) have
no dedicated template yet. `T-4C-founder-v1` covers 2 of 4C's 3 roles (Founder/CEO and VP
Engineering/Head of Manufacturing) via its `committee_role` list — only COO/Head of Operations is
uncovered there. A contact whose `committee_role` isn't in any template's list still gets drafted —
`prima-draft` falls back to the closest sub-segment-level template rather than refusing to draft.
Log which `template_id` was used either way (and whether it was a list match or a fallback); a
visible gap (same template reused via fallback across very different roles) is the signal that a
new, more specific template should be added here — don't treat the fallback as good enough forever.
