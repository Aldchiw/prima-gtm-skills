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

Además del motor de skills, este repo aloja el **Outreach Cockpit**: una app web donde el equipo ve y edita su pipeline de outreach en tiempo real, sin tocar el Google Sheet.

**URL:** `https://prima-gtm-skills.vercel.app`
**Código:** `docs/index.html` — app de página única (HTML + CSS + JS inline, sin build)
**Hosting:** Vercel Hobby (gratis, auto-deploy desde `main`)
**Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)

### Qué hay hoy

- Login con Magic Link (correos `@prima.ai`)
- Cada usuario ve **solo sus cuentas** (RLS por correo)
- Pipeline agrupado por categoría con tiles de estado (My leads / Fresh signals / In sequence / Closed)
- Stage por contacto: editable y guardable en vivo (Not Contacted → First Touch → FUP 1-4 → Replied/Stopped)
- Bandeja de followups: cuentas con timer vencido (>7 días sin toque)
- Comentarios por contacto (touch modal)
- Búsqueda de leads por empresa o nombre de contacto
- Sync horario Google Sheet (Zadrac SDR) → Supabase vía Edge Function + cron

### Tablas en Supabase

| Tabla | Qué guarda |
|---|---|
| `accounts` | 160 cuentas, una fila por empresa |
| `contacts` | 275+ contactos ligados a cuentas |
| `touches` | Historial de toques por contacto (comentarios, replied, fechas) |
| `users` | Roster del equipo (4 usuarios) |

### Lo que hay hoy (actualizado 2026-09-22)

- ✅ **Tanda 1:** Login Magic Link, pipeline por categoría, tiles, stage por contacto, followups, comentarios, búsqueda, sync horario Sheet → Supabase
- ✅ **Tanda 2 (parcial):** Start Sequence con checkboxes Email/LinkedIn; LinkedIn abre nueva pestaña
- ✅ **Tanda 3 (parcial):** Tabla `email_drafts` en Supabase; sync de asunto/cuerpo/status/followups desde Sheet; Edge Function `approve-draft` (escribe `SEND` en Sheet); bloque de draft en cada card con botón "Aprobar → SEND"

### Pendientes

- **Tanda 2:** fix visual de Closed por contacto
- **Tanda 3:** editar asunto/cuerpo desde el cockpit antes de aprobar; sync de `respondio`/`thread_id` de vuelta al cockpit para mostrar replies
- **Otro:** Auth por Google OAuth de Prima (necesita a Mike); actualizar `app-cockpit-schema.sql` con schema actual (tabla `email_drafts`, Edge Functions)

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
