# Prima GTM Skills — Motor de outbound + Outreach Cockpit


## 1. Qué es esto

Este repo es el motor de generación de leads y outbound de Prima para el canal GTM de **Data
Centers**, cubriendo dos sub-verticales: **Power & Electrical Distribution** y **Energy
Storage**. No es una app tradicional — no hay build, lint, ni tests. El "motor" son 9 skills en
Markdown (`.claude/skills/*/SKILL.md`) que un asistente de Claude Code ejecuta directamente sobre
CSVs locales, siguiendo instrucciones en lenguaje natural, en vez de una UI de enriquecimiento
tipo Clay. Resuelve el problema completo de punta a punta: encontrar empresas que encajan en el
ICP de Prima, verificar que tengan una señal real de negocio, estimar si probablemente
subcontratan fabricación (en vez de fabricar 100% in-house), identificar a la persona correcta
para escribirle, conseguirle un email verificado, y generar un borrador de correo que cumpla los
guardrails de mensaje de Prima — sin inventar ningún dato en el camino. Solo cubre los dos
verticales de Aldahir; el otro vertical de Prima (Cooling & Thermal Management, Test &
Commissioning, propiedad de Manu) no está soportado porque la tabla de pesos de
`prima-scope-score` es específica de estos dos verticales.

## 2. El flujo de las 9 skills, en orden

| # | Skill | Qué entra → qué sale |
|---|---|---|
| 0 | `prima-generate-leads` | (orquestador) Un conteo N + un vertical → corre las 5 skills siguientes en cadena y escribe `accounts_processed.csv` + `leads_final.csv`. Se detiene antes de hook/draft/audit — entrega una lista de leads calificados y contactables, no copy de correo. |
| 1 | `prima-icp-check` | Lista de dominios/nombres de cuenta → clasificación (`sub_segment` 4A-4D, `priority` P1-P3, `vertical_owner`, `excluded`, `anchor_products`, `reasoning`) por fila. |
| 2 | `prima-signal-scan` | Un dominio ya clasificado → filas de señal fechadas y con URL (`job_opening`/`capacity_expansion`/`funding`/`grant`/`target_title`/`customs`), o `NO_SIGNAL`/`NOT_CHECKED` explícito. |
| 3 | `prima-scope-score` | Clasificación de icp-check + señal de capacity_expansion de signal-scan → `outsourcing_score` (0-100), `scope_tier`, `score_rationale`, `needs_manual_scope_confirmation`. |
| 4 | `prima-committee` | Cuenta clasificada (solo 4B/4C hoy) → 2-3 contactos reales del comité de compra, con título, fuente y fecha. |
| 5 | `prima-email-waterfall` | Contactos nombrados de committee → email corporativo verificado (o `FOUND_UNVERIFIED`/`NOT_FOUND`, nunca un personal como si fuera bueno). |
| 6 | `prima-hook` | Señales ya verificadas de signal-scan → hasta 3 hechos verificados rankeados + `anchor_products` (producto del catálogo que ancla el gancho), o `NO_HOOK`. |
| 7 | `prima-draft` | Contacto + hooks + estado de email → 3 borradores (E1/E2/E3), siempre `draft_status: BORRADOR` + `audit_status: NOT_AUDITED`. |
| 8 | `prima-guardrail-audit` | Un borrador (o batch E1/E2/E3) → `PASS`/`FAIL` por correo, con blockers y warnings citados línea por línea. |

## 3. Cómo se corre lo común

Los comandos exactos (qué escribir para cada operación) viven en `COMMANDS.md`, en la raíz del repo.

Lo que sí se puede confirmar hoy sobre invocación:

- **`prima-generate-leads`** es la única skill con una forma corta ya formalizada en su propio
  `SKILL.md` (sección `## Invocation`): `genera N leads de <vertical>` o
  `/prima-generate-leads N <vertical>`.
- Las otras 8 skills (`prima-icp-check`, `prima-signal-scan`, `prima-scope-score`,
  `prima-committee`, `prima-email-waterfall`, `prima-hook`, `prima-draft`,
  `prima-guardrail-audit`) no tienen un comando corto formal — se invocan describiendo la tarea en
  lenguaje natural (cada `SKILL.md` trae ejemplos de frase disparadora en su `description`, pero no
  una sintaxis fija tipo `/comando`).
