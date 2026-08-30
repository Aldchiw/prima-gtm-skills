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

### Sesión 2026-08-30 (parte 2) — Editar comentarios de FUP anteriores
LOGRADO (en vivo y comiteado):
- El historial del modal de comentarios ahora es EDITABLE por item: botón "Edit" en los FUP que ya tienen comentario, "Add comment" en los vacíos ("No comment yet").
- Al picar Edit/Add, el item se vuelve zona de edición en su lugar (textarea + Replied + Save + Cancel), reusando `saveComment()` sin reescribir su lógica (`touchEditItemHtml` + `saveHistoryItemComment`).
- Listener delegado en `#touchModal` (elemento estable) maneja Edit/Add/Cancel/Save-de-item; guard por `.touch-item-editing` evita chocar con el Save de la zona grande de abajo.
- `openTouchModal` ahora setea `#touchModal.dataset.contactId` para que el listener sepa el contacto.
- Verificado en vivo: Edit, Add comment, Cancel y guardado funcionan; aguanta el recargado (persiste en Supabase).

PENDIENTES PRÓXIMA SESIÓN (siguen vivos de antes):
1. Limpiar la barrita vieja E1·LI·E2·E3 de la tarjeta (topada en 4, se contradice con FUP reales altos) — paso #2 del deep-analysis.
2. Seguridad menor (no urge): escapar el texto del comentario en el HTML del modal/historial si algún día hay datos de terceros (hoy datos propios).
3. De antes: edición ampliada (notas/team_status), Resend (correo para el equipo), sync engine→Supabase (prioridad máxima post-MVP).

- **Prompt de arranque próxima sesión:**
  _"Seguimos la app del cockpit (EN VIVO, docs/index.html). Los comentarios por FUP están completos: modal con historial editable (Edit/Add comment por FUP), tabla 'touches' en Supabase. Toca limpiar la barrita vieja E1·LI·E2·E3 de la tarjeta que se contradice con los FUP reales (paso #2 del deep-analysis: quitar la representación vieja del stage 0-4 y dejar el FUP real como única verdad). Paso a paso, uno a la vez. Vercel bloquea commits de Claude Code, mini-commit por GitHub web para destrabar."_
