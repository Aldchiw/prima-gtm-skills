# prima-draft — template library

Lives under `prima-draft` in the `prima-gtm-skills` repo. This file holds the
reusable email/LinkedIn skeletons for the Data Centers outbound motion
(Aldahir's verticals: Power & Electrical, Energy Storage).

- Content guardrails source of truth = Notion "Data Centers GTM". This file
  is NOT the guardrail authority; it's the template library + a quick-reference
  of approved/prohibited phrasing so `prima-guardrail-audit` and the operator
  have it in one place.
- Placeholders: `{first_name}` `{company}` `{signal}` `{signal-context}`
  `{plant}` `{ramp}` `{anchor_product}` `{timeline}` `{sign-off}`.
- Every template is a SKELETON with placeholders — never a pre-filled, single-use
  email. `prima-draft` fills placeholders per lead.
- Templates are owner-approved (Aldahir owns template selection/approval).
  Calibrate freely; bump the version when the body changes.

---

## Cadence (official)

`E1 → +2d LinkedIn → +5d E2 → +12d E3 (breakup) → 90-day cooldown`

Anti-TAM-burn: unvalidated angles run on P2/P3 first, never on P1 accounts
(Powell, Delta Star, Trystar, Hammond, Mainspring).

---

## Approved angle bank (safe to use)

- AISC/AWS-certified steel fabricator (VALIDATED — cleared for cold use)
- US seller of record / zero customs friction / domestic invoicing
- Built to your drawings / engineered-to-order
- Welded structural subassemblies: enclosures, power skids, welded frames,
  Division 5 structural steel
- 10,000 tons/month of capacity (official figure)
- Overflow absorption — take the surge without you re-tooling
- Move fast on quoting (speed, never price)

## Prohibited / to-validate (audit blockers)

- NO client names — Crusoe NOT authorized. Also avoid implied-client claims
  ("we manufacture for the biggest operators") — reads as a name-drop.
- NO UL 142 / UL 2200 / NEMA / ASME claims unless separately validated.
  (AISC/AWS is the ONLY cert cleared so far.)
- NO price / "cheaper" / cost framing — narrative is reliable supply, not cheap.
- NO AI smell — must read like careful human writing.
- Max 2 contacts per account (3 counting LinkedIn).

---

## E1 — `e1_datacenter_overflow` · v1.2 · status: ACTIVE (owner-approved)

Signal-first, lean. Overflow / capacity angle.

```
Subject: capacity for {company}'s {signal-context}

Hi {first_name},

{Signal, line 1 — "Saw {company} is expanding the {plant} / hiring
plant-purchasing / closed your Series C."}

Prima is an AISC/AWS-certified steel fabricator and US seller of record.
We build {anchor_product} to your drawings — Division 5 structural steel and
high-mix welded subassemblies — at 10,000 tons/month, delivered with zero
customs friction.

If your {ramp} is outrunning your own fab, we can absorb the overflow on
{anchor_product} without you re-tooling, and we move fast on quoting.

Worth 15 min to see if we fit your {timeline}?

{sign-off}
```

Notes: `{anchor_product}` comes from the account's anchor (prima-hook if there's
a signal, prima-icp-check Eje 3 if fit-only). Body ~6 lines.

---

## E2 — `e2_customs_followup` · v1.0 · status: DRAFT (calibrate)

Sent +5d. NOT a re-thread of the same pitch — a fresh, single angle
(US-seller-of-record / customs). Short.

```
Subject: re: capacity for {company}

Hi {first_name},

Quick follow-up — one thing I didn't mention: as US seller of record, you get
domestic invoicing and no import friction on the {anchor_product}, even though
it's built in our Mexico facility.

If customs lead times factor into your {timeline}, that's usually where we take
the most risk off a team's plate.

Still worth a quick look?

{sign-off}
```

---

## E3 — `e3_breakup` · v1.0 · status: DRAFT (calibrate)

Sent +12d. Breakup — clean, no pressure, leaves the door open.

```
Subject: closing the loop, {first_name}

Hi {first_name},

I'll close the loop here so I'm not cluttering your inbox. If {anchor_product}
capacity or customs-clean delivery becomes a priority down the line, we run
10,000 tons/month and can move fast — happy to pick it up then.

Wishing you a smooth {ramp}.

{sign-off}
```

---

## LinkedIn — `li_touch` · v1.0 · status: DRAFT (calibrate)

Sent +2d after E1. Short. Fits a connection note (<300 chars) or a DM.

```
Hi {first_name} — reached out by email re: {signal}. Prima's an AISC/AWS-certified
US fabricator building {anchor_product} to spec, 10k tons/mo capacity. Thought it
might be relevant to {company}'s {signal-context}. Open to connecting.
```