- Operaciones que en esta sesión se hicieron completamente a mano, sin ningún atajo (clasificar
  cuentas, regenerar drafts, armar/actualizar el tracker de outreach, respaldar un `SKILL.md` antes
  de editarlo, escribir una entrada de `SESION_LOG.md`): hoy requieren un prompt largo cada vez.

## 4. Dónde vive cada cosa

```
.claude/skills/<nombre-skill>/SKILL.md      → definición de cada una de las 9 skills
.claude/skills/prima-draft/templates/       → librería de templates de prima-draft
  ├── index.md                             → tabla de qué template aplica a qué cuenta
  ├── T-4B-plantpurchasing-v1.md            → seed template, sub_segment 4B
  ├── T-4C-founder-v2.md                    → template 4C / señal funding (renombrado de v1 esta sesión)
  └── e1_datacenter_overflow.md              → template E1 angle-matched, señal capacity_expansion (v1.3)
reference/prima-catalog.md                  → catálogo de capacidad de fabricación de Prima (Eje 3:
                                               qué fabrica Prima), fuente del Application Index que
                                               usan prima-icp-check y prima-hook para anchor_products
output/accounts_processed.csv               → CSV rico, un renglón por contacto, append-only
output/leads_final.csv                      → vista limpia y accionable, un renglón por contacto
                                               contactable, regenerada (no append-only) cada corrida
output/tracker_light.csv                    → log mínimo de outreach para el Sheet de Aldahir
output/outreach_tracker.csv                 → tracker de cadencia (creado esta sesión — columnas
                                               date_e1_sent/date_li_sent/date_e2_sent/date_e3_sent/
                                               reply_status/reply_date; no está descrito en
                                               output/README.md todavía)
CLAUDE.md                                   → arquitectura del repo y fuentes de verdad (Notion,
                                               Ejecutable Maestro v2)
SESION_LOG.md                               → bitácora de sesiones, entradas más recientes arriba
SPRINT2_GABY_REVIEW.md                      → bitácora histórica del Sprint 2, no se edita
drafts_e1.md                                → material de trabajo del sprint actual (19 borradores
                                               E1 generados, no comiteado — es un dry-run, no envío real)
```

## 5. Reglas de oro / qué NO tocar

- **Deepline: no gastar créditos todavía.** Hay un refund de $450 pendiente de resolver — no usar
  créditos (ni Tier 0 ni `prima-email-waterfall`) hasta que se resuelva [según `SESION_LOG.md`,
  entrada 2026-07-28].
- **Tier 0 de `prima-generate-leads` está roto.** Los campos documentados (`account.industries`,
  `account.employeeSize`) no existen en el schema real de AI Ark — confirmado probando la llamada
  en vivo esta sesión. Hasta que se corrija, el descubrimiento debe caer directo a la cascada de
  WebSearch (Tiers 1-4).
- **Guardrails de mensaje son un gate obligatorio, no opcional.** `prima-guardrail-audit` corre
  sin excepciones antes de cualquier envío. Los 4 blockers duros: figura de capacidad distinta a
  **10,000 tons/month**, cualquier certificación que no sea AISC/AWS, cualquier cliente de Prima
  nombrado como referencia, y precio/ahorro como gancho principal.
- **El gate anti-quema de P1 no es negociable.** Una cuenta `priority = P1` con
  `needs_manual_scope_confirmation = TRUE` nunca llega a un draft real solo por el tier/score — se
  necesita que un humano confirme el scope directamente (o que llegue a
  `scope_tier = confirmed_outsources`). `prima-committee`/`prima-hook`/`prima-email-waterfall`
  pueden seguir corriendo sobre esa cuenta; solo `prima-draft` espera.
- **Nunca fabricar un dato.** Cada skill (`signal-scan`, `committee`, `email-waterfall`, `hook`)
  tiene su propia regla explícita de "nunca inventar" — un resultado vacío/`NO_SIGNAL`/`NOT_FOUND`
  es correcto y esperado, no un hueco que rellenar.
- **Notion "Data Centers GTM" es la fuente de verdad del ICP formal** (categorías, prioridad,
  criterios de descalificación) — las skills lo leen en vivo, nunca lo copian/hardcodean (con la
  única excepción documentada del esquema 4A-4D y el diccionario de títulos de comité, que sí
  viven hardcodeados a propósito).
- **No comitear ni pushear sin autorización explícita.** Convención estándar en todo el repo —
  ninguna skill ni corrida comitea/pushea por su cuenta; el usuario lo pide aparte cuando está listo.

