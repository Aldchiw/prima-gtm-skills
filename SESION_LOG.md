## 2026-07-28 · cuenta: personal
**Avancé — primera generación de correos E1 reales para outbound:**
- Sesión operativa: primera generación de correos E1 reales para outbound.
- Calibré el template E1 (e1_datacenter_overflow) a v1.3: señal como comentario humano factual (sin cifras/fechas/halago), cero em-dashes, saludo con first-name, subject sin sufijo legal, intro con presentación + AISC/AWS + US seller of record for AI infrastructure, set fijo de productos (enclosures, power skids, Division 5 structural steel), cierre "supply backstop". Comiteado.
- Renombré T-4C-founder-v1 -> T-4C-founder-v2 (regla de versionado del index), alineado al mismo body que E1 v1.3 + hook con puente corto, arreglado el subject roto ({{hook_fact_short}}). Comiteado (266572c).
- Descubrimiento: 6 de las 19 cuentas son signal_type=funding (Ayr, CORE, Nostromo, EnerVenue, Electrified Thermal, Redwood) -> ahora rutean a T-4C-founder-v2; las otras 13 (capacity_expansion) a e1_datacenter_overflow.
- Generé drafts_e1.md con los 19 correos (13 E1 + 6 funding), 19/19 PASS. Archivo local, NO comiteado (es material de trabajo).
- Override manual de scope P1 autorizado por mí para las 18 P1 (decisión de negocio; Sparkstone es P2).
- Creé outreach_tracker.csv con las 19 cuentas clasificadas (bloques cadencia y resultado vacíos para llenar a mano). Local, no comiteado.
- Limpieza de menciones de prosa "T-4C-founder-v1" (index.md x2, e1_datacenter_overflow.md, SKILL.md): ya corregidas en disco, solo falta comitearlas.
**PENDIENTES / SIGUE:**
- Envío manual de los 19 E1 (copy-paste): reemplazar [Signature name]/[Signature], suavizar "Google" en Form Energy, arreglar frase coja en Redwood, decidir INNIO (fronteriza Power/Cooling). Espaciar envíos. Registrar date_e1_sent en el tracker.
- FALTAN templates E2 y E3 (la cadencia sigue a +2d LinkedIn, +5d E2). Prioridad próxima sesión.
- Template fallback sin señal (e1_fallback_no_signal): diseñado, NO creado aún.
- Deepline: refund de $450 pendiente; NO usar créditos (Tier 0 / email-waterfall) hasta resolver. Tier 0 sigue roto (campos industries/employeeSize no existen en el schema de AI Ark).

## 2026-07-27 (sesión 2) · cuenta: personal
**Avancé — anchor_products para cuentas fit-only:**
- Problema detectado: los fit-only (pasan ICP pero NO_SIGNAL) quedaban SIN producto ancla, porque el Eje 3 vivía solo en prima-hook y hook las marca NO_HOOK. El bot de Zadrac necesita ese dato como base del correo fit-only.
- Fix: agregué anchor_products a prima-icp-check (columna + sección "Producto ancla (Eje 3)"). Se calcula desde QUÉ FABRICA la cuenta vía catálogo B.1, independiente de la señal. UNCLEAR si no se sabe qué fabrica. Commit f418466.
- Ahora hay 2 rutas al mismo dato: cuenta CON señal → ancla desde prima-hook (por la señal); cuenta SIN señal → ancla desde icp-check (por clasificación). Documentado en la skill para que no se confunda.
- PROBADO con A123 Systems (4C, P1, fit-only, NO_SIGNAL): clasificó completo y ancló a "1.3 BESS skids + 3.6 battery casings" derivado de qué fabrica, sin inventar. Sigue protegida por el gate anti-quema P1.
- Push 566fb1c..f418466. Backup borrado.
**Pendiente:**
- Frontera "Backup power/generators" Power vs Cooling (con Gaby). No bloquea.
- Definir formalmente el gate de fit-only con Zadrac (cómo su bot consume anchor_products sin disparar P1 en automático).
**Sigue:** Probar flujo completo hook→draft con email real, o coordinar con Zadrac el consumo de anchor_products.

## 2026-07-27 · cuenta: personal
**Avancé — sprint técnico del catálogo (COMPLETO):**
- prima-hook: agregué columna anchor_products + sección "Anchoring to a Prima product". Mapea la señal contra el Application Index del catálogo (B.1); UNCLEAR si la señal no dice qué fabrica. Commit 16d79e7.
- prima-draft: agregué guardrail "Product anchor" — usa el producto de anchor_products en vez de "structural steel" genérico; general si UNCLEAR. Commit 806f7d0.
- Decisión de diseño: el Eje 3 (producto ancla) vive en prima-hook, NO en icp-check (cada skill un trabajo).
- PROBADO con Stryten Energy (4B, energy storage): ancló correcto a "1.3 BESS skids + 3.6 battery casings" respetando la nota validada de Energy Storage. Sin inventar.
- Push 0b18424..806f7d0. Backups .bak borrados.
**Pendiente:**
- prima-icp-check: nombrar los 3 ejes explícitos (cosmético, opcional, no urgente).
- Frontera "Backup power/generators" Power vs Cooling (con Gaby). No bloquea.
**Sigue:** Probar el flujo completo hook→draft y ver un email real con producto anclado.

## 2026-07-26 · cuenta: personal
**Avancé:**
- Seguridad pre-acceso Mike (CTO): repo limpio de credenciales (working tree + historial completo). Credencial Deepline vive fuera del repo (~/.local/deepline). Creé .gitignore preventivo. Commit 3f2cc75.
- Respaldé los 2 CSVs de output (accounts 47→68, leads 30→35). Commit b67040b. Push cd50b87..b67040b.
- Zadrac: corregí 2 supuestos (CSV regenera+merge NO append; fit-only necesitan gate manual antes de envío).
- CATÁLOGO DE PRIMA: agregué reference/prima-catalog.md (178 líneas, del PDF v3.5). Parte A = capacidad de fabricación (30 items, fiel al PDF). Parte B = mapa señal→producto→vertical, VALIDADO con Aldahir. Commit 750d399.
**Decisión clave de arquitectura (validada, NO ejecutada aún):**
- El "mismatch 4A-4D vs product-line" NO era un choque: son 3 ejes ORTOGONALES. Eje1=línea de producto/vertical (Notion). Eje2=tipo de empresa 4A-4D (skills) → committee+prioridad. Eje3=familia Prima (catálogo) → producto ancla del hook.
- Sub-segmento 4A-4D define committee+prioridad, NO producto. El producto ancla lo define QUÉ FABRICA la cuenta, vía el Application Index del catálogo.
- Energy Storage validado: núcleo = battery casings (3.6) + BESS base skids (1.3).
**Pendiente (sprint técnico futuro, toca lógica central):**
- Modificar prima-icp-check para devolver los 3 ejes como campos separados.
- Modificar prima-hook / prima-draft para leer el producto ancla desde reference/prima-catalog.md (Application Index B.1) en vez de lenguaje genérico. Backup + commit por skill.
- Validar frontera "Backup power/generators" Power vs Cooling (con Gaby). No bloquea.
**Sigue:** Sprint técnico del catálogo (desbloquea mejores correos): modificar prima-icp-check para devolver los 3 ejes separados, y prima-hook/prima-draft para leer el producto ancla desde reference/prima-catalog.md (Application Index B.1) en vez de lenguaje genérico. Backup + commit por skill. Esto es lo que hace que los drafts pasen de "acero estructural" a producto específico y creíble.
