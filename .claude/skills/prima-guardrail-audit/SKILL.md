---
name: prima-guardrail-audit
description: Final auditor for Data Centers outbound emails — checks a draft (or an E1/E2/E3 batch from `prima-draft`) against Prima's full message guardrail list and returns PASS/FAIL per email, with BLOCKERS and WARNINGS cited line-by-line. Runs unconditionally before any email goes out — no exceptions. Pure auditor: never rewrites or suggests corrected copy, that's `prima-draft`'s job. Use this whenever a draft (or batch of drafts) needs to be checked before sending, even if the user doesn't say "audit" explicitly, e.g. "revisa este draft", "¿esto pasa guardrails?", "prepara esto para enviar".
---

# prima-guardrail-audit

Audit an email draft against Prima's Data Centers message guardrails. Runs after `prima-draft`
produces E1/E2/E3 and before anything is sent — no draft skips this gate.

## Source of truth — read before auditing anything

Unlike `prima-icp-check`'s Category/Priority/Disqualify criteria or `prima-signal-scan`'s sources,
**these guardrails are not formalized in Notion yet.** Aldahir confirmed this directly on
2026-07-19: they don't live in "Data Centers GTM" or any other Notion page today (a search of the
whole workspace for "guardrail"/"message guardrails" turned up nothing current). The list in this
file **is** the source of truth for this skill until Notion formalizes it — do not go looking for
it live, and do not treat that as a gap to fill with judgment. If Notion is later updated with a
formal guardrail section, reconciling this file with that page is a deliberate follow-up, not
something to infer mid-run.

**Resolved discrepancy, for the record:** Notion's ICP text mentions "+5,000 tons/month" of excess
capacity — that's a different, stale, or otherwise unrelated figure. The number this audit enforces
is **10,000 tons/month**, a closed decision by Daniel and Gaby already reflected in Prima's approved
templates. Any other capacity figure in a draft is a hard violation (see Blockers).

## What this skill is not

This is a **pure auditor**. It cites violations — it never rewrites copy, never suggests
replacement phrasing, and never softens a verdict because the fix seems obvious. Producing corrected
copy is `prima-draft`'s job; blurring the two defeats the point of having a separate, unconditional
gate. If you catch yourself drafting alternate wording while auditing, stop — that's out of scope.

## The guardrail list

### Blockers (hard violations — any one of these forces `FAIL`)

| # | Blocker | Detail |
|---|---|---|
| B1 | Wrong capacity figure | Any capacity claim other than **10,000 tons/month**. |
| B2 | Unvalidated certification | Any certification claimed as Prima's own other than **AISC** or **AWS** (e.g. AWS D1.1). Claims of UL 142, UL 2200, NEMA, ASME, ISO, etc. as Prima's own = violation. Mentioning AISC/AWS is fine. |
| B3 | Customer name-drop | Any real Prima customer named as a reference (e.g. "we work with Crusoe"). The allowlist of customers with written permission to be named is **empty today** — every name-drop is a blocker until that changes. Naming the *prospect's own company* or citing public facts about their industry is **not** a name-drop and is fine. |
| B4 | Price/savings as the hook | "Cheap" / "lowest price" / "20–25% savings" (or equivalent) appears in the first line or functions as the central argument. The narrative must be "reliable supply," not "we're cheap." |

**Any single Blocker hit → `VERDICT: FAIL`.**

### Warnings (soft/borderline — listed, but don't force FAIL on their own)

| # | Warning | Detail |
|---|---|---|
| W1 | Length | Outside 6–8 lines. |
| W2 | Signal not first | The verifiable signal/hook isn't in the first line. |
| W3 | AI-sounding language | One or more hits on the checklist below. |
| W4 | Narrative drift | Draft drifts from the "reliable supply" narrative. |
| W5 | Price subordinate | Cost/savings appears, but as a secondary point subordinate to the reliable-supply narrative (allowed — but always flag as a Warning so a human reviews it; Gaby's default is to dial the savings angle down, so when in doubt, flag). |
| W6 | Too many contacts | More than 2 contacts targeted per account, when that info is present in the input. |
| W7 | Weak/absent CTA | Call to action is vague or missing. |

**Warnings never force `FAIL` by themselves** — they're for human judgment.

### W3 detail — AI-sounding language checklist

Apply mechanically; every hit is logged, multiple hits mean the draft probably reads as AI-written
(cite the heuristic: *"does this sound like a busy salesperson who did their homework, or an AI
copywriter?"*):

- **Template phrases**: "I hope this email finds you well", "I wanted to reach out", "I came across
  your company", "In today's fast-paced world", "I'll cut to the chase".
- **Corporate-AI vocabulary**: leverage, streamline, seamless, cutting-edge, revolutionize, delve,
  synergies, robust, elevate, unlock, empower, tailored, bespoke.
- **Structure tells**: perfectly parallel triads, every sentence the same length, more than one
  em-dash (—) in the email.
- **Generic flattery**: "impressive work", "huge fan", "love what you're doing".
- **Adjective overload**.

## Input

One draft, or a batch of drafts (E1/E2/E3) as produced by `prima-draft` for a given contact. Each
email in a batch is audited **independently** — a batch never gets one combined verdict.

## Process

For each draft in the input:

1. Check every Blocker (B1–B4). Any hit → note it with the exact offending line quoted, and the
   Blocker it violates.
2. Check every Warning (W1–W7), same treatment — quote the line (or note the structural/length
   issue when there's no single line to quote), and the Warning it violates.
3. Set `VERDICT`: `FAIL` if any Blocker hit, otherwise `PASS` (Warnings alone never fail a draft).
4. Do not propose corrected text. Do not soften a Blocker into a Warning because the intent seemed
   fine — the rule is mechanical, not a judgment call on the sender's intent.

## Output format

For each draft, in order:

```
Draft: [identifier, e.g. E1 / E2 / E3 / contact name]
VERDICT: PASS | FAIL
BLOCKERS:
- [rule ID] "[exact offending line]" — [one-line reason]
(or "None")
WARNINGS:
- [rule ID] "[exact offending line or issue description]" — [one-line reason]
(or "None")
```

Keep one block per draft, in the order the drafts were given. Don't summarize across the batch —
if the user wants a rollup (e.g. "2 of 3 passed"), that's a quick read of the individual verdicts,
not a separate synthesized column.
