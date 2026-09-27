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
- **Regla de asignación de dueños (Cat1-4):** Cat1+Cat2: existentes 80% Gus / 20% Gaby (determinista idx%5==4 -> Gaby); nuevas 70% Gus / 30% Gaby. El sweep de 100% Gus (2026-09-09) queda SUPERSEDED — no re-correr. Cat3/Cat4 igual.

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

## 2026-09-01 (cont) — value_chain_map ENRIQUECIDO (sample + batch)
- Sample 8 (1.80cr): 7/8 nombre; 5 VERIFIED (Eaton, Hyperscale Power, Fluence, Flexgen, Solar Turbines); 1 catch-all (Kiewit); 1 miss (Vertiv); 1 no-name (Enchanted Rock).
- Batch 67 (11.40cr): 58/67 nombre (86.6%); email 20 VERIFIED, 18 FOUND_UNVERIFIED (catch-all), 20 NOT_FOUND; 9 name_not_found_free (Centrax, Clarke Energy, Delta, FTAI, Innovo, Jenbacher, Skeleton, SolidEra, Zauner).
- TOTAL source: ~75 IN net-new -> 25 VERIFIED sendable + 19 catch-all + name-only. En output/value_chain_batch.csv + value_chain_sample.csv.
- APRENDIZAJE: source skew a corporativos grandes -> mas catch-all; VERIFIED ~34% (vs ~60% Needs-contact); costo/VERIFIED ~$0.057. Nombres ~87% gratis.
- FLAG dedup: Eos (=Eos Energy) y Mainspring (=Mainspring Energy) procesadas pese a estar en pipeline (nombre corto vs completo). Dedupe antes de usar. Mainspring: transicion de CEO -> contacto founder posiblemente viejo, revisar.
- FLAG: Battery Storage 0/9 VERIFIED (gigantes catch-all). ABB-tipo dominios raros (global.abb) -> falsos NOT_FOUND (correcto, no invento).
- GASTO batch 11.40cr; saldo 18.15 -> 6.75. Discrepancia arqueo ~0.30cr (~$0.03) a revisar. SALDO BAJO -> recargar antes de mas pago.
- SESION TOTAL ~15.6cr (22.35->6.75). VERIFIED nuevos: 32 (7 Needs-contact + 25 value_chain).

## 2026-09-07 — Cierre: sync engine↔Supabase + value_chain source + UI del source + owners (resumen consolidado)

1. **SYNC engine→Supabase (`scripts/sync-supabase.js`)** — sigue como quedó construido/validado en prod (ver sesión 2026-08-31): REGLA DE ORO, el equipo siempre gana — nunca toca `stage`/`last_touch_at`/`team_status`/`notes`/`touches`/ids. Credencial `SUPABASE_SERVICE_ROLE` en `.env` (raíz, gitignored, nunca en chat, solo la pone Aldahir). Comando: `node scripts/sync-supabase.js` (dry-run) / `--apply` (escribe), siempre con respaldo antes de `--apply`.

2. **Ingesta value_chain_map (`scripts/ingest-value-chain.js`)** — ingiere `output/value_chain_map.csv` filtrado a `icp_status==IN`: **86 cuentas IN** procesadas. Dedup exact-match primero, luego prefix-match seguro (ambos lados normalizados a 4+ caracteres) — nunca fuzzy suelto (lección de la vez que "Mitsubishi Power" casi matcheó contra "Mitsubishi Electric Power Products"). Nombres cortos (<4 char, ej. "Eos") se reportan `ambiguous_short` y NUNCA se auto-mergean; único override manual confirmado: `Eos -> Eos Energy Enterprises` (`CONFIRMED_MERGE_OVERRIDES`, humano-confirmado, no algorítmico). Dos formas de escritura: MERGE (cuenta ya existe -> solo pisa las **4 columnas nuevas** `source`/`market_segment`/`tier`/`icp_status`, todo lo demás protegido) vs INSERT (cuenta nueva -> fila completa + contacto si venía con nombre real en value_chain_batch/sample.csv). `assigned_user_id` nunca lo toca este script, ni en insert ni en merge. Dry-run por defecto, `--apply` para escribir de verdad.