## 6. Cockpit SDR — app de outreach en vivo

Además del motor de skills, este repo aloja el **Outreach Cockpit**: una app web donde el equipo SDR ve y opera su pipeline de outreach en tiempo real, sin tocar el Google Sheet directamente.

**URL:** `https://aldchiw.github.io/prima-gtm-skills/`
**Codigo:** `docs/index.html` — app de pagina unica (HTML + CSS + JS inline, sin build)
**Hosting:** GitHub Pages (auto-deploy desde `main`, carpeta `/docs`)
**Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions), proyecto `axknjzbiteuwrjpbuows`

### Auth y acceso

- Login con Magic Link (correos `@prima.ai`)
- RLS por `assigned_user_id` — cada usuario ve solo sus cuentas asignadas
- Admin override: `ivan.vazquez@prima.ai` bypasea RLS via politica separada en `accounts`, `contacts`, `email_drafts` — ve toda la data independientemente de asignacion
- Frontend: `ADMIN_EMAILS = ["ivan.vazquez@prima.ai"]` controla visibilidad de controles adicionales (link "needs a contact")

### Pipeline

- Tiles de estado: My leads / Fresh signals / In sequence / Closed
- Link secundario "X accounts need a contact": visible solo para admin, o para usuarios normales solo si alguna cuenta sin contacto tiene email o LinkedIn accionable
- Stage por contacto: Not Contacted → First Touch (Email|LinkedIn|Email + LinkedIn) → FUP 1-4 → Replied / Stopped
- Badge verde "Replied" en tarjeta cuando `email_drafts.respondio = true`
- Badge gris "Replied"/"Stopped" cuando el stage del contacto esta cerrado

### Start Sequence

Al hacer clic en "Start sequence" aparece un picker de canales:
- **Email**: lee el draft editado (asunto/cuerpo) del bloque de draft, llama a `approve-draft` para escribir `SEND` en el Sheet y actualiza `email_drafts.status` en Supabase, guarda stage `First Touch (Email)`
- **LinkedIn**: abre el perfil en nueva pestana, guarda stage `First Touch (LinkedIn)`
- **Ambos**: guarda stage `First Touch (Email + LinkedIn)` — un solo touch, un solo timer de followup

### Bandeja de followups

Timer fijo de 7 dias desde `last_touch_at`. Un renglon por contacto (no por cuenta).

Contactos incluidos en la bandeja:
- `stage > 0` con `last_touch_at` registrado
- Stage "First Touch (LinkedIn)" aunque `last_touch_at` sea null
- Draft con `status = "MANUAL"` aunque el stage sea "Not Contacted"
- Fallback: si no hay ninguna fecha, se trata como 30 dias overdue

### Bloque de draft / reply

- Si `respondio = false`: muestra asunto + cuerpo editables. Al hacer Start sequence con Email, los valores editados se escriben al Sheet antes de marcar SEND.
- Si `respondio = true`: oculta el draft y muestra un bloque verde con `estado` (Interesado/OOO/etc.) y `tipo_respuesta` del Sheet.

### Sync Sheet → Supabase

Edge Function `sync-sdr-sheet`, cron horario. Lee el tab con `gid=1226985717` del Sheet `1rH-KprLuxAZydwqyRX4lU_lLKX09154F9Nyj6VDG8is`:

- Upsertea touches de filas SENT/MANUAL a `touches` via `sync_sheet_touches` RPC
- Upsertea a `email_drafts` (match por `contact_email`): asunto, cuerpo, status, thread_id, respondio, fecha_resp, tipo_respuesta, estado, followups 1-4, sheet_row_index
- Infiere y actualiza `contacts.stage` desde el Sheet: respondio → Replied, fup4fecha → FUP 4, etc.

### Tablas en Supabase

| Tabla | Columnas clave |
|---|---|
| `accounts` | account_name, company_category, assigned_user_id, signal_detail, signal_date, signal_url, priority |
| `contacts` | contact_name, contact_email, linkedin_url, stage, last_touch_at, account_id |
| `touches` | contact_id, fup_label, comment, replied, created_at, updated_at |
| `users` | id, email, name, color |
| `email_drafts` | contact_id, contact_email, asunto, cuerpo, status, thread_id, respondio, fecha_resp, tipo_respuesta, estado, followup_1-4_cuerpo/fecha, sheet_row_index |

### Edge Functions

