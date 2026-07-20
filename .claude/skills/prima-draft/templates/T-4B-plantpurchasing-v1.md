---
template_id: T-4B-plantpurchasing-v1
sub_segment: 4B
committee_role: Plant Purchasing Manager / Procurement Manager
signal_type_fit: capacity_expansion, job_opening, customs
status: seed-v1-unvalidated
created: 2026-07-20
notes: >
  Seed template, not yet reviewed by Gaby/Aldahir or backed by real reply data.
  4B contacts are tactical/operational buyers — tone is direct and ops-framed,
  not aspirational. Expect this to change once real replies come in.
---

Subject: {{hook_fact_short}}

Hi {{contact_name}},

I saw that {{hook_fact}} ({{hook_source_url}}). {{relevance_note}}

At Prima we manufacture [adjust per account's product line] under AISC/AWS certification, with
10,000 tons/month of installed capacity — built so material availability isn't the bottleneck when
your operation is scaling.

Would it make sense to grab 15 minutes to see if we could be a reliable backup supplier for your
fabrication needs?

Best,
[Signature]

---

## Fill-in notes for `prima-draft`

- `{{hook_fact}}` / `{{hook_source_url}}` / `{{relevance_note}}` come directly from the
  `prima-hook` row being used for this draft slot (E1/E2/E3) — never invent or embellish beyond
  what that row says.
- The bracketed product-line line and the AISC/AWS mention are **conditional** — only include a
  certification if it's actually relevant to the account's product line and validated (AISC/AWS
  only, per guardrails); drop the clause entirely rather than leave a placeholder-looking gap.
- 10,000 tons/month is a standing Prima capacity claim — include it as written, don't alter the
  number.
- No customer names, anywhere, ever.