3. **UI del source en `docs/index.html`** — filtro engine/value_chain detrás del feature flag `SHOW_SOURCE_FILTER`; badge de `market_segment` por cuenta; indicador de email sin verificar; vista que junta las 86 cuentas de value_chain de un jalón (cruzando distintos lifecycle states) con conteos estables por chip de source; news feed con split New (<30d)/All; vista "Needs contact" para cuentas sin contacto real.

4. **Asignación de dueños** — `accounts.assigned_user_id` ya está poblado en Supabase (vía writes manuales directos, fuera de estos scripts — `sync-supabase.js` e `ingest-value-chain.js` lo protegen y nunca lo tocan). `scripts/add-owner-to-csv.js` lee `accounts.assigned_user_id` + `users.email` -> nombre limpio (diccionario fijo `OWNER_NAME_BY_EMAIL`, nunca adivinado) y lo pega como columna `assigned_owner` DIRECTO en `output/leads_master.csv` (backup automático a `leads_master.backup-owner.csv` antes de escribir, idempotente — reintentable sin duplicar columna). `scripts/sync-sheet.js` sube ese `leads_master.csv` (ya con `assigned_owner`) al Sheet de Zadrac ("Prima Leads", Sheet1) vía `google-key.json` (service account, gitignored) + paquete `googleapis`; overwrite completo del rango usado (nunca append), preservando `team_status`/`notes` del Sheet (los lee antes de limpiar y los vuelve a pegar por `account_name|contact_name`).

5. **Flujo de 3 pasos por batch** (manual, en este orden):
   (a) engine genera/actualiza `output/leads_master.csv`
   (b) `node scripts/add-owner-to-csv.js` -- pega `assigned_owner`
   (c) `node scripts/sync-sheet.js` -- sube todo al Sheet de Zadrac

6. **Value_chain: dueños temporales** — todas las cuentas nuevas de value_chain se asignaron a **Aldahir** por ahora. **Cooling -> pendiente de reasignar a Manu** (no hecho todavía).

PENDIENTES:
1. Sync automático del Sheet (hoy los 3 pasos del flujo son manuales).
2. Asignación de dueños por vertical real (value_chain hoy está temporalmente todo en Aldahir; falta repartir Cooling a Manu y confirmar el resto).
3. Historial de noticias acumulado por cuenta (tabla `signals` nueva + modal tipo FUPs) -- diseño ya cerrado en sesión 2026-08-30 (parte 2)/2026-08-31, no arrancado.
4. Refrescar señales/noticias viejas (muchas con 100-500+ días de antigüedad) -- canal engine, no cockpit.

- **Prompt de arranque próxima sesión:**
  _"Cerramos con: sync engine→Supabase (scripts/sync-supabase.js, regla de oro) y la ingesta value_chain_map (scripts/ingest-value-chain.js, 86 IN, dedup exact/prefix + override manual Eos) ya construidos y aplicados; UI del source en docs/index.html (filtro engine/value_chain tras SHOW_SOURCE_FILTER, badge de market_segment, vista de las 86 juntas, news feed New/All, Needs contact); flujo de 3 pasos por batch (engine -> add-owner-to-csv.js -> sync-sheet.js) para refrescar assigned_owner en el Sheet de Zadrac. Pendiente: sync automático del Sheet, terminar de repartir dueños reales por vertical (Cooling -> Manu, hoy todo en Aldahir), historial acumulado de noticias por cuenta (tabla signals, diseño ya cerrado), y refrescar señales viejas. Paso a paso, uno a la vez."_

