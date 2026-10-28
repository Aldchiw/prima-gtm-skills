---
name: prima-reference-leads
description: Procesa una lista de empresas solicitadas por un usuario (Gaby, Aldahir, Gus, etc.) que no entran al ICP formal pero se quieren contactar (eventos, listas, fotos, pedidos puntuales). Salta prima-icp-check y prima-scope-score; corre signal-scan → committee → email-waterfall y escribe company_category = Reference en leads_master.csv con el esquema real del master, respaldo previo y OK explícito. Úsalo cuando alguien pida leads de empresas específicas por nombre, no por vertical o categoría ICP.
---

# prima-reference-leads

Skill para empresas que alguien pidió explícitamente y que están fuera del ICP formal de Data Centers
(el "engine de pedidos"). No descubre empresas: recibe una lista ya definida. No evalúa si entran al
ICP: ya se decidió incluirlas. Corre el pipeline de contacto y las escribe como `Reference` en
`leads_master.csv`. Todo vive en el mismo master porque de ahí salen el Sheet "Prima Leads"
(`scripts/sync-sheet.js`), el sync SDR y Supabase (`scripts/sync-supabase.js`).

Prototipo de referencia: el lote Bisnow de Gaby (2026-09-29, `source_files = bisnow_email_gaby_20260929`).
Úsalo como plantilla de cómo se ve una fila Reference correcta.

## Invocación

Formas reconocidas:

```
jala leads de estas empresas que pide Gaby: Empresa A, Empresa B, Empresa C
/prima-reference-leads Empresa A, Empresa B, Empresa C
procesa estas referencias: [lista]
```

Parsea la lista de empresas del mensaje. Si una entrada es un dominio en lugar de nombre, úsalo directamente.
Si no puedes parsear al menos una empresa, pregunta una vez por la lista antes de continuar.

Del mismo mensaje toma, si vienen:
- **Quién lo pidió** (`requested_by`) → será el `assigned_owner`. Valores válidos del master: `Aldahir`, `Gaby`, `Gustavo Rivas`, `Manuel Ibarra`.
- **Contexto del pedido** (evento, lista, foto, fecha) → será la señal (`signal_source`).

Si falta quién lo pidió, pregúntalo una sola vez junto con la lista (es obligatorio: sin dueño la fila no se puede asignar).
Si falta el contexto, usa `request: pedido de <requested_by>`. No hagas más preguntas: arranca directo.

## Lo que esta skill NO hace

- No corre `prima-icp-check` — la decisión de incluir estas empresas ya fue tomada por un humano
- No corre `prima-scope-score` — ese step es Cat4-only y no aplica aquí
- No descubre empresas nuevas — trabaja solo con la lista que recibió
- No corre `prima-hook`, `prima-draft`, ni `prima-guardrail-audit` — produce leads contactables, no copy de outreach
- No toca filas que no son de esta corrida, ni cambia `stage`, `contact_count`, dueño, categoría o columnas del equipo de cuentas existentes

## Step 0 — Muestra y tope de gasto (antes de cualquier proveedor pagado)

- **Muestra:** si la lista trae más de 20 empresas, procesa primero una muestra de 10–20, reporta el resultado y el costo real, y espera OK antes de correr el resto.
- **Tope de gasto de la corrida:** antes de la primera llamada pagada, estima el costo TOTAL de la corrida (Deepline + waterfall de emails + cualquier otro proveedor), repórtalo y espera aprobación explícita de ese tope. Si en algún momento el gasto real va a pasar el tope aprobado, detente y pide OK de nuevo. Nunca rebases el tope en silencio.

## Pipeline para cada empresa de la lista

### Step 1 — Resolver dominio

Si el usuario ya dio el dominio, úsalo. Si no:
- WebSearch: `"[Nombre empresa]" site:linkedin.com/company` o `"[Nombre empresa]" official website`
- Objetivo: conseguir dominio y URL de LinkedIn de la empresa

Si no se puede resolver el dominio ni encontrar presencia web verificable, marca la empresa como `NO_ENCONTRADA` y continúa con las demás — nunca inventes un dominio.

### Step 2 — prima-signal-scan

Corre [`prima-signal-scan`](../prima-signal-scan/SKILL.md) con el dominio resuelto.

- La señal principal de una fila Reference es el **pedido** (evento / lista / solicitud) y va en `signal_source`.
- Si signal-scan encuentra una señal verificable adicional, va en `signal_detail` (texto corto) y su URL en `signal_url`.
- Si no hay señal adicional, no detiene el proceso: estas empresas se incluyen por solicitud explícita, no por signal.

