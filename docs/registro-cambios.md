# Registro de cambios — pulls de otras personas al repo

Registro **acumulativo**. Cada vez que se trae (`git pull`) trabajo de otra persona, se agrega
aquí una entrada nueva con fecha, autor, commits y archivos — regla fijada en `CLAUDE.md`. Las
entradas se ordenan de la más reciente a la más antigua. Nunca se borran entradas viejas.

**`IVzzVll` (git) = Iván Vázquez = "Zadrac"** (correos ivan.vazquezv@icloud.com /
ivanvazquezv@icloud.com). Es el único colaborador externo del repo aparte de Aldahir; sus commits
se refieren aquí como "los cambios de Zadrac". El README menciona un "Sheet de Zadrac SDR" —
mismo Zadrac, es el nombre del proyecto/equipo SDR que él lleva.

---

## 2026-10-01 — pull de 23 commits (21 de Zadrac, 2 de Aldahir)

Se corrió `git pull --rebase --autostash` (sin force). Resultado: **limpio, sin conflictos**
(`54ee122..b77cc29` en `origin/main`). El único commit local propio (el cierre de `SESION_LOG.md`,
`dd8893f`) se re-aplicó encima y quedó como `de3fef4`. Los 4 archivos modificados sin commitear
(`prima-icp-check/SKILL.md`, `output/account_roster.csv`, `output/leads_master.backup-owner.csv`,
`output/leads_master.csv`) quedaron **idénticos** (mismo md5) antes y después del pull; cero
archivos en común con lo que trajo el remoto.

Nota de conteo: al intentar el push había 22 commits remotos; antes del pull Zadrac subió uno más
(`b77cc29`, 2026-09-30), por eso el total es 23.

### 1. Commits que llegaron (del más viejo al más nuevo)

| # | Hash | Autor | Fecha y hora | Mensaje |
|---|---|---|---|---|
| 1 | `97d6eff` | Aldchiw (Aldahir) | 2026-09-28 16:21 | Add DOCTYPE declaration to index.html |
| 2 | `9cb6ea1` | IVzzVll (Zadrac) | 2026-09-29 13:55 | start sequence envia draft editado a SEND (el botón start lee inputs y llama approve-draft con asunto/cuerpo editados; la edge function escribe los cambios en el sheet antes de poner SEND) |
| 3 | `e089b47` | Aldchiw (Aldahir) | 2026-09-29 15:27 | Update index.html |
| 4 | `a98ce8f` | IVzzVll (Zadrac) | 2026-09-29 15:40 | Hide needs-contact link for non-admin users; only Ivan is admin |
| 5 | `a3576e5` | IVzzVll (Zadrac) | 2026-09-29 15:45 | Show MANUAL/LinkedIn contacts in followup bandeja |
| 6 | `8a42456` | IVzzVll (Zadrac) | 2026-09-29 15:51 | Include MANUAL/LinkedIn contacts in followup bandeja regardless of stage |
| 7 | `c8a1074` | IVzzVll (Zadrac) | 2026-09-29 15:54 | Combined Email+LinkedIn first touch stage |
| 8 | `c9916a5` | IVzzVll (Zadrac) | 2026-09-29 15:59 | Add replied badge and closed contact badge to cards |
| 9 | `d59f4a0` | IVzzVll (Zadrac) | 2026-09-29 16:08 | Show reply context instead of draft when contact has replied |
| 10 | `2b62a91` | IVzzVll (Zadrac) | 2026-09-29 16:09 | Show reply context instead of draft when contact has replied |
| 11 | `82621e9` | IVzzVll (Zadrac) | 2026-09-29 16:22 | docs: rewrite README section cockpit SDR con estado tecnico actual |
| 12 | `c070873` | IVzzVll (Zadrac) | 2026-09-29 16:23 | docs: quitar referencias a personas de pendientes del README |
| 13 | `3c27c0b` | IVzzVll (Zadrac) | 2026-09-29 16:26 | docs: remover datos sensibles del README |
| 14 | `fbed028` | IVzzVll (Zadrac) | 2026-09-29 16:30 | security: migrar a publishable key de Supabase, invalidar legacy anon key |
| 15 | `d83ba8d` | IVzzVll (Zadrac) | 2026-09-29 16:41 | fix: incluir contactos con draft SENT en followup aunque stage sea Not Contacted |
| 16 | `b3bab77` | IVzzVll (Zadrac) | 2026-09-29 16:45 | fix: inferir First Touch para contactos SENT/MANUAL con stage Not Contacted en frontend |
| 17 | `74b5340` | IVzzVll (Zadrac) | 2026-09-29 16:52 | feat: mostrar y aprobar followups desde el cockpit por stage del contacto |
| 18 | `57e1112` | IVzzVll (Zadrac) | 2026-09-29 17:24 | fix: detectar followup activo por followup_N_status PENDING, no por stage del contacto |
| 19 | `d46fd69` | IVzzVll (Zadrac) | 2026-09-29 17:41 | feat: notification bell con seguimientos vencidos en el header |
| 20 | `f6ea139` | IVzzVll (Zadrac) | 2026-09-29 17:44 | fix: reemplazar escHtml (no existe) por escAttr en renderNotifBell |
| 21 | `8486320` | IVzzVll (Zadrac) | 2026-09-29 17:46 | fix: notif bell abre bandeja de followups antes de scrollear al card |
| 22 | `54ee122` | IVzzVll (Zadrac) | 2026-09-29 17:48 | fix: mostrar boton Aprobar para FUPs aunque el email original ya este SENT |
| 23 | `b77cc29` | IVzzVll (Zadrac) | 2026-09-30 12:32 | feat: bloque de mensajes LinkedIn generados por Claude al iniciar secuencia |