### Sesión 2026-09-07 — Canal cockpit (nuevo): BUG #4 comentarios de FUP RESUELTO
DIAGNÓSTICO (no era la base):
- Guardar y leer de `touches` FUNCIONAN — RLS/permisos bien (verificado con upsert directo y con la lectura anidada accounts→contacts→touches desde la consola del navegador). El "no se guarda" era de la UI del modal, no de Supabase.
- 3 defectos reales:
  ① MISRUTEO: `saveModalComment` pasaba el modal ENTERO a `saveComment`, que tomaba el PRIMER `.comment-textarea` (el de un "Edit" del historial si estaba abierto) → el texto se guardaba bajo la etiqueta equivocada. Confirmado con datos reales: "prubea 123f" quedó bajo First Touch (Email) y el FUP 1 quedó vacío.
  ② GUARDAR VACÍO pisaba el comentario existente con "" (y "" se pinta como "No comment yet").
  ③ Comentarios bajo "First Touch (LinkedIn)" INVISIBLES: la escalera (`touchHistorySteps`/`previousStageText`) hard-codea "First Touch (Email)".
FIXES (docs/index.html):
- ① `saveModalComment` scopea al `.touch-writezone`; `openTouchModal` cablea el save por `.touch-writezone .comment-save`.
- ② `saveComment`: guard — si el textarea está vacío y no hay Replied, avisa "Write a comment first" y NO escribe (no pisa).
- ③ nueva `firstTouchLabelFor(contact)`; `touchHistorySteps` usa la variante real de First Touch (Email/LinkedIn) del contacto.
DEPLOY: commit `3f9d50b` (autor Aldahir) + mini-commit `53f5f1d` por GitHub web (destraba Vercel). Verificado en vivo (marcador `firstTouchLabelFor` en el HTML desplegado + prueba funcional de los 3). Local sincronizado (ff a 53f5f1d).
BACKUP: `docs/index.html.bak-fupfix` (copia pre-fix).
ENTORNO/APRENDIZAJE (Cowork vs Claude Code): esta sesión se hizo en Cowork (Claude en la nube + puente a la compu), NO en Claude Code. El puente (device_bash) NO borra archivos (deja `.lock` trabados), NO tiene credenciales de GitHub (push/ls-remote fallan), y su terminal en la nube no llega a vercel.app. Práctica: diagnóstico+edición por Cowork; git/push/deploy/verify desde la terminal propia (o Claude Code).
CLEANUP PENDIENTE: borrar fila de prueba `DIAG TEST` en `touches` (contacto Michael Pankhurst).
SIGUIENTES DEL CANAL (orden acordado): #1 buscador de contactos en My leads → #5 FUPs desplegable → #3 LinkedIn+paso intermedio → #2 Closed por contacto (RLS, el más delicado).


### Sesión 2026-09-08 — Canal cockpit: Cambio #1 buscador de contactos/empresa
- Barra de búsqueda en My leads (docs/index.html): filtra por nombre de CONTACTO o EMPRESA (parcial, case-insensitive), busca en TODOS los leads del usuario (pipeline + in-sequence + closed), no solo la vista activa. Tras feature flag SHOW_LEAD_SEARCH.
- Impl: state.q; matchesQuery(); mySearchLeads(); currentBaseLeads() lo usa como override; input en markup fijo (no pierde foco al re-render); Clear filters también limpia la búsqueda; los tiles cuentan aparte (no se descuadran), los chips de categoría sí reflejan la búsqueda.
- Commit 06c7214 (autor Aldahir) + mini-commit por GitHub web para el deploy. Verificado en vivo (barra visible + marcador mySearchLeads en el HTML desplegado).
- APRENDIZAJE deploy: Vercel necesita el mini-commit por GitHub web SIEMPRE para desplegar, aunque el commit local sea tuyo (no solo con commits de Claude). Cada deploy = push + mini-commit web.

### Sesión 2026-09-08 — Canal cockpit: Cambio #5 FUPs colapsable
- La sección Followups (arriba) ahora es una cajita colapsable: por defecto muestra "You have N pending follow-ups \u25b8"; al picar se despliegan las tarjetas con Done/Stopped. Sin overdue: "You're all caught up". Todo en inglés. Feature flag COLLAPSE_FOLLOWUPS.
- Impl: state.fupOpen; renderFollowupSection() con param `collapsible`; renderFollowups() lo pasa; el toggle re-renderiza. N = cuentas overdue.
- Commit 8ae95cb (autor Aldahir, tras pull --rebase --autostash) + mini-commit GitHub web. Verificado en vivo ("You have 22 pending follow-ups").

