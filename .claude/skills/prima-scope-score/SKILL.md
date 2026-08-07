---
name: prima-scope-score
description: Given an account already classified by `prima-icp-check` and scanned by `prima-signal-scan`, estimates the probability that it actually subcontracts structural fabrication (steel/enclosures) rather than manufacturing 100% in-house — Notion's "Equipment Procurement Scope" criterion, which almost never has hard public data behind it. Outputs a 0-100 score + tier (`tier_1`/`tier_2`/`tier_3`), always with a traceable rationale citing the specific signals behind it — never a bare number. Two hard overrides dominate the weighted score: explicit "100% in-house/vertically integrated" evidence forces `disqualified_inhouse` regardless of everything else; a confirmed Import Genius import match forces `confirmed_outsources`. Also sets `needs_manual_scope_confirmation` for P1 accounts — a P1 never reaches `prima-draft` on tier alone. Cat4-only: `company_category = Cat3` accounts don't run through this scoring at all — they carry Notion's own curated `notion_scope` (`Fabrication Outsourcing Scope`) instead, since that's already human-confirmed, and come back unscored/`N/A-Cat3`. Use this after `prima-signal-scan` (needs its capacity-expansion freshness) and before `prima-committee`.

---

# prima-scope-score

Given an account's `prima-icp-check` classification (`sub_segment`, `priority`, product line) and its
`prima-signal-scan` output (specifically the `capacity_expansion` signal and its freshness), estimate
how likely the account is to subcontract structural fabrication — Notion's own "Equipment
Procurement Scope" qualification gate — when there's no hard, publicly confirmed answer.

## Why this exists

This gate turned out to be the least WebSearch-verifiable part of the whole ICP, and the one that
can't be inferred from the rest of the profile: during the first generator-mode run (2026-07-20),
**Enercon Engineering matched every other ICP criterion** — scale, product line, a real capacity
signal — and still turned out to be explicitly, confirmedly 100% in-house. A plain "confirmed /
not confirmed" flag left every new discovery stuck in "not confirmed" limbo with no way to
prioritize among them. This skill replaces that binary with a probability estimate, so candidates
can at least be ranked while the real confirmation (see `SPRINT2_GABY_REVIEW.md` for the standing
question of what source can actually confirm this) is still unresolved.

## Input

- From `prima-icp-check`: `company_category` (`Cat3`/`Cat4`/`UNKNOWN`) — check this first, see
  "Step 0" below — plus, for `Cat4` rows, `sub_segment`, `priority`, and the account's Category-4
  product line (Cooling / Power & Electrical Distribution / Energy Storage / Test & Commissioning).
- From `prima-signal-scan`: the account's `capacity_expansion` row (`status`, `freshness`), if any.
  Read this, don't recompute it — freshness bucketing is that skill's job, not this one's.