Totales por autor: **21 de IVzzVll (Zadrac)** y **2 de Aldchiw (Aldahir)**.

### 2. Archivos que cambiaron (6 archivos, +560 / −106)

| Archivo | Cambio |
|---|---|
| `docs/index.html` | +377 (el cockpit: bandeja de followups, badges, campanita, bloque LinkedIn) |
| `README.md` | +57 / −45 (sección cockpit SDR reescrita; sin datos sensibles) |
| `supabase/functions/approve-draft/index.ts` | +48 (envío del draft editado) |
| `supabase/functions/sync-sdr-sheet/index.ts` | +67 (sync con el Sheet de Zadrac SDR) |
| `supabase/functions/generate-linkedin-msgs/index.ts` | **archivo nuevo**, +69 (edge function nueva) |
| `.gitignore` | +3 (ignora `supabase/.temp/`) |

### 3. Qué hizo cada cambio (resumen)

- **Cockpit (`docs/index.html`):** la bandeja de followups ahora incluye contactos MANUAL/LinkedIn y
  contactos con draft SENT aunque su stage siga en Not Contacted; se puede ver y **aprobar
  followups desde el cockpit**; el followup activo se detecta por `followup_N_status = PENDING` y no
  por el stage; el botón Aprobar aparece aunque el email original ya esté SENT. Nuevo stage
  combinado "Email+LinkedIn" para el first touch, badges de "replied" y "closed", y si el contacto
  ya respondió se muestra el contexto de la respuesta en vez del borrador. Campanita en el header
  con seguimientos vencidos. El link de needs-contact solo lo ve el admin (hoy solo Iván).
- **Start sequence:** el botón ahora manda el draft **editado** (asunto/cuerpo) a SEND; la edge
  function `approve-draft` escribe esos cambios en el Sheet antes de poner SEND.
- **LinkedIn:** edge function nueva `generate-linkedin-msgs`, que genera con Claude los mensajes de
  LinkedIn de un contacto al iniciar la secuencia (usa nombre, título, empresa y la señal verificada
  si existe); el cockpit muestra el bloque de mensajes.
