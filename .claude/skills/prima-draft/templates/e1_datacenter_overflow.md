# Template: E1 — Data Center OEM (overflow / capacity angle)
id: e1_datacenter_overflow
version: 1.1
status: DRAFT — pending Gaby sign-off (do NOT send until approved)
verticals: Power & Electrical Distribution | Energy Storage
segment: Cat 4 OEM (Data Center equipment manufacturers)
angle: capacity_expansion (DC demand) -> overflow structural fabrication
tier scope: all Cat 4 tiers. P1 accounts require manual scope confirmation before draft (anti-TAM-burn gate, enforced by prima-draft) AND this template stays DRAFT until Gaby sign-off — no P1 send without both.
guardrails: inherited from Notion "Data Centers GTM" (source of truth) — not duplicated here

## Variables (filled by prima-draft from the account row — same `{{double_brace}}` syntax and
## field names as the seed templates, T-4B-plantpurchasing-v1 / T-4C-founder-v1, so prima-draft
## fills these the same way it already knows how to, no new substitution logic needed)
- {{account_name}} — as given upstream (`prima-icp-check`)
- {{contact_name}} — as given by `prima-committee` (full name, same as the seed templates use)
- {{hook_fact}} — the E1 hook (`prima-hook`, `hook_rank = 1`) — this template is E1-only, so it
  always pulls rank 1, never rank 2/3. Must be `signal_type = capacity_expansion` for this template
  to be selected at all (see `templates/index.md`'s precedence rule).
- {{prima_products}} — 2-3 structural components for this vertical, looked up from the product map
  below by the account's Category-4 product line (`prima-icp-check`'s output) — this one is computed
  by `prima-draft` itself, not a raw pass-through field from any single upstream skill.

## Product map (by vertical)
- Power & Electrical: frames, skids, tanks, enclosures, switchgear cabinets, e-houses, fuel tanks
- Energy Storage:     TES & buffer tanks, containment vessels, battery casings, piping & manifolds

## Subject
Steel fabrication overflow for {{account_name}}

## Body
Hi {{contact_name}},
{{hook_fact}}
We're a steel fabricator in Mexico — welded structural subassemblies ({{prima_products}}) for US data center equipment OEMs absorbing that kind of demand overflow.
Built to your drawings, 10,000 tons/month of capacity — reliable added capacity when your own shop is maxed out.
Worth sending a one-pager and grabbing 15 minutes?

## Fill rules
- Signal ALWAYS line 1 (never a generic "I came across you" opener).
- `{{hook_fact}}` goes in as the verified fact from `prima-hook` — phrase it as a compact single
  clause (see Rendered example) rather than the seed templates' fact-plus-citation-plus-relevance
  structure, but never paraphrase it into a claim the source doesn't actually support.
- Never insert client names, certifications (UL/NEMA/ASME), or price/cost framing.
- If the account has no verified signal, do NOT generate — skip the row.
- Every output must pass prima-guardrail-audit before it leaves.

## Rendered example (Power & Electrical, P2)
Subject: Steel fabrication overflow for Powell Industries
Hi [Contact Name],
Saw Powell is expanding switchgear and PDC output for data center power distribution.
We're a steel fabricator in Mexico — welded structural subassemblies (frames, skids, enclosures) for US data center equipment OEMs absorbing that kind of demand overflow.
Built to your drawings, 10,000 tons/month of capacity — reliable added capacity when your own shop is maxed out.
Worth sending a one-pager and grabbing 15 minutes?

## Changelog
- v1.1 — refocused on data centers; leaner style (4-line body); adopted "welded structural subassemblies" framing.
- v1.0 — initial angle: capacity_expansion -> overflow structural fabrication.
- 2026-07-21 (pre-use, version unchanged — never used in a real draft yet, so this doesn't violate
  the versioning rule): unified placeholder syntax to `{{double_brace}}` and the same field names the
  seed templates already use (`account_name`, `contact_name`, `hook_fact`, `prima_products`) instead
  of the original single-brace `{first_name}`/`{company}`/`{signal_line}` names, so `prima-draft`
  fills this template the same way it already knows how to — no risk of an unsubstituted placeholder
  leaking into a real email from a bracket-style mismatch.
- OPEN ITEMS for Gaby (still open, not resolved by the syntax fix above): (1) body is 4 lines vs
  6-8 guardrail — approve relaxing count; (2) "reliable added capacity" is a borderline claim —
  approve as-is or soften.
