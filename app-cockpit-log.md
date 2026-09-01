# APP COCKPIT — Log de trazabilidad

_Memoria durable de la **app editable del cockpit de outreach** (Supabase + Vercel). Sistema aparte del engine — la app CONSUME lo que el engine produce, no lo reemplaza. Este archivo es la fuente de verdad: si reinicia la conversación (o retoma otro LLM), se arranca leyendo esto y NO se vuelve a preguntar lo ya decidido. Se actualiza al cierre de cada sesión. No se pisan los logs del engine._

---

## 0. ORIENTACIÓN RÁPIDA

- **Qué es:** app donde el equipo VE y EDITA su pipeline de outreach sin tocar el Sheet. Multi-usuario, login, datos en vivo, persistente.
- **Estado en una línea:** **APP EN VIVO Y FUNCIONAL.** Aldahir ya entra, ve su pipeline y **marca/guarda el stage de sus contactos** (trazabilidad real y guardable). Falta: bandeja de followups, correo para el equipo, edición ampliada.
- **URL en vivo:** `https://prima-gtm-skills.vercel.app`
- **Stack (decidido, no re-evaluar):** Supabase (DB + Auth + RLS) · Vercel Hobby (hosting, gratis).
- **Dónde vive el código:** repo `prima-gtm-skills`, archivo **`docs/index.html`** (se renombró de `cockpit-app.html` a `index.html` para que la raíz del sitio sirva el cockpit — ver aprendizaje #4). El backend vive en Supabase, no en el repo.

---

## 1. CÓMO TRABAJAR CON ALDAHIR

- Non-admin, aprende lo técnico sobre la marcha. UN paso a la vez, explicar en 1 línea qué hace cada cosa ANTES de correrla, decisiones en cajita, backup antes de cambios grandes, nunca asumir conocimiento técnico.
- **Credenciales las pone ÉL directo.** La `anon public` (empieza con `eyJ...`) es pública y segura en el navegador; la `service_role` NUNCA se usa.
- Español informal. Sesión corta por fase. Aviso antes de trabajo pesado para cambiar a Opus.
- **Descargas de archivos NO le funcionan bien** (baja la página de GitHub por error). Preferir: editar por GitHub web (lápiz), o que Claude Code escriba el archivo.

---

## 2. ESTADO ACTUAL — ✅ APP EN VIVO

### Backend (Supabase) ✅
- Proyecto `Aldchiw's Project`, plan FREE, East US. URL: `https://axknjzbiteuwrjpbuows.supabase.co`.
- 3 tablas (`accounts`, `contacts`, `users`) con RLS. 160 cuentas + 275 contactos migrados (snapshot del Sheet). Dueños asignados: Aldahir 103 / Manuel 34 / Gustavo 19 / Gaby 4.
- **RLS por CORREO** (no por id — Magic Link genera id propio). Políticas activas:
  - LEER: roster, cuentas propias, contactos de cuentas propias.
  - **ESCRIBIR: `update stage of own contacts`** (permite editar los contactos de las cuentas propias — habilita el guardado del stage).
- `stage` es enum de texto: Not Contacted, First Touch (Email), First Touch (LinkedIn), FUP 1..10, Replied.
- Login: **Magic Link** funcionando. **Site URL = `https://prima-gtm-skills.vercel.app`** (la raíz), Redirect URL `.../**`.

### Frontend (la app, en vivo) ✅
- Es el cockpit real de Aldahir (su diseño, paleta, estructura por categoría, secuencia) cableado a Supabase. NO se rehízo el diseño.
- **Login Magic Link** → entra y ve SOLO sus 103 cuentas (RLS funciona).
- **Stage EDITABLE y GUARDABLE:** cambia el menú de stage de un contacto → se guarda en Supabase con aviso "Guardado ✓" (verde) o "Error al guardar" (rojo). Verificado: aguanta al recargar. **Esta es la trazabilidad real que Aldahir pidió.**
- Mapeo stage texto<->número: `stageFromText` (Supabase->UI) y `stageToText` (UI->Supabase). First Touch->1, FUP1->2, FUP2->3, FUP3+/Replied->4. Simplificación conocida (el 1 no distingue Email/LinkedIn; el 4 colapsa FUP3+/Replied).
- **La sesión persiste** semanas en el navegador: para su uso diario, Aldahir NO tiene que pedir Magic Link cada vez — entra una vez y de ahí solo abre la URL.

---

## 3. SIGUIENTES METAS (en orden)

### ⭐ 1. BANDEJA DE HOY (timer de followups) — SIGUIENTE FASE, ya diseñada
Sección PRINCIPAL que le diga a Aldahir a qué contactos les toca followup. Diseño cerrado (ver sección 4).

### 2. Fase de edición ampliada
Hoy solo el stage guarda. Falta poder editar/guardar notas, team_status, y marcar toques con su fecha.

### 3. Correo real (Resend) — para que el EQUIPO entre
- Hoy solo Aldahir usa la app (su sesión persiste). El equipo no puede entrar seguido por el límite de **2 correos/hora** del tier gratis de Supabase (fijo, no se puede subir sin SMTP propio).
- **CORRECCIÓN a lo dicho antes:** NO necesariamente hay que pedir el dominio `prima.ai` a los admins. Resend permite verificar un subdominio o un dominio propio que Aldahir controle, sin tocar el `prima.ai` principal. Se puede montar con permisos propios. (Antes se sobreestimó como bloqueo de infra — no lo es.)
- Resend free: 3,000/mes, 100/día, permanente, sin tarjeta. Requiere verificar un dominio (registros SPF/DKIM) para mandar a cualquiera.

### 4. Mandar correos de outreach DESDE la app — PARQUEADO
Aldahir lo pidió, pero: (a) el envío es el carril de **Zadrac** (SDR Bot, deliverability con Mike), (b) toca guardrails de volumen/cadencia, (c) es una fase grande de verdad. **No hacer sin sign-off de Zadrac.** El template no le interesa a Aldahir; quiere envío directo — razón de más para coordinarlo con Zadrac.

### 5. ⭐ Sync en vivo engine->Supabase — PRIORIDAD MÁXIMA post-MVP (ya comprometido)
Hoy la migración es snapshot manual. Debe preservar los `stage`/fechas que Aldahir edite.

### 6. Cosméticos
- "Signal: null" cuando no hay señal (mapeo, fácil).
- Refactor stage en dos campos (`cadence_step` + `status`) cuando se construya la métrica reina.

---

## 4. DISEÑO CERRADO — "BANDEJA DE HOY" (para construir la próxima)

**Objetivo:** una sección principal que muestre a qué contactos les toca followup, para que Aldahir priorice sin llevar el conteo en la cabeza.

**Reglas (confirmadas por Aldahir):**
- **Ritmo FIJO: 1 followup cada 7 días.** No es variable.
- **El TIPO de toque varía** (a veces LinkedIn, a veces correo, a veces 3 correos) y lo decide Aldahir en el momento. La app NO prescribe QUÉ mandar, solo avisa QUE toca.
- **El flujo de un contacto ARRANCA cuando Aldahir marca su primer toque.** Un contacto en "Not Contacted" no está en ningún timer.
- **Timer:** cuenta 7 días desde el último toque marcado.
  - Días 1-7: "en tiempo", NO aparece en la bandeja.
  - Día 8 en adelante: "vencido" -> aparece en la bandeja.
- **Contador de delay:** empieza en el día 8. Día 8 = "1 día de delay", día 9 = "2 días", etc. Se muestra al lado de cada contacto vencido. Más delay = más urgente.
- **La bandeja muestra PRIMERO los vencidos.** Los futuros (aún no vencidos) se ven aparte; Aldahir decide cuándo arrancar ese flujo.

**PRERREQUISITO TÉCNICO (imprescindible, hoy NO existe):** hay que **guardar la FECHA de cada cambio de stage** (ej. columna `last_touch_at` o `stage_updated_at` que se setee en cada update de stage). Hoy solo se guarda el valor del stage, no cuándo se puso. Sin esa fecha, el timer no puede calcular "días transcurridos". Este es el primer paso de esta fase.

---

## 5. APRENDIZAJES CLAVE

1. **RLS cruza por CORREO, no por id** (Magic Link genera id propio). Toda política nueva debe seguir este patrón.
2. **Choque de nombre `supabase`:** la librería del CDN ya define la global `window.supabase`. El cliente propio debe llamarse `sb`, no `supabase` (si no: "Identifier 'supabase' has already been declared" y truena todo el JS).
3. **`stage` es texto en Supabase, número 0-4 en la UI.** Convertir en ambos sentidos.
4. **El archivo debe llamarse `index.html`** (no `cockpit-app.html`): así la raíz del sitio sirve el cockpit. Antes, el Magic Link regresaba a la raíz vacía y daba **404** (el token llega en el `#` de la URL y no se traslada solo a otra ruta). Con `index.html` + Site URL en la raíz, el 404 se acabó.
5. **VERCEL BLOQUEA los commits de Claude Code.** El plan Hobby no despliega commits cuyo autor sea `aldahirchiw-spec` (Claude Code) — los marca "Blocked". **Workaround (recurre en CADA commit de Claude Code que se quiera desplegar):** después de que Claude Code pushea, Aldahir hace un mini-commit trivial por GitHub web (un espacio en `docs/index.html` -> Commit) para que el autor del último commit sea él y Vercel lo despliegue. Para docs (.md) no importa el bloqueo, la producción sigue en el último deploy bueno.
6. **Guardado seguro:** primero escribir en Supabase, y SOLO si no hay error actualizar la memoria y avisar "Guardado ✓". Nunca decir "guardado" si falló.
7. **Límite de correo del tier gratis = 2/hora, FIJO** (no editable sin SMTP propio). Quemó muchos intentos hoy. La sesión persiste, así que a Aldahir solo le pega al primer login o si hace Sign out.
8. **Git:** las subidas por GitHub web crean commits que la copia local no ve -> divergencia. Resolver con `git pull --rebase` (no merge). Pasó varias veces esta sesión.

---

## 6. DECISIONES REGISTRADAS

- **Bandeja de hoy:** ritmo fijo 7 días, tipo de toque libre, flujo arranca al marcar primer toque, muestra vencidos primero, contador de delay desde el día 8. (Ver sección 4.)
- **Correo real** es solo para el EQUIPO; para Aldahir solo, la sesión persistente basta. Y NO depende obligatoriamente de admins (Resend con dominio/subdominio propio).
- **Envío de outreach desde la app:** parqueado hasta sign-off de Zadrac (su carril).
- **Registro de memoria va en `app-cockpit-log.md` (repo), NO en el README.** El README describe el repo; la memoria del proyecto vive aquí. No depender de la memoria del LLM.

---

## 7. CHECKLIST DE CIERRE DE SESIÓN
1. Este log actualizado (estado, metas, aprendizajes, decisiones).
2. Nada a medias en Supabase ni en el deploy.
3. Repo pusheado (y si el commit fue de Claude Code, mini-commit de Aldahir para destrabar Vercel).
4. Prompt de arranque para la próxima.

---

## 8. BITÁCORA POR SESIÓN

### Sesión 2026-08-25 — App en vivo + tracking guardable
- Se cableó el cockpit real a Supabase (login Magic Link + datos en vivo), se desplegó en Vercel, y **quedó EN VIVO** en `prima-gtm-skills.vercel.app`.
- Vía crucis técnico resuelto: bug `supabase` duplicado (->`sb`), deploy bloqueado por autor (workaround del mini-commit), 404 del Magic Link (-> renombre a `index.html` + Site URL en raíz), límites de correo.
- **Stage editable y guardable en Supabase** con aviso "Guardado ✓" — trazabilidad real lograda. Se agregó la política RLS de escritura.
- Se diseñó (cerrado) la **bandeja de hoy** (sección 4).
- **Siguiente:** construir la bandeja de hoy — empezar por guardar la fecha de cada cambio de stage.
- **Prompt de arranque próxima sesión:**
  _"Seguimos la app del cockpit (ya EN VIVO en prima-gtm-skills.vercel.app, código en docs/index.html, stage ya editable y guardable en Supabase). Toca construir la 'bandeja de hoy': ver app-cockpit-log.md sección 4 para el diseño cerrado. El primer paso es guardar la FECHA de cada cambio de stage (hoy no se guarda). Guíame paso a paso, un paso a la vez. Ojo: Vercel bloquea commits de Claude Code, hay que hacer mini-commit por GitHub web para destrabar (ver aprendizaje #5)."_

### Sesión 2026-08-29 — Bandeja de followups completa + todo en inglés
- **Sección "Followups"** (vencidos, arriba del pipeline) construida y funcionando, agrupada por categoría con los mismos encabezados que el pipeline.
- **Botón "Done"**: avanza el FUP real (`nextStageText`, tope FUP 10) y reinicia el timer de 7 días (`last_touch_at` a ahora) — mismo patrón seguro que el resto (Supabase primero, memoria solo si no hay error).
- **Botón "Start sequence"** en el pipeline: al hacer click ofrece elegir canal (Email/LinkedIn), arranca el contacto en "First Touch" correspondiente.
- **Las cuentas en secuencia salen del pipeline**: una cuenta con al menos un contacto en stage > 0 ya no aparece en el pipeline "frío" ni en sus contadores (All/Cat 1-4/My leads).
- **Tile "In sequence" clickeable**: alterna `state.view` entre "pipeline" (cuentas frías) e "insequence" (cuentas ya en flujo) — mismo diseño que los otros tiles, contador propio.
- **Footer condicional por tarjeta**: si la cuenta NO está en secuencia -> "Start sequence"; si SÍ está -> FUP real + días desde el último toque + botón "Done" (reusa la misma lógica de Followups, sin duplicar).
- **Toda la interfaz traducida a inglés** (textos de followups, avisos de guardado/error, etiquetas de delay).
- Se detectó (no resuelto, documentado): `accountInSequence` decide membresía del pipeline solo por `stage > 0`, pero el footer/badge necesita además `last_touch_at`. Cuentas con stage>0 sin fecha registrada (datos viejos, previos a esta columna) podrían quedar con footer vacío. No se tocó porque no había caso real confirmado.
- **Siguiente:** atacar el `deep-analysis-cockpit.md` (pendiente de crear/definir alcance).
- **Prompt de arranque próxima sesión:**
  _"Seguimos la app del cockpit (EN VIVO en prima-gtm-skills.vercel.app, código en docs/index.html). La bandeja de followups ya está completa: sección Followups arriba, botón Done, Start sequence con picker de canal, cuentas en secuencia fuera del pipeline, tile 'In sequence' con vista alternable, footer condicional, todo en inglés. Toca el deep-analysis de la app — revisa deep-analysis-cockpit.md (o ayúdame a definir su alcance si no existe todavía). Guíame paso a paso, un paso a la vez. Ojo: Vercel bloquea commits de Claude Code, mini-commit por GitHub web para destrabar (aprendizaje #5)."_

### Sesión 2026-08-30 — Acciones de cierre + comentarios por FUP (modal)
LOGRADO (en vivo y comiteado):
- Enum `stage_enum`: agregado "Stopped". Acción "Stopped" con confirmación cierra contacto, sale del flujo. NO toca `last_touch_at`.
- `isClosed()`/`accountAllClosed()`: Replied/Stopped salen de Followups y de "in sequence"; cuenta 100% cerrada solo en Closed.
- Vista "Closed" (tile + apartado, badge por contacto).
- Bug arreglado: "Done" no se cableaba en `renderSections` (In sequence) — factorizado en `bindCloseActions()`.
- "Replied" ESCONDIDO (no borrado): responder NO cierra. `markReplied()` sigue wired.
- Tabla "touches" en Supabase (`contact_id` uuid FK, `fup_label`, `comment`, `replied`, `created_at`, `updated_at`; UNIQUE contact_id+fup_label; RLS por correo; un comentario por FUP vía upsert).
- Comentarios por FUP en MODAL: click en área muerta de tarjeta en flujo, fondo difuminado, Escape/click-fuera cierra. Historial First Touch→FUP actual ("No comment yet" en gris) + zona de escritura del FUP actual con Replied (no cambia stage).
- Bug del modal arreglado: listener pasó de `document.querySelector(".wrap")` (agarraba el del header) a `el("#list").parentElement`.

PENDIENTES PRÓXIMA SESIÓN (pedidos por Aldahir al cierre):
1. EDITAR comentarios de FUP ANTERIORES (hoy el historial es solo-lectura; solo el FUP actual se edita).
2. Limpiar la barrita vieja E1·LI·E2·E3 de la tarjeta (topada en 4, se contradice con FUP reales altos) — paso #2 del deep-analysis.
3. Seguridad menor: escapar el texto del comentario en el HTML del modal si algún día hay datos de terceros (hoy no urge).

- **Prompt de arranque próxima sesión:**
  _"Seguimos la app del cockpit (EN VIVO, docs/index.html). Comentarios por FUP ya funcionan en modal (click en tarjeta en flujo, historial + escritura del FUP actual, tabla 'touches'). Toca: (1) hacer EDITABLES los comentarios de FUP anteriores del historial; (2) limpiar la barrita E1·LI·E2·E3 que se contradice con FUP reales (paso #2 del deep-analysis). Guíame paso a paso, un paso a la vez. Ojo: Vercel bloquea commits de Claude Code, mini-commit por GitHub web para destrabar (aprendizaje #5)."_

### Sesión 2026-08-30 (parte 2) — Editar comentarios de FUP anteriores + diseño del sync
LOGRADO (en vivo y comiteado):
- Historial del modal ahora EDITABLE por item: "Edit" en FUP con comentario, "Add comment" en vacíos. Edición en su lugar (textarea + Replied + Save + Cancel), reusando `saveComment()`. Listener delegado en `#touchModal`; `openTouchModal` setea `dataset.contactId`. Verificado en vivo, persiste al recargar.

DISEÑO DEL SYNC engine→Supabase — CERRADO (listo para construir, NO empezado):
- REGLA DE ORO: el equipo siempre gana. El sync NUNCA toca: `stage`, `last_touch_at`, `team_status`, `notes`, todo `touches`, ni los id UUID.
- QUÉ HACE: por cada lead del CSV (`output/leads_master.csv`) — si es nuevo, INSERT; si existe, UPDATE solo de campos engine-owned.
- ENGINE SOBRESCRIBE los campos engine-owned (no solo llena vacíos), para mantener señal/email/título frescos.
- Campos ENGINE-OWNED (el sync actualiza): `domain`, `company_category`, `sub_segment`, `priority`, `vertical_owner`, `excluded`, `exclusion_reason`, `scope_tier`, `signal_source`, `signal_detail`, `signal_url`, `signal_date`, `contact_title`, `priority_tier`, `linkedin_url`, `contact_email`, `email_status`.
- Campos PROTEGIDOS (nunca se tocan): `stage`, `last_touch_at`, `team_status`, `notes`, `touches` (todo), id UUID.
- NO es overwrite (a diferencia de `sync-sheet.js`) — es quirúrgico fila por fila, para preservar UUID y datos del equipo. Un DELETE+rewrite mataría stage/comentarios/FKs.
- MATCH KEY: `account_name|contact_name` (mismo que `sync-sheet.js`).
- GUARD: filas con key "`<account>`|" (sin contact_name) se SALTAN con aviso, nunca se matchean a ciegas (evita colisión silenciosa que borra datos). Hay ~38 filas así.
- DISPARO: manual (`node scripts/sync-supabase.js`) por ahora; diseñado para volverse automático cuando se defina cadencia.
- CREDENCIAL: necesita `SUPABASE_SERVICE_ROLE` key (bypassa RLS, escribe en cuentas de todos). HOY NO EXISTE — hay que crearla en Supabase. Va en archivo gitignored o env var, la pone Aldahir directo (nunca en chat). `.gitignore` ya reserva `.env`/`*.key`. El script solo corre local.
- PRIMERA CORRIDA es la de mayor riesgo (toca prod con datos reales) — se prueba sobre respaldo ANTES de correr contra prod.

PENDIENTES QUE SIGUEN VIVOS:
1. Limpiar la barrita vieja E1·LI·E2·E3 de la tarjeta (topada en 4, se contradice con FUP reales altos) — paso #2 del deep-analysis.
2. Seguridad menor (no urge): escapar el texto del comentario en el HTML del modal/historial si algún día hay datos de terceros (hoy datos propios).
3. Resend (correo para el equipo), edición ampliada (notas/team_status).

- **Prompt de arranque próxima sesión:**
  _"Arrancamos el SYNC engine→Supabase (diseño ya cerrado en app-cockpit-log.md, sesión 2026-08-30 parte 2). Orden: (1) PRIMERO crear la SUPABASE_SERVICE_ROLE key en Supabase y ponerla segura (gitignored/env, confirmar que .gitignore la bloquea ANTES de que exista); (2) Claude Code escribe scripts/sync-supabase.js según el diseño (regla de oro: equipo gana, engine sobrescribe engine-owned, quirúrgico no overwrite, match account_name|contact_name, guard para filas sin contact_name); (3) auditar el script; (4) probar sobre respaldo, NO correr contra prod hasta verificar. Paso a paso, uno a la vez. Vercel bloquea commits de Claude Code, mini-commit por GitHub web para destrabar."_

### Sesión 2026-08-31 — Sync engine→Supabase CONSTRUIDO Y APLICADO
LOGRADO (en producción, funcionando):
- Credencial SUPABASE_SERVICE_ROLE creada y puesta en .env (raíz, gitignored, confirmado que git no la ve). Se maneja solo local, nunca en chat.
- scripts/sync-supabase.js escrito, auditado y comiteado (commit 344ccb8). package.json + package-lock.json agregados (@supabase/supabase-js).
- REGLA DE ORO implementada en 3 capas: payloads solo leen de listas engine-owned; assertNoProtectedColumns() lanza error si una protegida se cuela; stage solo se pone en INSERT de contacto nuevo, nunca en UPDATE. Protegidas: contacts.stage/last_touch_at/team_status/notes, accounts.assigned_user_id, ids, tabla touches entera.
- DRY-RUN por defecto; --apply para escribir. Guard de contact_name vacío (38 filas saltadas del lado contacts, la cuenta sí entra). Guard simétrico de account_name.
- Fix aplicado: columnas boolean (excluded, needs_manual_scope_confirmation) recibían "" del CSV → Postgres las rechazaba. toBoolean() convierte "" y "no" → false.
- APLICADO a prod: 160 accounts + 237 contacts actualizados, 0 insertados, 38 saltados. Respaldo (export CSV de accounts/contacts/touches) hecho ANTES del --apply.
- VALIDADO en vivo: stages y comentarios del equipo INTACTOS tras el sync. La regla de oro funcionó en producción.

CÓMO CORRERLO EN EL FUTURO:
- node scripts/sync-supabase.js  → dry-run (reporte, no escribe)
- node scripts/sync-supabase.js --apply  → escribe de verdad
- Requiere: .env con SUPABASE_URL + SUPABASE_SERVICE_ROLE, y npm.cmd install (npm bloqueado por ExecutionPolicy, usar npm.cmd o Set-ExecutionPolicy -Scope Process -Bypass).
- SIEMPRE respaldar (export CSV de las 3 tablas) antes de --apply.

PENDIENTES QUE SIGUEN VIVOS:
1. Sync AUTOMÁTICO (hoy es manual) — cuando se defina cadencia. Era la meta post-MVP; el manual ya está.
2. Barrita vieja E1·LI·E2·E3 (paso #2 deep-analysis).
3. Escapar texto de comentarios en HTML (seguridad menor).
4. Resend (correo para el equipo). Edición ampliada notas/team_status.

- **Prompt de arranque próxima sesión:**
  _"El sync engine→Supabase ya está construido y aplicado (scripts/sync-supabase.js, regla de oro validada en prod). Corre manual con node scripts/sync-supabase.js [--apply], respaldar siempre antes de --apply. Opciones para lo siguiente: (a) sync automático (cadencia), (b) limpiar barrita vieja E1·LI·E2·E3 del cockpit (paso #2 deep-analysis), (c) Resend para meter al equipo. Paso a paso, uno a la vez."_

### Sesión 2026-08-31 — Sync engine→Supabase + ronda de fixes de la app
SYNC (lo grande, en producción):
- Ver detalle completo en la entrada del sync de hoy (script scripts/sync-supabase.js, regla de oro validada en prod, 160 accounts + 237 contacts actualizados, respaldo hecho, dry-run + apply). Correr con: node scripts/sync-supabase.js [--apply]. Respaldar (export CSV de accounts/contacts/touches) SIEMPRE antes de --apply. .env con SUPABASE_URL + SUPABASE_SERVICE_ROLE (gitignored). npm bloqueado por ExecutionPolicy → usar npm.cmd.

FIXES DE LA APP (todos en vivo, comiteados):
1. Links rotos: normalizeUrl() antepone https:// a URLs sin esquema (recuperó ~136 linkedin_url sin protocolo); no pinta <a href=""> vacíos (bug de "source" que reabría el cockpit).
2. Señales limpias: classifySignal() distingue news/firmographic/icp/none. Firmographic/ICP se muestran como badge gris limpio ("Firmographic fit"/"ICP validated"), sin el texto técnico crudo ni el "999d" falso. Solo noticias reales cuentan como fresh() y se ordenan por frescura (signalSortAge).
3. Contactos huérfanos: isRealContact()/realContactsOf() — los ~38 contactos sin nombre (placeholders de TAM sin contacto verificado) ya no se pintan como "null · —"; la cuenta muestra "No contact identified yet" y no entra a secuencia/Followups. Aplicado en activeContactOf, accountInSequence, worstInFlowContact, contactBlock.
4. Dragonfly Energy: era un huérfano con stage "First Touch" por datos viejos — reseteado a "Not Contacted" en Supabase (write manual puntual). OJO: el cockpit abierto en el navegador puede re-pisar un write directo a Supabase; cerrar el cockpit antes de writes manuales.
5. NEWS FEED (nuevo): el tile "Fresh signals" ahora abre un muro de noticias (state.view="newsfeed", renderNewsFeed/newsCardHtml). Muestra las noticias reales de las cuentas del usuario, más fresca arriba, con "Xd ago" + "Read →" (link a la fuente) + "View in pipeline →". Solo type==="news". El tile cuenta las mismas señales que el muro (sobre myAllLeads).

PENDIENTES / SIGUIENTE:
1. ENGINE (próxima, canal engine): refrescar noticias viejas (muchas señales tienen fechas de 100-500+ días) y buscar source para cuentas sin noticia. Cuando el engine actualice el CSV, correr el sync y el muro mostrará lo fresco. Esto NO es del cockpit.
2. Cosmético menor: en la vista newsfeed, los chips de categoría y el selector de Sort siguen visibles pero no afectan al muro — esconderlos cuando state.view==="newsfeed" (cambio chico) si molesta.
3. De antes: sync automático (cadencia), barrita vieja E1·LI·E2·E3 (paso #2 deep-analysis), Resend (correo equipo), escapar texto de comentarios en HTML.
4. IDEA — historial de noticias por cuenta (ver nota completa abajo): fase engine+cockpit, no arrancada.

### IDEA PARA SESIÓN DE ENGINE — Historial de noticias por cuenta (acumular)
Aldahir quiere que las noticias se ACUMULEN por cuenta (historial), no que se sobrescriban, y verlas en un modal como el de FUPs (todas las recaudadas + su fecha/antigüedad). Es una fase de engine + cockpit, se arranca en el canal del engine:
- TABLA NUEVA "signals" en Supabase: 1 fila por noticia (account_id FK, signal_detail, signal_url, signal_date, detected_at, created_at). RLS por cuenta como touches. UNIQUE (account_id, signal_url) para no duplicar.
- ENGINE cambia de sobrescribir a ACUMULAR: hoy produce 1 señal/cuenta y el sync la pisa. Decisión a cerrar en engine: accounts.signal_detail sigue siendo "la más reciente" (para pipeline/muro) y signals guarda el historial completo (probable).
- sync-supabase.js aprende a insertar en signals además de actualizar accounts; regla de oro se mantiene.
- MODAL de historial en cockpit: reusa el patrón del modal de comentarios (touches). Abre una cuenta → ve todas sus noticias acumuladas, freshest first, con fecha + antigüedad.
- Conecta con "refrescar noticias viejas" (ya anotado): cuando el engine corra a refrescar, en vez de pisar, acumula.

- **Prompt de arranque próxima sesión:**
  _"Cockpit EN VIVO (docs/index.html) con sync engine→Supabase funcionando (node scripts/sync-supabase.js [--apply], respaldar antes) y news feed en el tile Fresh signals. Lo siguiente es de ENGINE, no cockpit: refrescar las noticias viejas del CSV (fechas de 100-500+ días) y buscar señal/source para cuentas sin noticia, luego correr el sync para que el muro las muestre frescas. Alternativas de cockpit si se prefiere: sync automático, o limpiar la barrita E1·LI·E2·E3. Idea grande pendiente (no arrancada): historial acumulado de noticias por cuenta (tabla signals nueva + modal tipo FUPs) — ver nota completa en la sesión 2026-08-31. Paso a paso."_

### Sesión 2026-08-31 (cont.) — Ronda de fixes + features de la app
LOGRADO (todo en vivo, comiteado):
- News feed: split "New" (<30d) / "All signals". Tile "Fresh signals" cuenta las nuevas (<30d). "You're all caught up" si no hay nuevas.
- "In sequence" ordenado por toque más reciente arriba (latestInFlowTouchMs).
- "View in pipeline" del news feed: scrollea + resalta (card-flash) la cuenta destino. data-account en todas las cards.
- Vista "Needs contact": cuentas sin contacto real (realContactsOf===0, ~38 cuentas de TAM sin contacto). Acceso como ENLACE discreto bajo los tiles (no 5º tile, para no amontonar). Es la "sala de espera" para pasarles el engine.
- Fixes previos de la sesión: links (normalizeUrl), señales limpias (classifySignal firmographic/ICP/news), contactos huérfanos (isRealContact), Dragonfly reseteado.

DATO PARA EL ENGINE: las cuentas "Needs contact" son consultables directo de Supabase (cuentas con todos sus contactos null). El engine las usa para saber a quién enriquecer. NO se necesita columna needs_contact nueva (es derivable) — decisión a confirmar en canal engine.

SIGUIENTE (canal NUEVO de engine): (1) correr engine/skills para enriquecer "Needs contact" (contacto+email) y refrescar noticias viejas; (2) sync a Supabase (respaldar antes); (3) automatizar el sync eventualmente. FEATURE a diseñar: agregar leads de OTRO source, categorizados por origen, con una vista/entrada nueva en el cockpit que solo les pase los skills de enriquecimiento.

IDEA PENDIENTE (canal engine): historial de noticias por cuenta que se ACUMULE (tabla signals nueva + engine acumula en vez de sobrescribir + modal como el de FUPs). Ver nota de sesión anterior.

- **Prompt de arranque próxima sesión:**
  _"Cockpit EN VIVO (docs/index.html). Esta sesión cerró: news feed New/All split (<30d), In sequence ordenado por toque más reciente, View in pipeline con scroll+resalte, y la vista Needs contact (enlace discreto bajo los tiles, ~38 cuentas de TAM sin contacto). Lo que sigue es un canal NUEVO de ENGINE: enriquecer Needs contact (contacto+email) y refrescar noticias viejas, luego sync a Supabase (respaldar antes). También hay una feature a diseñar: agregar leads de otro source, categorizados por origen, con su propia entrada en el cockpit para pasarles solo los skills de enriquecimiento. Pendiente aparte (no arrancada): historial acumulado de noticias por cuenta (ver sesión 2026-08-30 parte 2). Paso a paso."_

## 2026-09-01 — Enriquecimiento Needs-contact — MUESTRA (5 Cat4)
- Recon: 34 Needs-contact (32 Cat4, 2 Cat1), todas sin nombre y sin email.
- Deepline 22.35 -> 21.45 cr (0.90 gastado; committee=0, email=0.90).
- 5/5 nombres gratis (wiza free); 3/5 emails VERIFIED Hunter @0.3cr; 2/5 miss $0.
- Calidad 5/5 persona correcta por sub_segment (4B->purchasing, 4C->founder).
- Costo/lead enviable = 0.3cr = $0.03. Presupuesto NO es cuello de botella.
- FLAG: prima-committee no soporta 4A/4D. FLAG: MGM domain mgmtransformer.com (sin s).
- Outputs: needs_contact_sample.csv. master + Supabase intactos, sin push.

## 2026-09-01 — Enriquecimiento Needs-contact — BATCH (27 Cat4 restantes)
- Distribucion sub_segment de las 32 Cat4: 4A=3, 4B=7, 4C=4, sin clasificar=18. (+2 Cat1.)
- Procesables 4B/4C fuera de muestra = 6. Committee: 5/6 nombre; 1 name_not_found_free (Pioneer Custom Electrical, sin persona de compras en wiza).
- Email: 3/5 VERIFIED Hunter @0.3cr (TMC, Heron Power, XL Batteries); 2/5 miss $0 (FuelCell, Panasonic).
- 4A saltadas sin gasto: Mitsubishi Electric Power Products, Hitachi Energy, Voltaris.
- 18 sin sub_segment: NO procesadas (sin arquetipo no hay persona). Marcadas sub_segment_missing. Unlock = prima-icp-check.
- Gasto batch 0.90 cr; saldo 21.45 -> 20.55. Sesion total 1.80 cr (22.35 -> 20.55).
- Fixes dominio (sync): FuelCell->fuelcellenergy.com; Panasonic->panasonicnv.com; XL->xlbatteries.com; MGM->mgmtransformer.com. REVISAR (no auto): TMC .us vs contacto en .com (SPA Italia).
- Outputs: needs_contact_batch.csv. master + Supabase intactos, sin push.

## 2026-09-01 — Clasificación 18 + enriquecimiento final + CIERRE (canal engine)
CLASIFICACIÓN 18 sin sub_segment (prima-icp-check, Notion+WebSearch, $0):
- IN (4): Dragonfly Energy 4B/P1, Trojan Battery 4B/P1, GTI Energy 4A/P2, Forgent Power Solutions 4A/P2.
- OUT de ICP (11, no fabricantes): Continental Battery Systems, Avangrid Renewables, Atlas Renewable Energy, LS Power, Recurrent Energy, Pattern Energy, REC Solar, Ecobat, EcoFlow, iTECH, Stone Martin Builders.
- Undeterminadas (3): Cleveland-Cliffs (planta transf. pausada), National Power Corp, Ocean Power Technologies.
- DEDUP: Forgent Power Solutions = matriz de MGM/VanTran (ya enriquecida 4B) → no tratar como cuenta aparte.
ENRIQUECIMIENTO batch2 (tope 2cr):
- Dragonfly Energy: Brice Bergen, Production Mgr (⚠ SECUNDARIA, no purchasing). Email VERIFIED brice@dragonflyenergy.com (Hunter 0.3cr).
- Trojan Battery: Alison Fregeau, Director of Procurement (persona ideal). Email MISS $0.
DISPOSICIÓN FINAL 34 Needs-contact:
- Enviables (nombre+email): 7 → Stryten, MGM, DG Matrix, Heron Power, XL Batteries, TMC(⚠entidad), Dragonfly(⚠persona).
- Solo-nombre: 5 → Enercon, Exowatt, FuelCell, Panasonic, Trojan.
- Sin persona: 1 → Pioneer Custom Electrical.
- 4A atoradas (committee no soporta): 4 → Mitsubishi EPP, Hitachi Energy, Voltaris, GTI Energy.
- OUT de ICP (a excluir): 11. Undeterminadas: 3. Cat1 (committee aparte): 2.
HALLAZGO: "Needs contact" era 61% de las sin-clasificar FUERA de ICP (no-fabricantes que entraron como Cat4). Cuello de botella real = límite de committee en 4A + contaminación de sourcing, NO presupuesto. Engine 4B/4C barato y con persona correcta (committee gratis wiza, email 0.3cr, 7/12 nombrados con email ~58%).
GASTO SESIÓN: 2.10 cr (22.35 → 20.25). Clasificación $0.
PENDIENTES próxima sesión: (1) merge a leads_master + SYNC a Supabase con RESPALDO antes de --apply; (2) fixes dominio FuelCell/Panasonic/XL/MGM + REVISAR TMC (.us vs .com SPA Italia); (3) excluir 11 OUT + ver cómo entraron; (4) dedupe Forgent=MGM; (5) arreglar committee 4A; (6) committee 2 Cat1; (7) refrescar noticias viejas ($0 WebSearch, quedó pendiente).
Enriquecidos viven en output/needs_contact*.csv — NADA en leads_master ni Supabase todavía.

## 2026-09-01 — Needs-contact: clasificacion 18 + batch2
- CLASIF 18 (icp-check, $0): IN 4 (Dragonfly 4B, Trojan 4B, GTI Energy 4A, Forgent 4A); OUT 11 (Continental Battery, Avangrid, Atlas Renewable, LS Power, Recurrent, Pattern Energy, REC Solar, Ecobat, EcoFlow, iTECH, Stone Martin); undeterminadas 3 (Cleveland-Cliffs, National Power, Ocean Power). DEDUP: Forgent = matriz de MGM/VanTran (ya hecha) -> no tratar aparte.
- BATCH2 (tope 2cr): Dragonfly -> Brice Bergen (Production Mgr, SECUNDARIA no purchasing), email VERIFIED brice@dragonflyenergy.com (Hunter 0.3cr). Trojan -> Alison Fregeau (Dir. Procurement, ideal), email MISS $0.
- DISPOSICION 34: enviables 7 (Stryten, MGM, DG Matrix, Heron, XL Batteries, TMC*, Dragonfly*); solo-nombre 5 (Enercon, Exowatt, FuelCell, Panasonic, Trojan); sin persona 1 (Pioneer); 4A atoradas 4 (Mitsubishi EPP, Hitachi Energy, Voltaris, GTI Energy); OUT 11; undeter 3; Cat1 aparte 2.
- HALLAZGO: 61% de las sin-clasificar estaban FUERA de ICP. Cuello real = limite committee 4A + contaminacion sourcing, no presupuesto.
- GASTO SESION: 2.10cr (22.35->20.25).
- PENDIENTES: merge a master + SYNC Supabase con respaldo; fixes dominio FuelCell/Panasonic/XL/MGM + revisar TMC; excluir 11 OUT; dedupe Forgent=MGM; committee 4A; 2 Cat1; refrescar noticias $0. Enriquecidos en output/needs_contact*.csv, nada en master/Supabase.
- SIGUE EN ESTA SESION: ingesta value_chain_map como source nuevo.