- **Seguridad:** `fbed028` migró el cockpit a la publishable key de Supabase e invalidó la anon key
  legacy; `3c27c0b` quitó datos sensibles del README. `.gitignore` ahora ignora `supabase/.temp/`.
- **README:** sección del cockpit SDR reescrita con el estado técnico actual; se quitaron
  referencias a personas en los pendientes.
- **Aldahir:** `97d6eff` (agrega DOCTYPE a `index.html`) y `e089b47` (edición de `index.html`
  hecha en GitHub web).

Este es solo un resumen; no incluye llaves ni identificadores de proyecto. El detalle técnico de lo
que tocó la app está en `app-cockpit-log.md` (entrada "2026-09-29/30 — Zadrac").

---

## 2026-09-27 — pull de 13 commits de Zadrac (Iván)

Se corrió `git fetch origin`, se revisó qué traía `origin/main` que no estaba en local, se hizo
respaldo del trabajo local sin commitear, y se corrió `git pull --ff-only origin main`. El pull
fue **fast-forward limpio** (`3407088..90c8c9e`), sin conflictos: cero archivos en común entre lo
que tocó Zadrac y el trabajo local (modificado o sin trackear).

Rama local antes del pull: `main`, 13 commits atrás / 0 adelante de `origin/main`.

## 1. Commits que están en `origin/main` y NO tengo en local

Total: **13 commits**, todos del 22 de septiembre de 2026. Del más viejo al más nuevo:

| # | Hash | Autor | Fecha y hora | Mensaje |
|---|---|---|---|---|
| 1 | `25123d3` | **IVzzVll (Zadrac)** | 2026-09-22 13:03 | cockpit: remove source filter, conditional category chips, update README |
| 2 | `54fff88` | **IVzzVll (Zadrac)** | 2026-09-22 13:05 | readme: update title and remove stale draft notice |
| 3 | `554b999` | **IVzzVll (Zadrac)** | 2026-09-22 13:06 | readme: remove subtitle blurb |
| 4 | `10498ab` | **IVzzVll (Zadrac)** | 2026-09-22 13:25 | cockpit: replace start-sequence flow with Email/LinkedIn checkboxes |
| 5 | `faf0783` | **IVzzVll (Zadrac)** | 2026-09-22 13:34 | readme: mark tanda 2 start-sequence as done |
| 6 | `963c740` | **IVzzVll (Zadrac)** | 2026-09-22 13:34 | Update Tanda 2 description in README |
| 7 | `075fd57` | **IVzzVll (Zadrac)** | 2026-09-22 15:09 | tanda 3: draft sync + approve-draft edge fn + cockpit draft block |
| 8 | `f8ce49b` | Aldchiw (tú) | 2026-09-22 15:18 | Update index.html |
| 9 | `c163e5c` | **IVzzVll (Zadrac)** | 2026-09-22 15:23 | ui: hide sort controls; readme: actualiza estado tandas 1-3 |
| 10 | `5e1a624` | **IVzzVll (Zadrac)** | 2026-09-22 15:35 | fix: cdraft-body siempre visible por css duplicado |
| 11 | `b4d5d9f` | **IVzzVll (Zadrac)** | 2026-09-22 15:40 | tanda 3: stage sync desde sheet + auto-expand draft al iniciar secuencia |
| 12 | `5df7ca1` | **IVzzVll (Zadrac)** | 2026-09-22 15:47 | readme: actualiza seccion cockpit con estado actual de la app |
| 13 | `90c8c9e` | **IVzzVll (Zadrac)** | 2026-09-22 15:50 | readme: quita referencia a acceso admin de usuarios especificos |

El commit #8 es tuyo: se hizo desde la web de GitHub (edición directa de `index.html`), por eso
está en el servidor y no en tu computadora.

---

## 2. Qué archivos cambiaron en total