### Step 3 — prima-committee

Corre [`prima-committee`](../prima-committee/SKILL.md) para identificar 2-3 contactos del buying committee.

Aplican todas las reglas de ese skill: tiers (ALTA/SECUNDARIA/FALLBACK), function-match, seniority tie-break, escritura a `output/account_roster.csv`.
Máximo 2 contactos por cuenta para outreach (3 contando LinkedIn).

**Pausa de costo antes de cualquier llamada a proveedor pagado** (Deepline Tier 2): reporta cuántas búsquedas necesita, qué proveedor, y el costo estimado, dentro del tope aprobado en el Step 0. Espera aprobación explícita. Igual que `prima-generate-leads`.

Si committee no encuentra ningún contacto localizable (ni LinkedIn ni email), la empresa cuenta como procesada pero `NO_CONTACTO` — no se escribe a `leads_master.csv`, se reporta en el resumen final.

### Step 4 — prima-email-waterfall

Corre [`prima-email-waterfall`](../prima-email-waterfall/SKILL.md) sobre el contacto top-ranked de committee.
Si ningún proveedor da un email válido y verificado, `contact_email` queda VACÍO. Nunca inventar ni rellenar.

Si el contacto top no produce email verificado, intenta el siguiente de la misma empresa (máximo 2-3 intentos, igual que `prima-generate-leads`).

## Output

### leads_master.csv — respaldo, OK y merge (nunca reset)

**1. Respaldo obligatorio.** Antes de escribir, copia el master a
`output/leads_master.bak-<YYYYMMDD-HHMM>-preReference.csv` y reporta su md5.

**2. Resumen y OK.** Muestra cuántas filas nuevas se van a escribir, cuántos duplicados se van a saltar (ver regla abajo) y para quién es el lote. Espera OK explícito antes de tocar el master. Sin OK, no se escribe nada.

**3. Regla de duplicados y cuentas existentes** (misma regla que `prima-generate-leads`, para TODAS las categorías):
Todo el sistema (Sheet, Supabase, columnas del equipo) identifica a una persona por `account_name + "|" + contact_name`, y cada empresa tiene UNA sola `company_category` y UN solo dueño.
- **Empresa ya existe en el master** (match por dominio o por `account_name` normalizado): no se crea otra cuenta y no se salta la empresa. Se suman **solo contactos que no existan** por `account_name|contact_name`, con la `company_category` y el `assigned_owner` de la cuenta existente — nunca `Reference`, nunca se cambia el dueño. Si el dueño de la cuenta existente está vacío, queda vacío en las filas nuevas (no se asigna a `requested_by`).
- **Máximo 2 principales por cuenta:** si la cuenta ya tiene 2 contactos principales, o tiene secuencia activa (algún contacto con `stage` distinto de `Not Contacted`), los contactos nuevos entran con `email_status` = `BACKUP_HOLD -- no secuenciar hasta agotar los 2 principales de la cuenta | <source_files>` (mismo formato que el resto del master).
- **Persona que ya existe** (`account_name` + `contact_name`): no se escribe. Se reporta como `DUPLICADO` con su dueño actual.
- Se reporta: `<Empresa> ya es de <dueño>: se sumaron N contactos`.
- Solo las empresas **nuevas** en el master se escriben como `Reference` y con `assigned_owner` = `requested_by`.

**4. Escritura.** Agrega las filas nuevas al final, con exactamente el header actual del master (24 columnas, mismo orden). Si el header del master no coincide con la tabla de abajo, detente y avisa: no agregues ni renombres columnas. Conserva el formato del archivo (todas las celdas entre comillas, mismos saltos de línea).

Columnas — esquema real de `leads_master.csv`:

| Columna | Valor |
|---|---|
| `account_name` | Nombre de la empresa |
| `domain` | Dominio resuelto en el Step 1 |
| `company_category` | **`Reference`** — siempre |
| `sub_segment` | `UNKNOWN` |
| `priority` | `P3` (no se clasifica por ICP; no es P1) |
| `vertical_owner` | `UNKNOWN` |
| `excluded` | *(vacío)* |
| `exclusion_reason` | Opcional: `ICP_NOTE (no aplicado, pedido de <requested_by>): ...` si algo saltó a la vista; si no, vacío |
| `scope_tier` | *(vacío — no aplica)* |
| `needs_manual_scope_confirmation` | `yes` |
| `signal_source` | El pedido: `event: <nombre, fecha, lugar>` o `request: <descripción> (<requested_by>)` |
| `signal_detail` | Por qué esta empresa/persona (ej. `company of speaker`, `exhibitor`) + señal extra de signal-scan si la hay |
| `signal_url` | URL de la señal extra, o vacío |
| `signal_date` | Fecha del evento o del pedido (`YYYY-MM-DD`) |
| `contact_name` | Nombre del contacto |
| `contact_title` | Título del contacto |
| `priority_tier` | Tier de prima-committee (`PRINCIPAL` / `SECUNDARIA` / `RESPALDO`, etc.) |
| `linkedin_url` | URL de LinkedIn del contacto |
| `contact_email` | Email corporativo verificado, o vacío |
| `email_status` | `VERIFIED -- <proveedor>: <detalle>, checked <fecha> \| REFERENCE_<lote>` / `NOT_VERIFIED -- ...` / `NOT_FOUND -- ...` (mismo formato que el resto del master) |
| `stage` | `Not Contacted` |
| `contact_count` | `0` |
| `source_files` | ID del lote: `<lote>_<requested_by>_<YYYYMMDD>` (ej. `bisnow_email_gaby_20260929`) |
| `assigned_owner` | `requested_by` (`Aldahir` / `Gaby` / `Gustavo Rivas` / `Manuel Ibarra`) |

También escribe filas completas (todos los contactos, no solo el top) a `output/accounts_processed.csv` — append, no reescritura.

**5. Después de escribir.** Verifica que el master siga teniendo el mismo header y que el número de filas sea el anterior + las nuevas. No corras `sync-sheet.js` ni `sync-supabase.js --apply` por tu cuenta: reporta que están listos para correr y espera OK.

## Cuando la dispara el botón del cockpit (sin persona que apruebe)

Aplica **solo** cuando el pedido llega del botón "+ Reference leads" del cockpit. Si Aldahir la corre a mano, sigue el flujo normal con todos sus OK y pausas.

- **Tope por corrida:** 5 créditos de Deepline, ya aprobado — no pide OK. Si el estimado pasa del tope, procesa solo las empresas que quepan y reporta el resto como "no procesadas por tope". El tope mensual de la cuenta lo aplica Deepline.
- **Máximo 10 empresas por pedido;** el resto se reporta como "no procesadas".
- **Máximo 2 contactos por empresa, sin búsqueda de banca.** Emails: waterfall estándar, verificado o vacío.
- **`requested_by` obligatorio:** si llega vacío, no corre ni gasta nada y lo reporta.
- **Escritura al master:** aplica la REGLA DURA — MASTER ÚNICO de `CLAUDE.md`. No corre syncs (Supabase/Sheet); esos los corre Aldahir. Desde el botón, el servicio escribe directo en GitHub: parte siempre de la última versión de origin/main, agrega sus filas, hace commit y push SOLO de output/leads_master.csv y nunca usa --force; si el push es rechazado, vuelve a bajar la última versión y reintenta. Aldahir suma esas filas a su local con el paso 1 de la regla dura.
- **Precedencia:** solo en este caso, estas reglas ganan sobre los OK y pausas de `CLAUDE.md`, `prima-committee` y `prima-email-waterfall`. Todo lo demás (verificado o vacío, nunca inventar, regla dura del master, guardrails de envío) sigue igual.

## Resumen final al usuario

```
Listo — {N_procesadas} empresas de referencia procesadas (lote {source_files}, dueño {requested_by})

RESULTADO
- {n_escritas} filas nuevas escritas en leads_master.csv (Reference o cuenta existente)
- {n_verificado} con email verificado
- {n_linkedin_only} solo LinkedIn
- {n_duplicado} DUPLICADO (persona ya en el master) — no escritas
- {n_cuenta_existente} contactos sumados a cuentas que ya existían (categoría y dueño sin cambios)
- {n_no_contacto} sin contacto localizable (ni LinkedIn ni email)
- {n_no_encontrada} no se pudo resolver dominio ni presencia web

{lista de DUPLICADO y de cuentas existentes ("<Empresa> ya es de <dueño>: se sumaron N contactos"), y NO_CONTACTO / NO_ENCONTRADA con razón breve}

Respaldo: output/leads_master.bak-<fecha>-preReference.csv
Archivo: output/leads_master.csv
Siguiente: sync-sheet.js y sync-supabase.js listos para correr (esperando OK)

COSTO
Esta corrida: ${costo_real} de ${tope_aprobado} · Saldo Deepline: {saldo_creditos} créditos
```

Sin jargon técnico, sin dump de CSV, sin nombres de providers en el resumen. El bloque de costo solo aparece si se usó algún provider pagado.
