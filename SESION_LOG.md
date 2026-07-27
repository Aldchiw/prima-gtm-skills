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