```
 README.md                                   |  72 +++-
 (archivo temporal de scratchpad .json)      | 102 -----
 docs/index.html                             | 195 +++++++--
 docs/links-render.txt                       | 201 ----------
 docs/repo-audit.txt                         | 327 ---------------
 docs/signal-diff.txt                        |  12 -
 scripts/add-owner-to-csv-preview.txt        | 206 ----------
 scripts/ingest-value-chain-preview.txt      | 440 ---------------------
 supabase/functions/approve-draft/index.ts   | 136 +++++++  (NUEVO)
 supabase/functions/sync-sdr-sheet/index.ts  | 171 +++++++-
 10 archivos: 512 líneas agregadas, 1350 borradas
```

De esos 10: **2 se modificaron**, **1 es nuevo**, **6 se borraron** (archivos de notas/basura) y
`sync-sdr-sheet` se amplió bastante.

---

## 3. Qué hizo en cada archivo (en español sencillo)

### `docs/index.html` — el Cockpit SDR (la app web)

Es el archivo con más movimiento. Tres cosas:

1. **Limpieza de la interfaz.** Se escondieron los controles de ordenar y se apagó el filtro por
   fuente (`SHOW_SOURCE_FILTER = false`). Además, las "chips" de categoría ahora solo aparecen si
   de verdad hay más de una categoría en tu lista; si solo hay una, no se muestran (era ruido).

2. **"Start sequence" cambió de botones a casillas.** Antes, al iniciar una secuencia aparecían
   dos botones (Email / LinkedIn) y, si el contacto tenía ambos, se abría un mini-paso especial de
   LinkedIn con una caja de correo bloqueada. Todo ese mini-paso se eliminó. Ahora salen dos
   **casillas de selección** (Email y/o LinkedIn) y un botón "Start". Si marcas LinkedIn, se abre
   el perfil en otra pestaña. Si marcas Email (aunque también marques LinkedIn), el canal que se
   guarda es "Email". Si no marcas ninguna, te avisa "Selecciona al menos uno".

3. **Bloque de borrador de correo dentro de la tarjeta del contacto (lo más nuevo).** Ahora cada
   contacto puede mostrar el borrador que vive en el Google Sheet: una etiqueta de estado de
   colores (PENDING amarillo / SEND azul / SENT verde / SKIP gris), el asunto, y al desplegar, el
   asunto y el cuerpo completos. Si el borrador está en PENDING aparece un botón
   **"Aprobar → SEND"**, que llama al servidor y marca el correo como listo para enviarse. Al
   iniciar una secuencia por Email, el borrador se abre solo. También hubo un arreglo pequeño: una
   regla de CSS repetida hacía que el cuerpo del borrador se viera siempre, y se corrigió.

   Internamente la app ahora carga dos cosas a la vez al abrir (las cuentas y los borradores) en
   lugar de solo las cuentas.

### `supabase/functions/approve-draft/index.ts` — ARCHIVO NUEVO

Es la función de servidor detrás del botón "Aprobar → SEND". Recibe el ID del contacto, busca su
borrador, y:

- si ya fue enviado, lo rechaza con un error ("Este correo ya fue enviado");
- si no, se conecta al Google Sheet, encuentra la fila y la columna `status` exactas de ese
  contacto, y **escribe la palabra `SEND` en esa celda**;
- después actualiza la base de datos para que quede igual.

O sea: es el puente que convierte un clic en el cockpit en una marca real dentro del Sheet.

### `supabase/functions/sync-sdr-sheet/index.ts` — la sincronización automática

Esta función ya existía y corría cada hora leyendo el Sheet. Se le agregaron tres capacidades:

1. **Permiso de escritura.** Antes solo pedía permiso de *lectura* al Sheet; ahora pide permiso de
   lectura y escritura (necesario para lo de arriba).