| Funcion | Trigger | Que hace |
|---|---|---|
| `sync-sdr-sheet` | Cron horario | Lee Sheet → upsert touches + email_drafts + contacts.stage |
| `approve-draft` | POST desde cockpit | Recibe `contact_id` + `asunto` + `cuerpo` opcionales; escribe valores al Sheet via Sheets API batchUpdate, luego escribe `SEND` en columna status, actualiza `email_drafts` en Supabase |

Ambas funciones usan una Service Account de Google (env vars `GOOGLE_SA_EMAIL` + `GOOGLE_SA_PRIVATE_KEY`) para autenticarse contra Sheets API via JWT/OAuth2.

### Pendientes de implementacion

- `contacts.stage` no se actualiza en tiempo real desde el cockpit cuando el SDR hace Done/Replied — se sobreescribe en el siguiente sync horario si el Sheet tiene un valor distinto. Falta definir prioridad: cockpit vs Sheet como fuente de verdad.
- Auth por JWT de Google Workspace en lugar de Magic Link — requiere configurar un OAuth client ID en el proyecto de Supabase.
- `app-cockpit-schema.sql` desactualizado — no refleja `email_drafts`, politicas RLS actuales, ni las dos Edge Functions.

## 7. Estado actual y pendientes conocidos

- **Tier 0 roto** (ver arriba) — bloquea el descubrimiento rápido de `prima-generate-leads`
  hasta que se re-testee el schema correcto de AI Ark.
- **Faltan templates E2 y E3 dedicados.** Hoy solo hay templates completos para E1
  (`e1_datacenter_overflow` v1.3 para señal `capacity_expansion`, `T-4C-founder-v2` para señal
  `funding`) — la cadencia completa (E1 → +2d LinkedIn → +5d E2 → E3) no tiene templates propios
  para E2/E3 todavía [según `SESION_LOG.md` 2026-07-28].
- **Template de fallback sin señal (`e1_fallback_no_signal`): diseñado pero no creado** — falta
  para las cuentas fit-only (pasan ICP pero sin señal vigente).
- **`anchor_products` (Eje 3) se calcula pero no se consume en el draft real.** `prima-icp-check`
  y `prima-hook` ya devuelven `anchor_products` (validado en pruebas reales con Stryten Energy y
  A123 Systems), pero desde la v1.3 del template E1 el cuerpo del correo usa un set de producto
  **fijo** ("enclosures, power skids, and Division 5 structural steel") en vez de leer
  `anchor_products` por cuenta — es una desconexión real entre lo que calculan las skills de
  arriba y lo que el template realmente usa.
- **19 borradores E1 generados como dry-run** (`drafts_e1.md`) para el batch actual de cuentas
  P1/P2 — ninguno se ha enviado; `output/outreach_tracker.csv` tiene las columnas de fecha/reply
  vacías, a llenar a mano conforme se envíen.
- **Override manual de scope autorizado para 18 cuentas P1** (decisión de negocio de Aldahir,
  2026-07-28) — destraba el draft pero no cambia el `scope_tier` real ni el gate para corridas
  futuras.
- **Frontera "Backup power/generators" (Power vs Cooling) sin resolver** — pendiente de validar
  con Gaby, según `reference/prima-catalog.md` sección B.2. No bloquea el uso diario.
- **La exclusión "cliente existente" no tiene fuente de verdad en vivo** — solo se puede aplicar
  cuando un humano marca la cuenta a mano (caso confirmado: Antora Energy).
- **Lista de providers en `prima-committee`/`prima-email-waterfall` SKILL.md sigue sin validar
  contra el catálogo real de Deepline** (ContactOut/Lusha/RocketReach/etc. son placeholders) —
  `prima-generate-leads` ya usa las llamadas reales validadas, pero los archivos de esas dos
  skills no se han reconciliado todavía [ver `SPRINT2_GABY_REVIEW.md`].
- **`templates.md` quedó huérfano en la raíz de `prima-draft`.** Existe en
  `.claude/skills/prima-draft/templates.md` (suelto, junto a `SKILL.md`, no dentro de la carpeta
  `templates/`) — pendiente decidir si se mueve dentro de `templates/` o se borra, para no
  confundirlo con `templates/index.md`.

---
*Documentado originalmente el 2026-07-28. Actualizado el 2026-09-22: agregada sección del Cockpit SDR (sección 6), numeradas las secciones siguientes.*