### Sesión 2026-09-08 — Canal cockpit: Cambio #3 mini-paso LinkedIn antes de secuencia
- Al dar "Start sequence" en un contacto con LinkedIn Y email: abre su perfil de LinkedIn en pestaña nueva + muestra una caja de correo EN PAUSA (deshabilitada, placeholder "Email \u2014 sending coming soon") + botón "Done on LinkedIn \u2192 Start sequence" que marca First Touch (LinkedIn). Si no tiene ambos, queda el picker Email/LinkedIn de siempre. Feature flag LINKEDIN_STEP.
- BUG encontrado y corregido en la misma sesión: la v1 inyectaba el panel al DOM y Supabase re-renderiza al volver de la pestaña (onAuthStateChange -> loadLeads), borrandolo ("aparecia y se quitaba, no dejaba confirmar"). Fix v2: el mini-paso vive en state.liStep y se pinta como parte de la tarjeta (startSequenceHtml -> liStepHtml), asi sobrevive cualquier re-render; window.open una sola vez en el click; li-confirm/li-cancel cableados en renderSections.
- Commit de75ca9 (v1) + fix v2, autor Aldahir + mini-commit GitHub web para el deploy.

### Sesión 2026-09-08 — CIERRE de sesión (canal cockpit)
ESTADO: 4 de 5 cambios del canal LISTOS, desplegados y verificados en vivo:
- #4 bug comentarios de FUP (misruteo + guardar vacío + First Touch LinkedIn invisible) — resuelto.
- #1 buscador de contacto/empresa en My leads (SHOW_LEAD_SEARCH).
- #5 FUPs colapsable "You have N pending follow-ups" (COLLAPSE_FOLLOWUPS).
- #3 mini-paso LinkedIn antes de secuencia (LINKEDIN_STEP), con fix state-based (state.liStep) para que sobreviva el re-render de Supabase.
FALTA: #2 Closed por CONTACTO (no por empresa; excepción: si es el único contacto de la empresa, toda va a Closed). El más delicado — toca lógica de cierre + posiblemente RLS.
FLUJO DE TRABAJO (validado esta sesión): Claude (chat/Cowork con puente a la compu) diagnostica y escribe el fix, muestra el diff para auditar; Aldahir corre git en SU terminal: commit a su nombre (sin firma de Claude) + `git pull --rebase --autostash origin main` + push + un mini-commit por GitHub web (docs/index.html) para que Vercel despliegue (Vercel lo exige SIEMPRE). Line endings: escribir LF (git HEAD es LF); Windows los checkout como CRLF. Feature flag para cambios grandes; backup del index.html antes de tocar.
PROMPT DE ARRANQUE PRÓXIMA SESIÓN: "Canal cockpit prima-gtm-skills (docs/index.html en Vercel + Supabase). Lee app-cockpit-log.md primero. Ya están #4, #1, #5, #3 (desplegados). Falta el #2: Closed por CONTACTO no por empresa (excepción: único contacto -> empresa entera a Closed). Diagnostica y proponme el enfoque en cajita antes de tocar; un paso a la vez."