2. **Trae los borradores completos.** Antes solo copiaba los correos ya enviados. Ahora también
   copia asunto, cuerpo, estado, `thread_id`, si respondió, y los 4 followups (texto y fecha) de
   cada fila a la tabla `email_drafts` — incluidas las filas que todavía están en PENDING. También
   guarda el número de fila del Sheet, que es lo que después usa `approve-draft` para saber dónde
   escribir.
3. **Deduce y actualiza el stage solo.** Mirando las columnas del Sheet, decide en qué etapa va
   cada contacto y lo actualiza en la base: si respondió → "Replied"; si no, el followup más alto
   con fecha (FUP 4 → FUP 3 → FUP 2 → FUP 1); y si nada de eso, pero está SENT o MANUAL →
   "First Touch (Email)". Solo escribe cuando el valor cambió.
   (Antes solo contaba como toque el estado `SENT`; ahora también cuenta `MANUAL`.)

### `README.md`

Se reescribió el encabezado (nuevo título: "Motor de outbound + Outreach Cockpit") y se quitó el
aviso de "Borrador". Lo grande: se agregó una **sección 6 completa documentando el Cockpit SDR**
—URL en Vercel, cómo entra la gente (magic link con correo @prima.ai), qué ve cada quien, las
tablas de Supabase (`accounts`, `contacts`, `touches`, `users`, `email_drafts`), las dos Edge
Functions y una lista de pendientes. Las secciones que seguían se renumeraron (la vieja 6 pasó a
ser 7). Al final se quitó una línea que mencionaba acceso de admin para usuarios específicos.

### Archivos borrados (6)

Ninguno es código en uso; son notas y volcados de texto que ya no servían:
`docs/links-render.txt`, `docs/repo-audit.txt`, `docs/signal-diff.txt`,
`scripts/add-owner-to-csv-preview.txt`, `scripts/ingest-value-chain-preview.txt`, y un archivo
`.json` con nombre larguísimo que en su momento se subió por accidente desde una carpeta temporal.
Entre los 6 suman ~1,288 líneas borradas: es limpieza, no pérdida de funcionalidad.

---

## 4. Commits míos que NO están en `origin/main`

**Ninguno. Cero.**

Todo lo que está comiteado ya vive en el servidor. Lo que falta subir no está en commits, está sin
comitear en la carpeta (siguiente punto).

---

## 5. Estado local (`git status`)

### Archivos modificados y ya rastreados por git (5)

```
 .claude/skills/prima-icp-check/SKILL.md   | 269 líneas cambiadas
 SESION_LOG.md                             |  12 líneas cambiadas
 output/account_roster.csv                 |   4 líneas cambiadas
 output/leads_master.backup-owner.csv      |  70 líneas cambiadas
 output/leads_master.csv                   |  70 líneas cambiadas
```

Total: 345 líneas agregadas, 80 borradas.

### Archivos nuevos sin rastrear (untracked)

Carpetas:

- `Claude outputs/`
- `deepline/`
- `output/backup_premerge2_20260915_192825/`
- `output/backup_premerge_20260915_165828/`
- `output/backup_premerge_market_20260915_214706/`
- `output/backup_premerge_nhr_20260915_220202/`
- `output/backup_premerge_rune_20260917_095432/`
- `output/backup_supabase_merge_20260915_172435/`
- `output/backup_supabase_reassign_20260914_232517/`

Respaldos (`.bak`):

- `.claude/skills/prima-icp-check/SKILL.md.bak-preicpgate`
- `docs/index.html.bak-closed`
- `docs/index.html.bak-fupcontact`
- `docs/index.html.bak-needscontact`
- `docs/index.html.bak-percontact`

CSVs y notas:

- `output/apollo_micro_sample_20260915.csv`
- `output/cat3_batch_peoplesearch.csv`
- `output/cat3_fill_sample_committee.csv`
- `output/cat3_sample_paid_peoplesearch.csv`
- `output/cat4_sample_enriched_20260915.csv`
- `output/cat4_sample_staging_20260915.csv`
- `output/cat4_volume_staging_20260915.csv`
- `output/crustdata_batch_staging_20260916.csv`
- `output/crustdata_discovery_20260915.csv`
- `output/crustdata_excluded_offscope_20260916.csv`
- `output/crustdata_merge_final_20260916.csv`
- `output/crustdata_nhr_queue_20260916.csv`
- `output/firmographic_discovery_sample_20260915.csv`
- `output/gaby_committee_fill_staging.csv`
- `output/market_sizing_20260916.csv`
- `output/market_sizing_merge_final_20260916.csv`
- `output/merge_plan_20260915.csv`
- `output/nhr_reclaim_merge_final_20260916.csv`
- `output/paidsource_sample_20260915.csv`
- `output/provider_recon_sample_20260915.csv`
- `output/rune_energy_20260917.csv`
- `reference/icp-complement.md`

---

## 5.1 Verificación del trabajo de septiembre (antes del pull)

Se buscó explícitamente cada uno de estos 5 items de trabajo de septiembre, para confirmar que
seguían sin commitear y que el pull no los iba a pisar:

| Item | ¿Existe? | Dónde | ¿Ya en algún commit de `origin/main`? |
|---|---|---|---|
| `prima-icp-check/SKILL.md.proposed` | **No existe con ese nombre** en ningún lado del repo | — | N/A |
| `reference/icp-complement.md` | Sí, sin trackear | `reference/icp-complement.md` (overlay ICP de Gaby, aprobado 2026-09-15) | No — el path ni existe en `origin/main` |
| Cambios de CrustData | Sí, pero **no en `prima-generate-leads`** — están en el diff sin commitear de `.claude/skills/prima-icp-check/SKILL.md` (menciona CrustData como fuente de discovery gratis/paga) | `.claude/skills/prima-icp-check/SKILL.md` | No |
| "dropleads-first" | El término exacto no existe; sí hay una mención genérica a `dropleads` como uno de los proveedores del waterfall (Hunter/icypeas/dropleads), también dentro del diff sin commitear de **`prima-icp-check/SKILL.md`**, no en `prima-email-waterfall` | `.claude/skills/prima-icp-check/SKILL.md` | No |
| `relevance_gate` | Sí — como sección "Relevance gate" en `prima-icp-check/SKILL.md` (sin commitear) y como bloque `relevance_gate:` en `reference/icp-complement.md` (sin trackear) | ambos archivos arriba | No |

**Nota:** 3 de los 5 items (CrustData, dropleads, relevance_gate) viven todos en el mismo archivo
— `.claude/skills/prima-icp-check/SKILL.md` — no en `prima-generate-leads` ni
`prima-email-waterfall` como se esperaba. `SKILL.md.proposed` no existe como archivo; si se
refiere a otra cosa, avisar para buscarlo con otro nombre.

Ninguno de los 5 aparece en ningún commit de Zadrac ni en ningún commit de `origin/main` —
confirmado con `git show origin/main:<path>` y `git log --all -- <path>`. El pull no tocó nada de
esto.

**Respaldo hecho antes del pull:** `output/backup_prepull_20260927_123531/` — copia de los 5
archivos modificados + las ~37 entradas sin trackear (excepto `.env`, que está en `.gitignore` y
nunca se tocó). Verificado que no quedó ningún `.env` dentro del respaldo.

Después del pull (`git status`), los 5 archivos modificados y las ~37 entradas sin trackear siguen
exactamente igual que antes — el fast-forward no tocó nada del trabajo local.

---

## 6. Riesgo de conflicto

**No hay riesgo de conflicto. Cero archivos en común.**

Se cruzaron las dos listas y el resultado fue vacío en los dos sentidos:

| Comparación | Resultado |
|---|---|
| Archivos que toca Zadrac ∩ archivos modificados localmente | **vacío** |
| Archivos que toca Zadrac ∩ archivos nuevos sin rastrear | **vacío** |
| Commits locales sin subir que choquen | **ninguno** (0 commits adelante) |

