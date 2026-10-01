---
name: prima-reference-leads
description: Procesa una lista de empresas solicitadas por un usuario (Gaby, Aldahir, etc.) que no entran al ICP formal pero se quieren contactar. Salta prima-icp-check y prima-scope-score; corre signal-scan → committee → email-waterfall y escribe company_category = Reference en leads_master.csv. Úsalo cuando alguien pida leads de empresas específicas por nombre, no por vertical o categoría ICP.
---

# prima-reference-leads

Skill para empresas que alguien pidió explícitamente y que están fuera del ICP formal de Data Centers.
No descubre empresas — recibe una lista ya definida. No evalúa si entran al ICP — ya se decidió incluirlas.
Solo corre el pipeline de contacto y las escribe como `Reference` en `leads_master.csv`.

## Invocación

Formas reconocidas:

```
jala leads de estas empresas que pide Gaby: Empresa A, Empresa B, Empresa C
/prima-reference-leads Empresa A, Empresa B, Empresa C
procesa estas referencias: [lista]
```

Parsea la lista de empresas del mensaje. Si una entrada es un dominio en lugar de nombre, úsalo directamente. Si no puedes parsear al menos una empresa, pregunta una vez por la lista antes de continuar.

Siempre pregunta (una vez, al inicio):
- **¿Quién lo pidió?** — para anotarlo en `signal_summary` como contexto ("Solicitado por Gaby")
- **¿Tienen dominio o LinkedIn conocido?** — si el usuario ya los tiene, úsalos directamente; ahorra una búsqueda en Step 1

## Lo que esta skill NO hace

- No corre `prima-icp-check` — la decisión de incluir estas empresas ya fue tomada por un humano
- No corre `prima-scope-score` — ese step es Cat4-only y no aplica aquí
- No descubre empresas nuevas — trabaja solo con la lista que recibió
- No corre `prima-hook`, `prima-draft`, ni `prima-guardrail-audit` — produce leads contactables, no copy de outreach

## Pipeline para cada empresa de la lista

### Step 1 — Resolver dominio

Si el usuario ya dio el dominio, úsalo. Si no:
- WebSearch: `"[Nombre empresa]" site:linkedin.com/company` o `"[Nombre empresa]" official website`
- Objetivo: conseguir dominio y URL de LinkedIn de la empresa

Si no se puede resolver el dominio ni encontrar presencia web verificable, marca la empresa como `NO_ENCONTRADA` y continúa con las demás — nunca inventes un dominio.

### Step 2 — prima-signal-scan

Corre [`prima-signal-scan`](../prima-signal-scan/SKILL.md) con el dominio resuelto.

- Si hay signal verificable: `signal_status = VERIFIED`, anota el signal y su URL fuente
- Si no hay signal: `signal_status = NO_SIGNAL` — no detiene el proceso; estas empresas se incluyen por solicitud explícita, no por signal

### Step 3 — prima-committee

Corre [`prima-committee`](../prima-committee/SKILL.md) para identificar 2-3 contactos del buying committee.

Aplican todas las reglas de ese skill: tiers (ALTA/SECUNDARIA/FALLBACK), function-match, seniority tie-break, escritura a `output/account_roster.csv`.

**Pausa de costo antes de cualquier llamada a proveedor pagado** (Deepline Tier 2): reporta cuántas búsquedas necesita, qué proveedor, y el costo estimado. Espera aprobación explícita. Igual que `prima-generate-leads`.

Si committee no encuentra ningún contacto localizable (ni LinkedIn ni email), la empresa cuenta como procesada pero `NO_CONTACTO` — no se escribe a `leads_master.csv`, se reporta en el resumen final.

### Step 4 — prima-email-waterfall

Corre [`prima-email-waterfall`](../prima-email-waterfall/SKILL.md) sobre el contacto top-ranked de committee.

- `verification.status = "valid"` → `email_status = VERIFIED`
- `verification.status = "accept_all"` → `email_status = FOUND_UNVERIFIED` (no apto para envío directo)
- Sin email → `email_status = LINKEDIN_ONLY`

Si el contacto top no produce email verificado, intenta el siguiente de la misma empresa (máximo 2-3 intentos, igual que `prima-generate-leads`).

## Output

### leads_master.csv — merge, nunca reset

**Antes de escribir**, lee `output/leads_master.csv` y construye un mapa `account_name → {stage, contact_count}`.

Para cada empresa procesada con contacto:
- **Ya existe en leads_master**: actualiza signal, contacto, email si mejoraron; preserva `stage` y `contact_count` sin tocarlos
- **Nueva**: escribe fila nueva con `stage = Not Contacted`, `contact_count = 0`

Columnas que escribe esta skill — mismo esquema que `leads_master.csv`:

| Columna | Valor |
|---|---|
| `account_name` | Nombre de la empresa |
| `company_category` | **`Reference`** — siempre, para todas las empresas de esta skill |
| `scope_tier` | *(vacío — no aplica)* |
| `notion_scope` | *(vacío — no aplica)* |
| `signal_summary` | Signal de prima-signal-scan, o "Sin signal — solicitado por [quien]" |
| `signal_source_url` | URL del signal, o vacío |
| `contact_name` | Nombre del contacto |
| `contact_title` | Título del contacto |
| `linkedin_url` | URL de LinkedIn del contacto |
| `contact_email` | Email corporativo verificado, o vacío |
| `email_status` | `VERIFIED` / `FOUND_UNVERIFIED` / `LINKEDIN_ONLY` |
| `best_channel` | `email` si VERIFIED, `linkedin` si solo LinkedIn |
| `stage` | Preservado si existía; `Not Contacted` si es nuevo |
| `contact_count` | Preservado si existía; `0` si es nuevo |

También escribe filas completas (todos los contactos, no solo el top) a `output/accounts_processed.csv` — append, no reescritura.

## Resumen final al usuario

```
Listo — {N_procesadas} empresas de referencia procesadas

RESULTADO
- {n_con_contacto} con contacto accionable → escritas en leads_master.csv como Reference
- {n_verificado} con email verificado
- {n_linkedin_only} solo LinkedIn
- {n_con_senal} con signal verificado, {n_sin_senal} sin signal
- {n_no_contacto} sin contacto localizable (ni LinkedIn ni email)
- {n_no_encontrada} no se pudo resolver dominio ni presencia web

{si hay NO_CONTACTO o NO_ENCONTRADA, lista esas empresas con razón breve}

Archivo: output/leads_master.csv

COSTO
Esta corrida: ${costo_real} · Saldo Deepline: {saldo_creditos} créditos
```

Sin jargon técnico, sin dump de CSV, sin nombres de providers. El bloque de costo solo aparece si se usó algún provider pagado.
