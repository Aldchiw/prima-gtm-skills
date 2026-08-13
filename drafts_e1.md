# Drafts E1 — correct template routing per templates/index.md

Generado localmente desde `leads_final.csv` + `accounts_processed.csv` (sin Tier 0, sin
email-waterfall, sin llamadas a Deepline/ai_ark). Las 19 cuentas son P1 con
`needs_manual_scope_confirmation = TRUE`, destrabadas por **override manual de scope
autorizado por Aldahir (2026-07-28)** — decisión de negocio del operador, no un resultado
automático de `prima-scope-score`. Sparkstone Electrical Group es P2 (no requiere override).

**Ruteo de template corregido esta corrida:** 13 cuentas con `signal_type = capacity_expansion`
usan `e1_datacenter_overflow` (v1.3). Las 6 cuentas con `signal_type = funding` (Ayr Energy, CORE
Transformers, Nostromo Energy, EnerVenue, Electrified Thermal Solutions, Redwood Materials) usan
`T-4C-founder-v2`, per la regla de precedencia de `templates/index.md` (E1 solo usa
`e1_datacenter_overflow` cuando el signal_type es exactamente `capacity_expansion`; si no, cae a
la tabla normal por sub_segment — las 6 son 4C). Ambos templates comparten el mismo Body (v1.3 /
v2), así que el texto final es idéntico salvo por el `template_id` registrado y que
`T-4C-founder-v2` permite un puente corto al final del hook.

Todos los `draft_status: BORRADOR`. Nada enviado, nada programado, nada comiteado.

---

## 1. ESS Tech, Inc. (NYSE: GWH)

- **contact_name:** Stacy Ristvedt
- **contact_email:** stacy.ristvedt@essinc.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for ESS Tech

**Body:**
```
Hi Stacy,

Saw you're launching Bridge, a modular sodium-ion battery system built for AI data centers.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 2. Form Energy

- **contact_name:** Alex Mannion
- **contact_email:** amannion@formenergy.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Form Energy

**Body:**
```
Hi Alex,

Noticed Google is backing your iron-air battery system for a new data center in Minnesota.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None (Google es un hecho público del negocio del prospecto, no un name-drop de cliente de Prima — permitido por B3) · WARNINGS: None

---

## 3. Industrial Electric Mfg. (IEM)

- **contact_name:** Baljit Stocks
- **contact_email:** baljit.reyat@iemfg.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Industrial Electric Mfg.

**Body:**
```
Hi Baljit,

Came across your plans for a new switchgear and PDU plant in San Antonio.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 4. INNIO

- **contact_name:** Martin Ruetz
- **contact_email:** martin.ruetz@innio.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for INNIO

**Body:**
```
Hi Martin,

Saw you're standing up new containerized power centers built for data center deployment.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 5. PCX Corporation

- **contact_name:** James Vinson
- **contact_email:** vinson@pcxcorp.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for PCX Corporation

**Body:**
```
Hi James,

Noticed you opened a new facility in Knightdale for data center electrical skids and enclosures.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 6. Sparkstone Electrical Group (SEG)

- **contact_name:** Miguel Angel Garcia
- **contact_email:** miguel.garcia@sparkstone.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Sparkstone Electrical Group

**Body:**
```
Hi Miguel,

Came across how Sparkstone brought several switchgear and panelboard manufacturers together under one data-center-focused platform.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 7. Eos Energy Enterprises

- **contact_name:** Will Nauman
- **contact_email:** wnauman@eose.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Eos Energy Enterprises

**Body:**
```
Hi Will,

Saw you're standing up a new zinc-battery production line at your Thorn Hill plant.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 8. EPC Power

- **contact_name:** Matt Leneway
- **contact_email:** matt.leneway@epcpower.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for EPC Power

**Body:**
```
Hi Matt,

Noticed you opened a new South Carolina plant to add power-conversion capacity for AI data centers.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 9. Moment Energy

- **contact_name:** Nawaf Parkar
- **contact_email:** nawaf@momentenergy.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Moment Energy

**Body:**
```
Hi Nawaf,

Came across Megafactory 1 in Vancouver, your new plant for repurposing 2nd-life EV batteries.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 10. Prolec GE

- **contact_name:** Brianna Effinger
- **contact_email:** brianna.effinger@prolec.energy
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Prolec GE

**Body:**
```
Hi Brianna,

Saw you're expanding transformer production at your Goldsboro plant.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 11. Giga Energy

- **contact_name:** Pratik Chavda
- **contact_email:** pratik@gigaenergy.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Giga Energy

**Body:**
```
Hi Pratik,

Noticed you opened a new medium-voltage transformer plant in Houston.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 12. Pennsylvania Transformer Technology (PTT)

- **contact_name:** Jigar Shah
- **contact_email:** jshah@patransformer.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for Pennsylvania Transformer Technology

**Body:**
```
Hi Jigar,

Came across your new pad-mounted transformer facility going up in Hoke County.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 13. Ayr Energy