Además, `git merge-base --is-ancestor HEAD origin/main` confirma que el `HEAD` local es antepasado
directo de `origin/main`: traer los cambios sería un **fast-forward limpio**, es decir, git solo
adelanta el puntero sin tener que fusionar nada ni crear un commit de merge.

**Sobre los archivos `.bak` de `index.html`:** hay cuatro respaldos locales
(`docs/index.html.bak-closed`, `-fupcontact`, `-needscontact`, `-percontact`) y Zadrac cambió mucho
`docs/index.html` (195 líneas). Para git no hay conflicto —son archivos con nombre distinto y ni
siquiera están rastreados—, pero vale saber que **esos respaldos quedaron viejos**: reflejan una
versión del cockpit anterior a las casillas Email/LinkedIn y al bloque de borradores. Si alguna vez
se restaura uno encima de `index.html`, se borraría el trabajo de Zadrac. No es un problema de git,
es una nota para no pisarlo a mano.

---

## 7. Qué se hizo y qué queda pendiente

El caso fue de los fáciles: **no hubo nada que resolver, solo adelantar.** Los cambios de Zadrac
viven en la app web (`docs/index.html`, `supabase/`, `README.md`) y el trabajo local en las skills
y los CSVs de leads — dos mundos separados del repo, cero archivos en común.

Ejecutado en esta sesión:

1. ✅ Respaldo de los 5 archivos modificados + ~37 entradas sin trackear en
   `output/backup_prepull_20260927_123531/` (sin tocar `.env`).
2. ✅ `git pull --ff-only origin main` — fast-forward limpio, sin conflictos, sin merge commit.
3. ✅ Confirmado que el trabajo local (los 5 modificados + lo sin trackear, incluido
   `reference/icp-complement.md`) sigue intacto después del pull.
4. ✅ Este archivo renombrado de `registro-cambios-zadrac-2026-09-27.md` a `registro-cambios.md` y
   convertido en registro acumulativo (una entrada nueva por cada pull futuro).
5. ✅ Entrada agregada en `app-cockpit-log.md` documentando los cambios de Zadrac al cockpit.
6. ✅ Regla nueva en `CLAUDE.md`: cada pull de otra persona deja una entrada aquí (y en
   `app-cockpit-log.md` si tocó la app).

Pendiente, sin ejecutar (decisión del usuario, no de esta sesión):

1. **Comitear el trabajo local.** Los 5 archivos modificados siguen sin commitear — es la red de
   seguridad barata antes de seguir tocándolos.
2. **Decidir qué hacer con lo sin trackear.** ~30 entradas entre carpetas de respaldo, muestras y
   CSVs de staging. Vale la pena separar en tres montones: lo que se comitea (ej.
   `reference/icp-complement.md`), lo que se agrega a `.gitignore` (`*.bak-*`,
   `output/backup_*/`, `Claude outputs/`) y lo que se borra.
3. **Probar el cockpit.** Entró una función de servidor nueva (`approve-draft`) que **escribe de
   verdad en el Google Sheet** al aprobar un borrador — conviene probarla con un contacto de
   prueba antes de confiar en ella con datos reales.

Ojo aparte: la regla "No comitear ni pushear sin autorización explícita" del README sigue vigente
en el repo — nada de esto se comiteó ni se subió en esta sesión.

---

*Entrada generada el 2026-09-27 con `git fetch`, `git pull --ff-only`, y comandos de lectura
(`git log`, `git diff`, `git status`, `git show`, `git merge-base`). Archivos tocados en esta
sesión: este registro (creado como reporte, luego renombrado a este archivo), `app-cockpit-log.md`
(nueva entrada), `CLAUDE.md` (regla nueva), y `output/backup_prepull_20260927_123531/` (respaldo).
Ningún otro archivo existente del repositorio fue modificado.*
