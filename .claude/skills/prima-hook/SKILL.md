---
name: prima-hook
description: Given an account's already-verified signals from `prima-signal-scan`, extracts up to 3 ranked, specific, sourced (URL-backed) facts to open the email with — the first-line hook. Signal-first by design — never searches for a new signal of its own; only reads deeper into the source URL signal-scan already verified to pull out the exact figure/date/name that makes the opener specific. Never invents a claim. Returns raw verified facts + source, not email prose — `prima-draft` owns tone/guardrails and writes the actual line. If signal-scan came back NO_SIGNAL on everything, returns an explicit `NO_HOOK` status rather than inventing one. Use this after `prima-signal-scan` and before `prima-draft` needs opening material.
---

# prima-hook

Given an account plus its `prima-signal-scan` output, extract up to 3 ranked, verifiable,
URL-backed facts to hand to `prima-draft` as first-line hook material.

## Signal-first — this skill does not search for new signals

`prima-hook` never runs its own discovery pass over the account's site/news. It only works with
signals `prima-signal-scan` already verified, dated, and sourced. This keeps the pipeline
consistent: an account gets written to for the same signal that qualified it as worth writing to,
not a different fact discovered independently downstream.

**Nuance:** `prima-hook` *can* go read further into the `source_url` signal-scan already verified
— e.g. open the press release signal-scan cited to pull the exact square footage, plant name, or
announcement date that makes a good opener specific. That's reading deeper into an already-verified
source, not sourcing a new one. It never fetches a different URL/source that signal-scan didn't
already cite.

## Input

An account's full row set from `prima-signal-scan`: every `signal_type` row (`status`,
`signal_summary`, `signal_date`, `freshness`, `source_url`) plus the account-level rollup.

## Building the candidate list

Gather eligible `SIGNAL_FOUND` rows for the account, applying these exclusions before ranking:

| Exclusion | Reason |
|---|---|
| `target_title` rows | Boolean "does this role exist" signal for `prima-committee`, not a specific fact — never a hook |
| `grant` rows explicitly flagged frozen/stalled/paused | signal-scan already marked these "not usable as a hook" — respect that flag, don't override it |
| `job_opening` rows at `recent` or `stale` freshness | signal-scan's own table marks `recent` as "weak — context, not a hook" and `stale` as "No" — only `fresh` job openings are hook-eligible |
| `funding` rows older than the `fresh` window (>90 days) | signal-scan already treats these as context-only (`recent`) or drops them from output entirely (>12 months) — don't hook on stale funding |

Everything else that survived signal-scan's verification (`capacity_expansion` at any freshness,
`fresh` `funding`, non-frozen `grant`, `fresh` `job_opening`, and `customs`) is eligible.

## Ranking

Rank eligible candidates by specificity + recency + relevance to Prima's pitch, honoring
signal-scan's own override: **a `customs` signal, when present, ranks first** — same rule
signal-scan uses for its rollup, since it's the strongest signal in the system (existing
Mexico-to-US nearshoring precedent).

Take up to 3. **This is a ceiling, not a quota** — if only 1 (or 2) eligible candidates exist,
return that many. Never invent a second or third hook to round out the count; one strong hook beats
one strong hook plus two padded weak ones.

For each candidate, write one line explaining why it ranked where it did (e.g. "customs signal
outranks per standing rule" / "more recent and more specific than #2" / "only other eligible
signal").

## Output schema

| Column | Values |
|---|---|
| `domain` | the account domain |
| `account_name` | as given upstream |
| `hook_rank` | `1` \| `2` \| `3` |
| `hook_fact` | the specific, dated, verified fact (e.g. "Opened a 200k sq ft plant in Guadalajara, announced 2026-05-02") — as concrete as the source allows |
| `source_url` | the exact URL — inherited from signal-scan, possibly the specific page/paragraph read deeper for detail |
| `signal_type` | inherited from signal-scan's vocabulary: `job_opening` \| `capacity_expansion` \| `funding` \| `grant` \| `customs` (never `target_title`) |
| `relevance_note` | half-line on why this matters for Prima (e.g. "new capacity = likely need for structural/enclosure fabrication") — gives `prima-draft` the angle, not the phrasing |
| `rank_reason` | one line on why this hook ranked where it did |
| `status` | `HOOK_FOUND` \| `NO_HOOK` |

When `status = NO_HOOK` (signal-scan came back `NO_SIGNAL` on every eligible source, or every
`SIGNAL_FOUND` row was excluded per the table above), emit exactly one row for the account with all
other columns blank except a note: "sin señal verificada; la cuenta no está lista para outreach
hasta que signal-scan encuentre algo." This is distinct from signal-scan's own `NOT_CHECKED` — that
means a source couldn't be reached; `NO_HOOK` means everything was checked and nothing hookable
turned up.

## What this skill does not do

No email prose, no tone, no guardrails — `prima-draft` is the only owner of Prima's voice and
message rules. `prima-hook` hands over the raw fact, its source, and the angle; it never writes the
line that goes in the email.

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. One block of 1-3 `HOOK_FOUND` rows (or a single `NO_HOOK` row) per account.
