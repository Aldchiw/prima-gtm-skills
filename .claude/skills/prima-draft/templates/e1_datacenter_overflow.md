# Template: E1 — Data Center OEM (overflow / capacity angle)
id: e1_datacenter_overflow
version: 1.1
status: ACTIVE — owner-approved (Aldahir)
verticals: Power & Electrical Distribution | Energy Storage
segment: Cat 4 OEM (Data Center equipment manufacturers)
angle: capacity_expansion (DC demand) -> overflow structural fabrication
tier scope: all Cat 4 tiers. P1 accounts require manual scope confirmation before draft (anti-TAM-burn gate, enforced by prima-draft) AND this template stays DRAFT until Gaby sign-off — no P1 send without both.
guardrails: inherited from Notion "Data Centers GTM" (source of truth) — not duplicated here

## Variables (filled by prima-draft from the account row — same `{{double_brace}}` syntax and
## field names as the seed templates, T-4B-plantpurchasing-v1 / T-4C-founder-v1, so prima-draft
## fills these the same way it already knows how to, no new substitution logic needed)
- {{account_name}} — as given upstream (`prima-icp-check`)
- {{account_name_short}} — commercial account name without legal suffixes or tickers; derived
  from `account_name` by trimming ", Inc.", ", LLC", ", Corp." and any "(NYSE: ...)".
- {{contact_name}} — contact's full name from the CSV; in the greeting use ONLY the first name.
- {{hook_fact}} — the E1 hook (`prima-hook`, `hook_rank = 1`) — this template is E1-only, so it
  always pulls rank 1, never rank 2/3. Must be `signal_type = capacity_expansion` for this template
  to be selected at all (see `templates/index.md`'s precedence rule).

## Subject
capacity for {{account_name_short}}

## Body
Hi {{contact_name}},

{{hook_fact}}

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]

## Fill rules
- Signal ALWAYS line 1 (the hook line itself opens the email — never preceded by a generic
  "I wanted to reach out" throat-clearer before it).
- `{{hook_fact}}` is a **factual, 1-line comment** — phrase it the way a person would casually
  mention it, not a press-release recitation, and never paraphrase it into a claim the source
  doesn't actually support.
  - **Prohibited inside `{{hook_fact}}`:** exact figures/numbers, exact dates, and flattery/hype
    adjectives ("serious ramp," "big step," "exciting," or equivalents). This restriction is
    specific to the hook line — it does not apply to the standing "10,000 tons/month" capacity
    claim later in the body, which is always stated exactly.
  - **Vary the opening phrase** across different accounts/drafts — rotate among "Saw you're...",
    "Noticed you...", "Came across your..." (or equivalent casual openers). Don't reuse the same
    opener as a stale formula every time.
- **Zero em-dashes (—) anywhere in the filled email** — subject and body both. Use periods or
  commas instead.
- `{{contact_name}}` en el saludo = solo el first name (ej. "Hi Stacy," no "Hi Stacy Ristvedt,").
- `{{account_name_short}}` = el nombre comercial de la cuenta sin sufijos legales ni tickers
  (ej. "ESS Tech", no "ESS Tech, Inc. (NYSE: GWH)"). Si el motor no puede derivarlo, usar
  `account_name` recortando ", Inc.", ", LLC", ", Corp." y cualquier "(NYSE: ...)".
- Never insert client names, certifications (UL/NEMA/ASME), or price/cost framing.
- If the account has no verified signal, do NOT generate — skip the row.
- Every output must pass prima-guardrail-audit before it leaves.

## Rendered example (Power & Electrical, P2)
Subject: capacity for Powell Industries

Hi [Contact Name],

Saw you're expanding switchgear and PDC output for data center power distribution.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]

## Changelog
- v1.3 — added intro line (name + AISC/AWS + US seller of record for AI infrastructure), fixed product set, backstop close.
- v1.2 — signal line rendered as a factual 1-line human comment (no figures, dates, or flattery); zero em-dashes; body expanded to 6 lines. Supersedes v1.1 for all new drafts.
- v1.1 — refocused on data centers; leaner style (4-line body); adopted "welded structural subassemblies" framing.
- v1.0 — initial angle: capacity_expansion -> overflow structural fabrication.
- 2026-07-21 (pre-use, version unchanged — never used in a real draft yet, so this doesn't violate
  the versioning rule): unified placeholder syntax to `{{double_brace}}` and the same field names the
  seed templates already use (`account_name`, `contact_name`, `hook_fact`, `prima_products`) instead
  of the original single-brace `{first_name}`/`{company}`/`{signal_line}` names, so `prima-draft`
  fills this template the same way it already knows how to — no risk of an unsubstituted placeholder
  leaking into a real email from a bracket-style mismatch.