### Sesión 2026-09-17 — Canal cockpit: Cambio #2 Closed por CONTACTO (ULTIMO del canal)
- Antes: myClosedLeads = cuentas con ALGUN contacto cerrado -> cerrar 1 contacto de una empresa de 2 mandaba TODA la empresa a Closed. Ademas la logica estaba inconsistente (myOpenLeads ya usaba accountAllClosed).
- Fix (front-end, SIN tocar RLS): accountAllClosed ahora cuenta solo contactos REALES (realContactsOf); la vista/tile "Closed" usa accountAllClosed. Resultado: una empresa entra a Closed SOLO cuando TODOS sus contactos reales estan cerrados; cerrar 1 de varios deja la empresa en su vista activa con badge de cerrado en ese contacto; la excepcion "unico contacto -> empresa entera a Closed" sale sola.
- No se agrego selector para elegir cual contacto cerrar: el confirm de Stopped/Replied ya muestra el NOMBRE, asi que no se cierra al equivocado. Queda como mejora futura si el equipo lo pide.
- Commit autor Aldahir + mini-commit GitHub web para deploy.
- CANAL COMPLETO: 5/5 cambios desplegados (#4 bug comentarios, #1 buscador, #5 FUPs colapsable, #3 mini-paso LinkedIn, #2 Closed por contacto).

### Sesión 2026-09-17 — Fix: cuentas sin contacto real fuera de "My leads"
- Las cuentas needs-contact (realContactsOf===0, "No contact identified yet", ej. Cleveland-Cliffs) aparecían en el pipeline "My leads" ADEMAS de en la vista "Needs contact". Fix: myOpenLeads ahora exige realContactsOf(l).length > 0, así esas cuentas viven SOLO en "Needs contact" (donde se rellenan). Front-end, sin RLS.

### DEPLOY FLOW del cockpit (recordatorio — leer antes de subir cambios)
Orden que evita el dolor de git que se vivio el 2026-09-17:
1. Editar docs/index.html en LF (git HEAD es LF; Windows lo deja como CRLF, ignorar el warning "LF will be replaced by CRLF").
2. Commit a nombre de Aldahir, SIN firma de Claude: git -c user.name="Aldahir Chiw" -c user.email="aldahir.chiw@prima.ai" commit -m "...".
3. Subir en UNA SOLA linea (evita que PowerShell pegue 2 comandos juntos y minimiza la carrera con el remoto):
   git pull --rebase --autostash origin main; git push origin main
   Si sale "rejected", repetir esa MISMA linea, SIN abrir GitHub entre intentos.
4. SOLO cuando el push diga "-> main": UN mini-commit por GitHub web (docs/index.html, un espacio, Commit changes) -> dispara Vercel. NUNCA antes del push (si no, la carrera se reinicia).
5. Verificar: ((iwr "https://prima-gtm-skills.vercel.app/" -UseBasicParsing).Content) -match "<marcador unico del cambio>" -> True.

### Sesión 2026-09-17 — Cambio #1 (rediseño): filas por contacto en la tarjeta
- Antes: tarjeta por cuenta con UN contacto activo + selector para cambiar -> header/barra/botones ambiguos (no se sabia a que contacto aplicaban); con 2 contactos en secuencias distintas (ej. ProLift: Dawn not started / Zac FUP 3/4) no se veian las dos a la vez.
- Ahora (flag PER_CONTACT_ROWS): la tarjeta de cuenta es contenedor (empresa + senal compartidos) y CADA contacto real es su propia fila con SU barra E1-LI-E2-E3, SU accion (Start sequence / Done+Stopped / badge cerrado) y SU boton Comments. Se elimino el selector. Aplica a pipeline/in-sequence/closed; la bandeja Followups se dejo IGUAL (opcion A).
- Reusa cableado: .start-seq->showChannelPicker (con mini-paso LinkedIn), .fu-done/.fu-stopped->bindCloseActions, .contact-comment->openTouchModal. markDone ahora hace re-render completo (Done ya vive en el pipeline per-contact). Nueva func contactRowHtml + branch en cardHtml. Sin RLS. Revertible con PER_CONTACT_ROWS=false.

### 2026-09-17 — #FUP-per-contact (bandeja de Followups por contacto)
- **Qué:** la bandeja de Followups ahora lista **un renglón por CONTACTO vencido**, no uno por cuenta/peor-contacto. Una cuenta con 2 contactos vencidos = 2 tarjetas.
- **Por qué:** antes sólo se veía el contacto más atrasado de cada cuenta; el resto quedaba invisible en la bandeja.
- **Cómo:** nueva `followupContacts(predicate)` (un row `{c,days,delay}` por contacto in-flow vencido) usada por `renderFollowups()` tras flag `FUP_PER_CONTACT=true`. Además: en tarjetas de FUP el cuerpo muestra el contacto del FUP (`active = followupWorst.c`, arregla mismatch badge/cuerpo) y se oculta el selector de contacto (`contacts.length>1 && !followupWorst`).
- **NO se tocó:** diseño de tarjeta, pipeline, In sequence, Closed, buscador, barra colapsable. Reversión: `FUP_PER_CONTACT=false`.
- **Nota:** el rediseño previo de tarjeta por contacto (`PER_CONTACT_ROWS`) quedó en **false** (revertido, no gustó — fuentes grandes / info apretada).

### 2026-09-22 — AUTOMATIZACION Sheet -> cockpit (LIVE) + capa de proteccion

**Qué quedó vivo:** sincronización automática del status de outreach desde el Google Sheet "SDR Feedback" hacia Supabase, **cada hora**, sin pasos manuales. Flujo: CSV master (asignación) -> Zadrac mueve al Sheet -> cron horario -> Edge Function lee el Sheet -> RPC `sync_sheet_touches` aplica con guardas -> contacts actualizado.

**Fuente de datos (Sheet):**
- Archivo: "SDR Feedback", dueño ivan.vazquez@prima.ai, compartido con el equipo y con la cuenta de servicio.
- Sheet ID: `1rH-KprLuxAZydwqyRX4lU_lLKX09154F9Nyj6VDG8is` · tab gid: `1226985717`.
- Columnas usadas: `correo_destino` (llave), `status` (E1), `fecha_enviado`. (Los `followup_*`, `respondio`, `estado` existen pero AÚN NO se mapean — ver Pendientes.)

**Mapeo aplicado (E1 solamente por ahora):** `status = SENT` -> stage `First Touch (Email)` + `last_touch_at = fecha_enviado`. PENDING/SKIP/MANUAL no tocan nada.

**Capa de protección (invariantes, NO romper):**
- **Forward-only:** sólo avanza el stage (comparación nativa del enum); nunca retrocede; nunca toca `Replied`/`Stopped` ni un stage puesto a mano más avanzado (protege el LinkedIn manual).
- **Owner-scope:** sólo contactos cuyas cuentas tienen `assigned_user_id = Aldahir Chiw`. Los de otros dueños se saltan (multi-usuario pendiente).
- **Sólo `stage` + `last_touch_at`.** Jamás toca comentarios/notas/team_status/linkedin_url.
- **Match sólo por email exacto** (lower/trim). Sin match = se salta, nunca se crea ni se inventa (el cockpit es espejo del CSV; los faltantes se arreglan en el origen).
- **Circuit-breaker:** si una corrida intentara cambiar > 50 filas, aborta sin escribir (`p_max_changes`).
- **Auditoría:** cada cambio deja fila en `import_audit_log` (contact_id, correo, field, old_value, new_value, source `sheet-sync:<run_id>`).

**Objetos creados en Supabase:**
- Función: `sync_sheet_touches(p_rows jsonb, p_max_changes int default 50)` — núcleo idempotente (staging temp + auditoría + 2 updates forward-only). Reutilizable.
- Tabla `import_audit_log` (RLS on, sin políticas = sólo admin/SQL editor).
- Tabla `sheet_import_staging` (auxiliar, RLS on).
- Respaldo del import manual inicial: `contacts_backup_20260922` (copia íntegra de contacts, RLS on).
- Edge Function `sync-sdr-sheet` (Deno): lee el Sheet con cuenta de servicio (JWT RS256 via jose), parsea SENT, llama al RPC. Secrets: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`. URL: `https://axknjzbiteuwrjpbuows.supabase.co/functions/v1/sync-sdr-sheet`.
- Cron `sync-sdr-sheet-hourly` (pg_cron + pg_net), schedule `0 * * * *`, dispara la Edge Function con la anon key (pública) en el header; la escritura la hace la función con service_role internamente.

**Google Cloud:** proyecto `prima-leads-sheet`, Google Sheets API enabled, cuenta de servicio `cockpit-sheet-reader@prima-leads-sheet.iam.gserviceaccount.com` (llave JSON en poder de Aldahir; compartida como lector/editor en el Sheet).

**Import manual inicial (antes del cron), aplicado el 2026-09-22:** 13 contactos Not Contacted -> First Touch (Email); 8 ya en First Touch (Email) con fecha corregida (relleno falso 28-ago -> fecha real del Sheet); Giuseppe Fiorella (AB Energy) protegido en First Touch (LinkedIn). Resumen auditoría: stage=13, last_touch_at=21.

**Cómo operarlo / troubleshooting:**
- Correr a demanda: POST a la URL de la Edge Function con header `Authorization: Bearer <anon key>`.
- Ver qué hizo: `select * from import_audit_log order by run_at desc;`
- Ver corridas del cron: `select * from cron.job_run_details order by start_time desc limit 20;`
- Pausar el cron: `select cron.unschedule('sync-sdr-sheet-hourly');`
- Rollback del import inicial: `update contacts c set stage=b.stage, last_touch_at=b.last_touch_at from contacts_backup_20260922 b where b.id=c.id and (c.stage is distinct from b.stage or c.last_touch_at is distinct from b.last_touch_at);`

**Pendientes / próximos pasos:**
1. Mapear followups del Sheet (`followup_1..4_*`) a `FUP 1..4`, y `respondio`/`tipo_respuesta` a `Replied`; `estado` cerrado -> `Stopped`. (Hoy sólo E1/SENT.)
2. Ampliar owner-scope cuando el cockpit sea multi-usuario (hoy sólo Aldahir; los sends de Gustavo/Gaby/Manuel se saltan).
3. Revisar el circuit-breaker (50) con volumen real.

## 2026-09-22 — Zadrac (Iván): checkboxes Email/LinkedIn + bloque de borrador + approve-draft (13 commits, traídos vía pull el 2026-09-27)

Estos cambios los hizo Zadrac (`IVzzVll` en git) directo en GitHub/su propio checkout, no en esta
sesión — llegaron al repo local recién el 2026-09-27 vía `git pull --ff-only` (ver
`docs/registro-cambios.md` para el detalle completo commit por commit). Se documentan aquí porque
tocan `docs/index.html` y el backend del cockpit.

- **"Start sequence" pasó de botones a casillas.** Antes: dos botones Email/LinkedIn, y si el
  contacto tenía ambos se abría un mini-paso especial de LinkedIn (perfil + caja de correo
  bloqueada + confirmar). Ese mini-paso se eliminó por completo. Ahora: casillas de selección
  (Email y/o LinkedIn) + botón "Start". Si se marca LinkedIn, abre el perfil en pestaña nueva. Si
  se marca Email (aunque también LinkedIn), el canal guardado es "Email". Sin ninguna marcada,
  avisa "Selecciona al menos uno".
- **Bloque de borrador de correo por contacto (nuevo).** Cada contacto puede mostrar el borrador
  que vive en el Sheet: etiqueta de estado con color (PENDING amarillo / SEND azul / SENT verde /
  SKIP gris), asunto, y al desplegar, asunto + cuerpo completos editables en el DOM (todavía no
  hay guardado de la edición — ver pendiente abajo). Si está en PENDING aparece
  "Aprobar → SEND". Al iniciar secuencia por Email, el borrador se abre solo. Fix de CSS: una
  regla duplicada hacía que el cuerpo del borrador se viera siempre; corregido.
- **Limpieza de interfaz.** Se escondieron los controles de ordenar; se apagó el filtro de fuente
  (`SHOW_SOURCE_FILTER = false`); las chips de categoría solo aparecen si hay más de una categoría
  presente.
- **Edge Function nueva: `approve-draft`.** Recibe `contact_id`, busca el borrador, si ya está
  `SENT` lo rechaza, si no escribe `SEND` en la celda `status` correcta del Sheet (usa
  `sheet_row_index` guardado por el sync) y actualiza `email_drafts.status` en Supabase.
  **Escribe de verdad en el Google Sheet** — probar con un contacto de prueba antes de usarlo con
  datos reales.
- **`sync-sdr-sheet` ampliada.** Pasó de pedir permiso de solo-lectura al Sheet a lectura+escritura
  (necesario para lo de arriba). Ahora también trae asunto/cuerpo/status/thread_id/respondio/los 4
  followups de cada fila (incluidas las PENDING) a la tabla nueva `email_drafts`, y deduce sola el
  `stage` del contacto a partir de esas columnas (Replied si respondió; si no, el followup más
  alto con fecha; si no, "First Touch (Email)" si SENT o MANUAL). El touch-sync viejo (por
  `SENT`/`fecha_enviado`) sigue igual, y ahora también cuenta `MANUAL` como toque.
- **Tabla nueva en Supabase: `email_drafts`.** Un renglón por contacto — asunto, cuerpo, status,
  thread_id, respondio, fecha_resp, followup_1..4 (cuerpo+fecha), sheet_row_index, synced_at.
- **README actualizado** con una sección completa del Cockpit (URL Vercel, auth, tablas, Edge
  Functions, pendientes).

**Pendientes que Zadrac dejó anotados en el README (no verificados en esta sesión):**
1. Fix visual de Closed por contacto.
2. Editar asunto/cuerpo desde el cockpit antes de aprobar (hoy solo se puede ver/editar en el DOM,
   no hay botón de guardar la edición).
3. Sync de `respondio`/`thread_id` de vuelta al cockpit para mostrar replies en la UI.
4. Lógica de secuencia LinkedIn (el Sheet no tiene drafts para LinkedIn).
5. Auth por Google OAuth de Prima (hoy Magic Link).
6. Actualizar `app-cockpit-schema.sql` para reflejar `email_drafts` + las Edge Functions nuevas.

---

## NOTA — este archivo es la fuente de verdad de reglas + estado del cockpit

app-cockpit-log.md es el documento único que consolida tanto el ESTADO (qué se ha hecho, cronológico) como las REGLAS FUNCIONALES del cockpit (cómo debe comportarse). No existe un cockpit-rules.md separado — se evaluó crearlo y se descartó para no duplicar, porque las reglas ya viven aquí (regla de oro, classifySignal, Needs contact, acciones de cierre, asignación de dueños, modelo de source, flujo a Zadrac, etc.). Cualquier canal/persona que retome el cockpit lee ESTE archivo primero.

### Pendientes de documentación (para una sesión futura, no urgente):
- PRODUCT.md y DESIGN.md están DESACTUALIZADOS: describen el prototipo estático viejo (docs/outreach-cockpit.html, sample data de agosto), no la app real en vivo (docs/index.html + Supabase). Reescribirlos o marcarlos como obsoletos.

### Pendientes funcionales / próximos cambios (platicados con Zadrac, se harán en canal dedicado):
1. Buscador de contactos en "My leads" (buscar por nombre/similitud).
2. Cerrar (Closed) por CONTACTO, no por empresa (excepción: si es el único contacto, la empresa entera va a Closed).
3. Botón de LinkedIn + paso intermedio antes de secuencia: al iniciar secuencia, abrir el perfil de LinkedIn del contacto automáticamente + caja de correo (parqueada, sin envío real aún); flujo abre LinkedIn → confirmación → secuencia.
4. ✅ RESUELTO (2026-09-07): comentarios de FUPs (touches). No era la base — 3 defectos de UI (misruteo del textarea, guardar vacío pisaba, First Touch LinkedIn invisible). Commit 3f9d50b + mini-commit 53f5f1d, desplegado y verificado. Ver bitácora.
5. FUPs como desplegable: cajita colapsable tipo "You have 9 pending follow-ups" que se despliega, overdue primero. En inglés.

### Pendientes de infraestructura / datos (de sesiones previas, siguen vivos):
- Automatizar el sync del Sheet de Zadrac (hoy manual, 3 pasos: engine → add-owner-to-csv.js → sync-sheet.js).
- Asignación de dueños por vertical real en el front (hoy value_chain todo a Aldahir; Cooling → Manu pendiente).
- Historial de noticias acumulado por cuenta (tabla signals nueva + engine acumula en vez de sobrescribir).
- Refrescar señales viejas (el engine busca noticias nuevas para cuentas con señal de 100-500+ días).

---