- **contact_name:** Wasi Mohd
- **contact_email:** wasi@ayr.energy
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for Ayr Energy

**Body:**
```
Hi Wasi,

Saw you came out of stealth with contracted orders for power transformers and MV switchgear, so the timing might line up as you scale production.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 14. CORE Transformers

- **contact_name:** Richard Raulstone
- **contact_email:** richard@coretransformers.com
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for CORE Transformers

**Body:**
```
Hi Richard,

Noticed Emerald Lake Capital invested in CORE Transformers to build out a North American transformer platform, so the timing might line up as you ramp up.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None (Emerald Lake Capital es el inversionista público del prospecto, no un cliente de Prima — permitido por B3) · WARNINGS: None

---

## 15. CEL Critical Power

- **contact_name:** Thiago Angioletti
- **contact_email:** thiago.angioletti@cel-criticalpower.com
- **template_id:** e1_datacenter_overflow (v1.3)
- **draft_status:** BORRADOR

**Subject:** capacity for CEL Critical Power

**Body:**
```
Hi Thiago,

Came across your first US manufacturing facility in Williamsburg, producing PDUs and switchgear for data centers.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 16. Nostromo Energy

- **contact_name:** Doug Poffinbarger
- **contact_email:** doug.p@nostromo.energy
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for Nostromo Energy

**Body:**
```
Hi Doug,

Saw the DOE backed your IceBrick thermal energy storage system with a loan commitment, so the timing might line up as you scale manufacturing.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None (DOE es una entidad pública mencionada como hecho del negocio del prospecto, no un cliente de Prima — permitido por B3) · WARNINGS: None

---

## 17. EnerVenue

- **contact_name:** Santhosh Medeti
- **contact_email:** santhosh.medeti@enervenue.com
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for EnerVenue

**Body:**
```
Hi Santhosh,

Noticed you're scaling nickel-hydrogen battery manufacturing with a new plant in Shelby County, Kentucky, so the timing might line up.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 18. Electrified Thermal Solutions

- **contact_name:** Tom Holmes
- **contact_email:** tom.holmes@electrifiedthermal.com
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for Electrified Thermal Solutions

**Body:**
```
Hi Tom,

Came across your new E-Brick thermal battery production facility in Medford, so the timing might line up as you ramp up.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## 19. Redwood Materials

- **contact_name:** Touch Reth
- **contact_email:** touch@redwoodmaterials.com
- **template_id:** T-4C-founder-v2
- **draft_status:** BORRADOR

**Subject:** capacity for Redwood Materials

**Body:**
```
Hi Touch,

Saw your Redwood Energy division building US-made energy storage systems for AI data centers, so the timing might line up as you scale.

I'm [Signature name] at Prima, an AISC/AWS-certified steel fabricator and US
seller of record for mission-critical AI infrastructure. We build welded
structural subassemblies (enclosures, power skids, and Division 5 structural
steel) to your drawings, delivered with zero customs friction.

We run 10,000 tons/month of capacity and can be a reliable supply backstop as
you scale.

Happy to send a one-pager and facility credentials. Worth a short call?

Best,
[Signature]
```

**Audit:** VERDICT: PASS · BLOCKERS: None · WARNINGS: None

---

## Tabla resumen

| Cuenta | Template | Audit |
|---|---|---|
| ESS Tech, Inc. | e1_datacenter_overflow (v1.3) | PASS |
| Form Energy | e1_datacenter_overflow (v1.3) | PASS |
| Industrial Electric Mfg. (IEM) | e1_datacenter_overflow (v1.3) | PASS |
| INNIO | e1_datacenter_overflow (v1.3) | PASS |
| PCX Corporation | e1_datacenter_overflow (v1.3) | PASS |
| Sparkstone Electrical Group (SEG) | e1_datacenter_overflow (v1.3) | PASS |
| Eos Energy Enterprises | e1_datacenter_overflow (v1.3) | PASS |
| EPC Power | e1_datacenter_overflow (v1.3) | PASS |
| Moment Energy | e1_datacenter_overflow (v1.3) | PASS |
| Prolec GE | e1_datacenter_overflow (v1.3) | PASS |
| Giga Energy | e1_datacenter_overflow (v1.3) | PASS |
| Pennsylvania Transformer Technology (PTT) | e1_datacenter_overflow (v1.3) | PASS |
| Ayr Energy | T-4C-founder-v2 | PASS |
| CORE Transformers | T-4C-founder-v2 | PASS |
| CEL Critical Power | e1_datacenter_overflow (v1.3) | PASS |
| Nostromo Energy | T-4C-founder-v2 | PASS |
| EnerVenue | T-4C-founder-v2 | PASS |
| Electrified Thermal Solutions | T-4C-founder-v2 | PASS |
| Redwood Materials | T-4C-founder-v2 | PASS |

**19/19 PASS, 0 warnings.** 13 cuentas ruteadas a `e1_datacenter_overflow` (v1.3), 6 a
`T-4C-founder-v2` — la primera vez que esta corrida respeta la regla real de precedencia del
index en vez de forzar un solo template para las 19.
