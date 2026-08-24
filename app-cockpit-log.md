# 📓 APP COCKPIT — Log de trazabilidad

_Memoria durable de la construcción de la **app editable del cockpit de outreach** (Supabase + Vercel). Sistema aparte del engine — la app CONSUME lo que el engine produce (`leads_master.csv`), no lo reemplaza. El scope completo vive en `app-cockpit-brief.md`; el sistema entero (engine, datos, reglas) en `MIGRACION-MAESTRA-prima-gtm.md`. Este archivo es solo el hilo de memoria de la APP._

_Convención: se actualiza al cierre de cada sesión. Nunca se pisan los logs del engine (`engine-tier0-fase3-log.md`, `engine-vigilar-radar-log.md`). Aldahir pega resúmenes, no dumps — la data cruda vive en el repo/CSV/Supabase._

---

## 0. ORIENTACIÓN RÁPIDA (leer primero)

- **Qué es la app:** reemplazar el cockpit estático (`docs/outreach-cockpit.html`) + el Google Sheet manual por una app real donde el equipo VE Y EDITA su pipeline de outreach sin tocar el Sheet. Multi-usuario, login, datos en vivo, persistente.
- **Stack (decidido, no re-evaluar):** Supabase (Postgres + Auth/login + API + RLS) · Vercel (hosting frontend). Frontend concreto: a definir en la fase visible.
- **Dónde vive el backend:** en Supabase, NO en el repo de GitHub. El repo guarda esta trazabilidad + el brief + (a futuro) el código del frontend. Por eso el checklist de migración de la app es distinto al del engine.
- **Costo:** todo en free tier durante construcción = $0. En producción, ~$0–45/mes (Supabase Pro $25 opcional por backups; Vercel Pro $20 por 1 asiento de deploy para uso comercial legítimo). NO existe pago único — estas plataformas son suscripción. Self-hosting existe pero es más complejo de mantener, descartado por ahora.

---

## 1. CÓMO TRABAJAR CON ALDAHIR EN LA APP (igual que en el engine)

- Non-admin, aprende lo técnico sobre la marcha. **UN paso a la vez**, explicar en 1 línea qué hace cada cosa ANTES de correrla, decisiones en **cajita** (`ask_user_input`), backup antes de cambios grandes, nunca asumir conocimiento técnico.
- **Credenciales (llaves de Supabase, etc.) las pone ÉL directo, NUNCA en el chat.** Contraseñas de DB tampoco — se guardan en su gestor.
- Español informal. Archivos/columnas en inglés. No inventar jerga que él no use.
- Disciplina de tokens: **sesión corta por fase** (~15 turnos o 1 milestone). Avisar cuándo migrar a chat fresca y correr checklist de cierre. Pegar resúmenes, no dumps.
- **Aviso de modelo:** antes de trabajo pesado (mucho procesamiento, o meterle cabeza al contexto/arquitectura), avisarle para que cambie a Opus. Ejemplo real: el diseño de RLS + auth se hizo en Opus.

---

## 2. ESTADO ACTUAL

