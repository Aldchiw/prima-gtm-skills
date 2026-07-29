---
template_id: T-4C-founder-v2
sub_segment: 4C
committee_role:
  - Founder / CEO
  - VP Engineering / Head of Manufacturing
signal_type_fit: funding, job_opening, capacity_expansion, customs
status: active-v2
created: 2026-07-20
notes: >
  Seed template, not yet reviewed by Gaby/Aldahir or backed by real reply data.
  4C contacts are founders/execs at scale-ups — tone is peer-to-peer and framed
  around scaling pressure, not a vendor pitch. Expect this to change once real
  replies come in.
---

Subject: capacity for {{account_name_short}}

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

---

## Fill-in notes for `prima-draft`

- Signal ALWAYS line 1 (the hook line itself opens the email — never preceded by a generic
  throat-clearer before it).
- `{{hook_fact}}` is a **factual, human comment** — phrased the way a person would casually
  mention it, not a press-release recitation, and never paraphrased into a claim the source
  doesn't actually support. Unlike the E1 template, it **may end with a short bridge** to why
  it matters for a scaling operation (e.g., "..., so the timing might line up").
  - **Prohibited inside `{{hook_fact}}`:** exact figures/numbers, exact dates, and flattery/hype
    adjectives ("serious ramp," "big step," "exciting," or equivalents).
  - **Vary the opening phrase** across different accounts/drafts — rotate among "Saw you're...",
    "Noticed you...", "Came across your..." (or equivalent casual openers).
- **Zero em-dashes (—) anywhere in the filled email** — subject and body both. Use periods or
  commas instead.
- `{{contact_name}}` en el saludo = solo el first name (ej. "Hi Stacy," no "Hi Stacy Ristvedt,").
- `{{account_name_short}}` = el nombre comercial de la cuenta sin sufijos legales ni tickers
  (ej. "ESS Tech", no "ESS Tech, Inc. (NYSE: GWH)"). Si el motor no puede derivarlo, usar
  `account_name` recortando ", Inc.", ", LLC", ", Corp." y cualquier "(NYSE: ...)".
- AISC/AWS is already fixed in the body's intro line — no separate conditional mention needed.
- No customer names, anywhere, ever. A founder-led account is exactly where the temptation to
  name-drop a recognizable customer is strongest — resist it just the same.
- No price/cost framing.
- If the account has no verified signal, do NOT generate — skip the row.
- Every output must pass prima-guardrail-audit before it leaves.

## Changelog
- v2 — aligned body with E1 v1.3 (intro + backstop close); fixed broken subject placeholder;
  humanized hook with short bridge; removed em-dashes and price framing.