- Whatever else is on hand: job postings/named people evidence of a sourcing/procurement team
  (typically surfaced during the same research pass — see the "Visible sourcing/procurement team
  evidence" row in Step 2 for the matching rule), and Import Genius data if the user has provided
  it this session (same manual-input-only rule as `prima-signal-scan`'s customs source — never
  searched or fabricated).

## Step 0 — Cat4 gate: check `company_category` first

This skill is **Cat4-only**. Its entire weighted score is built on the Category-4 product-type
table in Step 2 — Power & Electrical Distribution / Energy Storage product categories — which has
no equivalent for `Cat3` (Modular DC Systems Manufacturers). `Cat3` accounts already carry a
human-confirmed answer to the same underlying question: Notion's own curated "Fabrication
Outsourcing Scope" field, surfaced by `prima-icp-check` as `notion_scope`. Estimating a probability
on top of a value a human already confirmed would be redundant at best and contradictory at worst.

- **`company_category = Cat3`**: do not compute anything — no overrides, no weighted score, no
  product-type lookup. Return the row as-is with `scope_tier = N/A-Cat3`, `outsourcing_score`
  blank, `needs_manual_scope_confirmation` blank, and `score_rationale` pointing to the existing
  `notion_scope` value (e.g. "Cat3 — not scored, see notion_scope: '<verbatim Notion text>'").
- **`company_category = Cat4`**: proceed to Step 1 as normal.
- **`company_category = UNKNOWN`**: `prima-icp-check` should have already marked this out of scope
  before it reaches this skill — if one arrives anyway, treat it like `Cat3` above (return
  unscored, `scope_tier = N/A-Cat3` doesn't fit here, so use `scope_tier` blank with
  `score_rationale = "company_category UNKNOWN — not classified, cannot score"`) rather than
  guessing a product-type fit.

## Step 1 — check the two hard overrides first

These dominate the weighted score entirely. Check both before computing anything else.

| Override | Trigger | Result |
|---|---|---|
| **Negative — confirmed in-house** | Explicit, verifiable evidence the account is 100% in-house / vertically integrated (e.g. the company's own site states it directly, like Enercon's) | `scope_tier = disqualified_inhouse`, `outsourcing_score` forced to ≤10%. Stop — don't compute the weighted score, it doesn't matter. |
| **Positive — confirmed import** | Import Genius confirms the account already imports fabricated components (steel/enclosures) | `scope_tier = confirmed_outsources`, `outsourcing_score` forced to ~90%+. Stop — same reason. |

Both require **real, citable evidence** — a company's own vocabulary ("we prefer to keep fabrication
in-house") or an actual Import Genius record. Never trigger either override on a guess or a "seems
likely" read.

## Step 2 — if neither override fires, compute the weighted score (provisional weights)

| Signal | Max weight | Scoring rule |
|---|---|---|
| **Product type** | 45 | `45` — product line is a category the industry commonly outsources structural fabrication for (see table below) · `20` — mixed/unclear · `0` — typically kept in-house (precision electronics, PCBAs, control panels, semiconductor-level components — same pattern Notion already uses to call Legrand/Watlow "Weak") |
| **Capacity expansion / production pressure** | 35 | `35` — `capacity_expansion` signal is `fresh` (≤90 days) · `25` — `recent` (90 days–12 months) · `10` — `stale` (>12 months) but on record · `0` — no capacity/growth signal found |
| **Visible sourcing/procurement team evidence** | 20 | `20` — a named person or an active job posting whose role performs the sourcing/commodity/supply-chain function tied to external fabrication sourcing · `8` — generic/weak evidence (e.g. a real but unscoped "Buyer" posting) · `0` — nothing found |

Weights sum to 100. Product type carries the most weight because it's the most stable predictor (a
company's manufacturing model rarely changes); capacity expansion is a timing/pressure signal;
sourcing-team evidence is deliberately the weakest signal — it's easy to find and easy to over-read.

**Match by function, not by literal string.** Apply `prima-committee`'s [**function-match
rule**](../prima-committee/SKILL.md#title-matching-function-not-exact-string) here: a title or
posting counts toward this signal if it performs the sourcing/commodity/supply-chain function, even
when the exact wording isn't one of committee's listed examples ("Buyer II," "Category Manager,
Indirect Procurement," "Commodity Manager," "Purchasing Director," "Supply Chain Lead," etc. all
count). `prima-signal-scan` already hit this exact false negative once — a hardcoded, generic title
list ("Sourcing Manager, Commodity Manager, Supply Chain Manager, Manufacturing Engineer") returned
zero results against a real account whose actual open req was "Procurement Manager" — before it was
fixed to defer to committee's dictionary and function-match rule instead of keeping its own copy.
Don't repeat that mistake here: don't score this row against a fixed title list of its own.

### Product-type reference table (provisional, Power & Electrical Distribution / Energy Storage only)

**Not portable to other verticals** — Manu would need his own version of this table for
Cooling & Thermal Management / Test & Commissioning; don't reuse these categories there.

| Score | Product categories |
|---|---|
| 45 (typically outsourced) | Transformers (power/distribution/mobile), switchgear/switchboards/PDUs/PDCs, generator sets and enclosures, e-houses/power modules/modular power skids, thermal battery/BESS containment vessels and TES tanks, substation structural supports |
| 20 (mixed/unclear) | Integrated battery pack/BESS system manufacturers where the enclosure-vs-cell/pack boundary isn't publicly clear; companies doing final system assembly/integration with no public signal on which parts are outsourced |
| 0 (typically in-house) | Precision electronics, PCBAs, control/automation panels only, semiconductor-level components, busway/rack PDUs/cable management (light metalwork) |

## Step 3 — tier cutoffs (provisional)

| Tier | Score | Meaning |
|---|---|---|
| `tier_1` | ≥ 65% | High probability |
| `tier_2` | 35–64% | Medium probability |
| `tier_3` | < 35% | Low probability |

`tier_1` is deliberately hard to reach on the weighted score alone — a company would need to score
well on product type (45) plus a real, fresh capacity signal (35) to clear 65 without sourcing-team
evidence. That's intentional: `tier_1` should mean something, not be a default outcome. Cutoffs are
provisional pending real data — expect them to hold as-is until enough scored accounts accumulate to
show whether they're miscalibrated.

## Step 4 — the anti-burn rule (hard, not negotiable)

The tier **prioritizes** (who to work first) — it never **authorizes** skipping human confirmation
for high-value accounts.

- **`priority = P1`**: set `needs_manual_scope_confirmation = TRUE` whenever `scope_tier` is
  `tier_1`, `tier_2`, or `tier_3` (i.e. anything short of `confirmed_outsources`). The actual block
  lives in `prima-draft`'s dependency table — a P1 account with `needs_manual_scope_confirmation =
  TRUE` gets `NO_DRAFT` until a human confirms scope directly. `prima-committee` / `prima-hook` /
  `prima-email-waterfall` can still run on it — they prepare material, only `prima-draft` waits.
- **`priority = P2` or `P3`**: `needs_manual_scope_confirmation = FALSE`, always. The tier decides on
  its own — this is deliberately where lower-stakes experimentation is allowed.
- **`disqualified_inhouse` blocks every priority**, no exceptions — the negative override outranks
  the P1/P2/P3 distinction entirely, same as it outranks the weighted score.

## Output schema

| Column | Values |
|---|---|
| `outsourcing_score` | `0`–`100`, blank when `scope_tier = N/A-Cat3` (see Step 0 — not scored, not "scored zero") |
| `scope_tier` | `confirmed_outsources` \| `tier_1` \| `tier_2` \| `tier_3` \| `disqualified_inhouse` \| `N/A-Cat3` (Step 0 gate — `Cat4`-only skill, `Cat3` rows aren't scored, see `notion_scope` instead) |
| `score_rationale` | one line citing every contributing factor concretely — e.g. "Tier 2 (63%): fresh capacity expansion (+35, ≤90d) + mixed product type (+20) + weak sourcing evidence (+8, real but unscoped 'Buyer II' posting); no Import Genius signal; no hard in-house evidence." For `N/A-Cat3`: "Cat3 — not scored, see notion_scope: '<verbatim Notion text>'". Never output a bare score with no rationale. |
| `needs_manual_scope_confirmation` | `TRUE`/`FALSE`/blank (blank when `scope_tier` is `disqualified_inhouse` or `N/A-Cat3` — already blocked/out-of-scope for a different, terminal reason, this flag no longer applies) |

## Output format

CSV (or printed inline for a short list), written back to a file next to the input unless the user
asks for something else. Keep account order stable and matching `prima-signal-scan`'s output.