### ✅ FASE 1 — Supabase + esquema + login (TERMINADA)
- Proyecto Supabase creado: **`Aldchiw's Project`** en org `Aldchiw's Org`, **plan FREE**, región East US (North Virginia). Cuenta personal de Aldahir (misma lógica que el repo).
- **3 tablas creadas** en schema `public`, todas con **RLS activado**:
  - `accounts` — 1 fila por cuenta. Columnas: id (uuid pk), account_name, domain, company_category, sub_segment, priority, vertical_owner, excluded (bool), exclusion_reason, scope_tier, needs_manual_scope_confirmation (bool), signal_source, signal_detail, signal_url, signal_date (text — ver aprendizaje #2), assigned_user_id (uuid), created_at, updated_at.
  - `contacts` — 1 fila por contacto, FK `account_id` → accounts(id) on delete cascade. Columnas: contact_name, contact_title, priority_tier, linkedin_url, contact_email, email_status, stage (text, default 'Not Contacted'), contact_count, source_files, team_status, notes, timestamps.
  - `users` — roster: id (uuid), full_name, email (unique), role.
- **Roster cargado** (4 filas). IDs reales generados por Supabase:
  - Aldahir Chiw — aldahir.chiw@prima.ai — `7ad58986-786e-45f2-a4ad-a1dd18daf329`
  - Gabriela Zacarias — gaby@prima.ai — `f4196408-359e-4dac-9710-c9a901b64c89`
  - Gustavo Rivas — gustavo.rivas@prima.ai — `5bb4cb38-b996-4d06-a0ba-ccba13aa7762`
  - Manuel Ibarra — manuel.ibarra@prima.ai — `e15bf46e-03f4-464b-af42-9994abffea7d`
- **Login: Magic Link** (link por correo, sin contraseña — elegido por simplicidad para equipo non-técnico). Plantilla nativa de Supabase, free tier. Nota: el envío de correos del free tier es solo para pruebas y puede caer en spam; se resuelve con SMTP propio si estorba en producción.

### ✅ FASE 2 (BACKEND) — migración de datos + RLS por usuario (TERMINADA)
- **Datos migrados** desde el Google Sheet en vivo (`Prima Leads`, snapshot del **2026-08-24**, leído vía Google Drive connector). Se partió el CSV de 1-fila-por-contacto en dos tablas relacionadas por un UUID generado localmente:
  - **160 cuentas** en `accounts`.
  - **275 contactos** en `contacts`. **Cero huérfanos** (verificado: 0 contactos sin cuenta).
  - Distribución por categoría: Cat3 69, Cat4 68, Cat1 12, Cat2 11.
- **Dueños asignados** (`assigned_user_id`) y verificados en DB:
  - **Aldahir 103** (Cat4 68 + Cat3 35) · **Manuel 34** (Cat3) · **Gustavo 19** (Cat1/2) · **Gabriela 4** (Cat1/2).
  - Reglas: Cat1+Cat2 → 80/20 Gustavo/Gaby (idx%5==4 → Gaby). Cat3 → 50/50 alternado Aldahir/Manuel (idx%2). Cat4 → 100% Aldahir.
- **3 políticas RLS de solo-lectura (SELECT) activas**, cruzando identidad por **CORREO** (no por id — ver aprendizaje #1):
  - `users`: "team can read roster" (authenticated puede leer el roster; necesario para el cruce).
  - `accounts`: "see own assigned accounts" (assigned_user_id = id del user cuyo email = auth.jwt email).
  - `contacts`: "see contacts of own accounts" (account_id ∈ cuentas propias).

### 🔲 FASE 2 (VISIBLE) — frontend en Vercel (PENDIENTE, es lo siguiente)
- Construir la pantalla real: login Magic Link + vista de solo-lectura por usuario. Aquí se comprueba VISUALMENTE que el RLS funciona (Manuel entra y ve solo sus 34, etc.).
- Todo lo hecho hasta hoy vive en el backend; aún no existe una pantalla donde el equipo entre.

---

## 3. SIGUIENTES METAS (en orden)

1. **Frontend Fase 2 (inmediato):** app en Vercel con login Magic Link + vista solo-lectura por usuario. Deploy en cuanto haya algo que mostrar. Aquí Aldahir mete sus llaves de Supabase directo (nunca en el chat).
2. **Fase 3 — Edición:** tarjetas por cuenta con contactos anidados (máx 2/cuenta) + editar stage/contactos/notas con persistencia. Requiere **nuevas políticas RLS de ESCRITURA** (hoy solo hay de lectura, por diseño).
3. **Fase 4 — Secuencia + templates:** vista de secuencia por cuenta, cajas de mensaje editables por paso (E1/LI/E2/E3) conectadas al template de Zadrac, marca de "enviado".
4. **Fase 5 — Envío + medición:** cada usuario envía desde SU correo; medir interested reply rate por señal/sub-segmento/vertical/ángulo.
5. **⭐ FASE PROPIA — Sync en vivo Sheet/engine → Supabase (PRIORIDAD MÁXIMA post-MVP):** hoy la migración es un snapshot manual. Compromiso explícito de Aldahir: cuando la app corra al 100%, la conexión en vivo (que un pull de Zadrac se refleje solo en Supabase, sync automático) es de las máximas prioridades. NO es "nice to have" — agendar como fase propia. Sin esto, el equipo edita pero los datos nuevos del engine no llegan solos.

---

## 4. APRENDIZAJES CLAVE

1. **El problema de los dos IDs (Magic Link) → cruzar por CORREO.** Cuando alguien entra con Magic Link, Supabase Auth le crea una identidad con un ID propio que NO es el mismo que el `id` de la tabla `users` (ese lo generamos a mano). Lo que une ambas identidades de forma confiable es el **email**. Por eso TODAS las políticas RLS cruzan por `auth.jwt() ->> 'email'` = `users.email`, nunca por id. Cualquier política futura debe seguir este patrón.
2. **`signal_date` y `stage` son TEXT, no tipos estrictos.** En el Sheet real, `signal_date` trae valores no-fecha ("2026-03", "2026", y hasta una nota completa) y `stage` siempre es "Not Contacted" (texto). Regla de oro: no inventar ni forzar formato que no existe → se guardan como text. Si a futuro se normalizan, hacerlo con dato real, no adivinando.
3. **No sobrescribir los logs del engine.** La app es un sistema aparte; mezclar su trazabilidad con la del engine rompe integridad. Documento dedicado (este) = cada sistema con su hilo de memoria.
4. **El Sheet ya tenía 2 columnas extra** (`team_status`, `notes`) que el equipo usaba a mano — se preservaron en `contacts`. Son justo el tipo de campo editable que la app debe soportar.
5. **Cero inconsistencias a nivel cuenta** en la migración: las 160 cuentas tenían datos consistentes en todas sus filas de contacto antes de colapsar a 1-fila-por-cuenta. Bueno saberlo para futuros re-imports.

---

## 5. DECISIONES REGISTRADAS

- **Reparto de Cat3 = 50/50 alternado Aldahir/Manuel** (regla vieja de MIGRACION-MAESTRA), NO "por vertical" (regla del brief). Motivo: `vertical_owner` viene vacío en las 69 cuentas Cat3, así que la regla por-vertical no se puede aplicar sin inventar dato. Revisable cuando se etiquete vertical por cuenta.
- **Login por Magic Link**, no contraseña (simplicidad para equipo non-técnico).
- **RLS de solo-lectura primero**; las de escritura llegan en la fase de edición. En fase de solo-lectura, nadie puede alterar datos — es lo correcto.
- **Registro abierto pero inofensivo:** hoy cualquier correo puede pedir Magic Link, pero si no está en el roster no ve NADA (gracias al RLS). Cerrar registro solo a `@prima.ai` es un ajuste menor para después, no urge.

---

## 6. CHECKLIST DE CIERRE DE SESIÓN (app)
Distinto al del engine porque el backend vive en Supabase, no en el repo. Antes de cambiar de chat:
1. Este documento (`app-cockpit-log.md`) actualizado: estado, siguientes metas, aprendizajes, decisiones.
2. Números clave capturados (conteos, IDs, distribución de dueños).
3. Nada a medias en Supabase (sin imports a medio correr, sin políticas sin verificar).
4. Prompt de arranque de 1 línea para la próxima sesión.
5. Commit + push del repo (para que este log sea portable).

---

## 7. BITÁCORA POR SESIÓN

### Sesión 2026-08-24 — Fase 1 + Fase 2 backend
- Arrancó la app desde cero. Se resolvió primero la duda de costo/calidad (free tier cubre todo; no hay pago único; self-hosting descartado).
- **Fase 1 completa:** proyecto Supabase, 3 tablas con RLS, roster de 4, Magic Link.
- **Fase 2 backend completa:** 160 cuentas + 275 contactos migrados del Sheet real (cero huérfanos), dueños asignados y verificados (Aldahir 103 / Manuel 34 / Gustavo 19 / Gaby 4), 3 políticas RLS de solo-lectura cruzando por correo.
- Cambio a Opus para el diseño de auth + RLS (parte más delicada).
- **Siguiente:** frontend en Vercel (Fase 2 visible).
- **Prompt de arranque:** _"Seguimos la app del cockpit. Backend en Supabase ya listo (Fase 1 + Fase 2 backend: 160 cuentas, 275 contactos, RLS por correo funcionando). Ahora toca la Fase 2 visible: construir el frontend en Vercel con login Magic Link y vista de solo-lectura por usuario. Guíame paso a paso, un paso a la vez, y arranca diciéndome qué hago primero."_
