---
name: prima-draft
description: Generates 3 email drafts (E1/E2/E3) per contact — contacts from `prima-committee`, opening hooks from `prima-hook`, verified emails (when available) from `prima-email-waterfall` — by selecting a template from a versioned, file-based template library and filling it with the contact's real, verified hook facts. Under Prima's guardrails — 6-8 lines, signal first, "reliable supply" narrative (not cheap pricing), 10,000 tons/month capacity claim, zero customer name-drops, zero unvalidated certifications (only AISC/AWS), zero AI-sounding language. Never invents a fact to fill a gap; if fewer than 3 hooks exist, reuses the strongest one across drafts with a different angle instead of fabricating a second or third. Always emits `draft_status: BORRADOR` and `audit_status: NOT_AUDITED` as clean metadata — never a marker inside the email text itself — and only `prima-guardrail-audit` may change `audit_status`. Use this after `prima-committee`, `prima-hook`, and (ideally) `prima-email-waterfall` have run; it's the last step before `prima-guardrail-audit`.
---

# prima-draft

Given a contact (`prima-committee`), its account's ranked hooks (`prima-hook`), and its email
status (`prima-email-waterfall`), generate 3 draft emails (E1/E2/E3) by selecting and filling a
template from the versioned library in `templates/`.

## Template library — not hardcoded in this file

Templates live as separate files in `templates/`, indexed by `templates/index.md`. `prima-draft`
never invents email structure on the fly — it always selects an existing template and fills it.
See `templates/index.md` for the current library, the versioning rule (never mutate a template
once it's been used in a real draft — new revision = new `template_id`), the matching rule
(`committee_role` is a list per template — a contact matches if its role appears in that list, not
by whole-string equality), and the coverage-gap fallback rule (closest sub-segment-level template if
the contact's role isn't in any template's list yet).

Only 2 seed templates exist as of 2026-07-20 (`T-4B-plantpurchasing-v1`, `T-4C-founder-v1`) —
both marked `seed-v1-unvalidated`. Treat them as a starting point to unblock Sprint 2, not a
finished library; Gaby/Aldahir review and the library grows/improves template-by-template as real
send data comes in.

## Selecting E1 / E2 / E3's hook

`prima-hook` gives up to 3 ranked hook candidates **per account**; drafts are generated **per
contact**. Map them in rank order:

- E1 → hook rank 1
- E2 → hook rank 2 (if it exists)
- E3 → hook rank 3 (if it exists)

If the account has fewer than 3 eligible hooks, the remaining draft(s) reuse the strongest
available hook — **never fabricate a second or third fact to fill the gap.** Vary the opening
angle, structure, or CTA style across drafts that share the same underlying hook instead; the
variation is in how it's said, never in inventing what to say. (Powell Industries, with only 1
eligible hook from the last `prima-hook` run, is the concrete case this applies to today: all 3
drafts would open on the same Jacintoport capacity-expansion fact, phrased three different ways.)

## Dependency handling

| Upstream state | `prima-draft` behavior |
|---|---|
| `prima-hook` returned `NO_HOOK` | **Don't draft anything** for this contact. Emit one row: `draft_status: NO_DRAFT`, reason "sin gancho verificado — cuenta no lista para outreach (signal-first)". Consistent with `prima-hook`'s own "not ready" framing — this isn't an error. |
| Hook available, `prima-email-waterfall` result is `NOT_FOUND` or `FOUND_UNVERIFIED` | **Draft anyway** — the copy doesn't depend on already having the address. Set `send_status: NO_VERIFIED_EMAIL` so it's unambiguous this draft has nowhere to go yet. Never use an unverified or personal email as if it were a real destination just to make the row look complete. |
| Hook available, email `VERIFIED` | Draft normally, `send_status: READY_PENDING_AUDIT` (still can't send — see BORRADOR/audit gating below). |
| `priority = P1` and `prima-scope-score` set `needs_manual_scope_confirmation = TRUE` | **Don't draft anything**, regardless of how good the hook/email look. Emit `draft_status: NO_DRAFT`, reason "P1 sin confirmación manual de procurement scope — ver prima-scope-score". This is the anti-burn rule: a P1 account never reaches a draft on tier/score alone, no matter how strong its `outsourcing_score` is — only a human confirming scope directly (or the account reaching `scope_tier = confirmed_outsources`) clears this. `P2`/`P3` accounts are never subject to this row. |
| `scope_tier = disqualified_inhouse` | **Don't draft anything**, any priority. This should already be caught by `excluded = yes` upstream in `prima-icp-check` — treat reaching `prima-draft` with this tier still set as a sign the exclusion didn't propagate, not a case to handle here. |

## Guardrails (draft applies these directly — `prima-guardrail-audit` is the backstop, not a license to be sloppy here)

- 6-8 lines in the email body.
- The hook fact opens the email — signal first, always.
- "Reliable supply" narrative — never a cheap-pricing pitch.
- 10,000 tons/month capacity claim, stated as-is when included — Prima's standing capacity figure,
  don't alter the number.
- Zero customer name-drops, ever — no exceptions for how impressive the name is.
- Zero unvalidated certifications — only AISC/AWS, and only when actually relevant to the
  account's product line. If a cert claim doesn't clearly apply, drop the clause rather than force
  it in.
- Zero AI-sounding language — no "I hope this finds you well," no generic filler, no em-dash-laden
  LLM cadence. Read like a person who read the source, not a model that summarized it.

## BORRADOR / audit gating — a state the system enforces, not a label a human could lose

The email **text** (subject + body) stays clean — exactly what would be sent, with no "BORRADOR"
or "DO NOT SEND" text embedded in it. Embedding a warning inside the body risks it leaking into a
real send (if copied carelessly) or being deleted along with an edit (losing the warning). Instead:

- Every draft is emitted with `draft_status: BORRADOR` and `audit_status: NOT_AUDITED` as separate
  metadata fields, always, with no exceptions.
- `audit_status` may **only** change (to whatever `prima-guardrail-audit` assigns — pass/fail per
  its own vocabulary) by actually running that skill. `prima-draft` never sets it to anything but
  `NOT_AUDITED`.
- A draft with `audit_status: NOT_AUDITED` must never be presented as ready to send, regardless of
  how clean the copy looks.

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given upstream |
| `contact_name` | as given by `prima-committee` |
| `committee_role` | as given by `prima-committee` |
| `draft_id` | `E1` \| `E2` \| `E3` |
| `template_id` | the exact template used (see `templates/index.md`) — for reply-rate tracking by template |
| `hook_rank_used` | which `prima-hook` rank this draft's fact came from (`1`/`2`/`3`) — repeats across drafts when fewer than 3 hooks existed |
| `subject` | filled subject line |
| `body` | filled email body — clean text, no BORRADOR marker inside |
| `draft_status` | `BORRADOR` (always, at creation) \| `NO_DRAFT` |
| `audit_status` | `NOT_AUDITED` (always, at creation) — only `prima-guardrail-audit` changes this |
| `send_status` | `READY_PENDING_AUDIT` \| `NO_VERIFIED_EMAIL` \| blank when `draft_status = NO_DRAFT` |
| `no_draft_reason` | text, only populated when `draft_status = NO_DRAFT` |

One block of 3 rows (`E1`/`E2`/`E3`) per contact, or a single `NO_DRAFT` row when there's no hook to
work with.

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep contact order stable and matching `prima-committee`'s output.
