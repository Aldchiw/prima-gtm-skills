# Sprint 2 — pendientes provisionales/sin validar (para revisión de Gaby)

Las 7 skills del pipeline de Data Centers ya existen y el flujo end-to-end fue probado en seco
(`prima-committee` → `prima-email-waterfall` → `prima-hook` → `prima-draft` → `prima-guardrail-audit`,
2026-07-20). Nada de esto se ha corrido con gasto real todavía. Este documento junta **todo** lo que
quedó marcado como provisional/hardcoded-sin-confirmar en las 7 skills, para que Gaby (y Aldahir)
lo revisen antes de la primera corrida real.

Cada punto: **qué skill**, **qué quedó provisional**, **qué decisión falta**.

---

## 🔴 Decisión crítica: cómo confirmar Procurement Scope (WebSearch no puede)

Surgió el 2026-07-20 durante la primera corrida en modo generador (descubrimiento de cuentas nuevas
vía señal, no lista dada): de 4 cuentas nuevas encontradas con señal real y fit de ICP en papel
(Stryten Energy, Eos Energy, Moment Energy, Enercon Engineering), **ninguna llegó calificada**. Se
intentó confirmar vía WebSearch el criterio "Equipment Procurement Scope" de Notion (¿subcontratan
fabricación estructural de acero/enclosures, o son 100% in-house?) para las 4:

- **Enercon Engineering** — único caso con evidencia clara, y fue **descalificante**: su propio
  sitio dice explícitamente que son "vertically integrated" y mantienen la fabricación in-house
  para "eliminar errores de terceros." Cumplía TODO el resto del perfil (señal real, tamaño,
  producto, geografía) — y aun así se cae. **Esto es la prueba de que el scope no se puede inferir
  de los otros criterios del ICP** — hay que verificarlo directamente, cuenta por cuenta.
- **Stryten, Eos, Moment Energy** — sin evidencia verificable ni a favor ni en contra. Quedaron
  `procurement_scope_status = not_confirmed` en `output/accounts_processed.csv`: candidatos
  calientes, no descartados, pero tampoco calificados para pasar a `prima-committee`/`prima-draft`
  todavía (ver la regla dura documentada en `output/README.md`).

**Falta decidir con Gaby: qué fuente SÍ puede confirmar este criterio, ya que WebSearch mostró que
no es confiable para esto específicamente.** Opciones a evaluar:

1. **Import Genius (aduanas)** — si una cuenta ya importa componentes de fabricación (acero,
   enclosures) desde México/otros países, eso confirma outsourcing directamente. Mismo mecanismo
   que ya usa `prima-signal-scan` para su señal de `customs`, aplicado aquí como verificación de
   scope en vez de señal de apertura.
2. **Llamada de Inside Job** — verificación humana directa preguntando al prospecto o a alguien
   cercano a la cuenta.
3. **LinkedIn del equipo de supply chain** — si la cuenta tiene roles de "Commodity Manager" o
   "Strategic Sourcing" enfocados en fabricación externa (no solo materia prima/componentes
   electrónicos), eso es indicio indirecto pero más fuerte que nada.

Sin esto resuelto, el modo generador puede seguir encontrando cuentas con señal real, pero no debe
escalarse a volumen (20+) hasta tener una manera confiable de cerrar este gate — de lo contrario el
output son candidatos en limbo, no leads listos.

## `prima-icp-check`

- **Provisional:** el entry point/comité del sub-segmento `4D` (niche custom, low volume) nunca se
  definió — la tabla original lo deja explícitamente en blanco ("not yet defined — don't invent
  one, leave blank and flag for the user").
  **Falta decidir:** cuál es el entry point real para cuentas 4D, o confirmar que 4D sigue fuera de
  scope indefinidamente.
- **CRÍTICO, gap de arquitectura:** no existe ninguna fuente de verdad conectada de "quién ya es
  cliente de Prima". Se agregó una tercera categoría de exclusión ("Existing customer: ...") a
  `prima-icp-check` el 2026-07-20, pero hoy solo se puede aplicar cuando un humano marca la cuenta
  manualmente — no hay lista/CRM que el sistema pueda consultar en vivo. Esto se descubrió porque
  **Antora Energy** (que clasificaría como `4C`) resultó ser cliente real de Prima y casi entra al
  pipeline de outbound frío durante la investigación de títulos de `prima-committee`. Quedó anotada
  como exclusión hardcoded en memoria de este repo mientras tanto.
  **Falta decidir:** qué sistema (CRM, hoja de cuentas activas, Notion, otro) se conecta como fuente
  de verdad de clientes existentes, para que esta exclusión deje de depender de que un humano
  reconozca el nombre por casualidad.

## `prima-signal-scan`

- **Provisional:** las ventanas de freshness (`fresh`/`recent`/`stale`) para `job_opening` y
  `funding` están marcadas explícitamente como "ajustar una vez que tengamos datos reales".
  **Falta decidir:** si 30/90 días (job_opening) y 90 días/12 meses (funding) son los cortes
  correctos, una vez que se acumulen más corridas reales.
- **Provisional:** el corte de 12 meses para `funding` ya tiene un caso límite documentado
  (Mainspring Series F, $258M, aged out justo en la ventana durante la corrida del 2026-07-19).
  **Falta decidir:** si 12 meses es la ventana correcta, con este caso como evidencia acumulándose.
- **Nuevo, sin resolver:** una corrida anterior de signal-scan reportó una señal `job_opening` de
  sourcing/commodity en Powell Industries que un WebSearch fresco (2026-07-20) no pudo verificar —
  solo aparecieron roles operativos, ninguna vacante específica de sourcing/procurement.
  **Falta decidir:** si signal-scan a veces reporta `job_opening` sin una URL realmente verificable
  detrás — necesita auditoría sobre una corrida real, no una sola comparación.
- **Nuevo, sin resolver:** `capacity_expansion` no tiene su propio corte de antigüedad distinto del
  bucket genérico de 30/90 días — el gancho de Powell ($12.4M Jacintoport) sigue siendo elegible
  para `prima-hook` a pesar de tener ~11 meses (`stale`).
  **Falta decidir:** si `capacity_expansion` necesita una ventana de vigencia propia (probablemente
  más larga que la de `job_opening`, dado que un anuncio de expansión envejece distinto a una
  vacante).

## `prima-committee`

- **Actualizado 2026-07-20:** el mapeo de roles se reescribió como un **diccionario de títulos
  objetivo** (no lista de contactos), anclado en evidencia real de 7 cuentas de referencia (Powell,
  Delta Star, Trystar, Hammond para 4B; Mainspring, Antora, un 4C de battery storage adicional),
  reordenado en dos niveles: **PRIORIDAD ALTA** (supply chain/purchasing/sourcing — quien realmente
  compra fabricación) y **PRIORIDAD SECUNDARIA** (ejecutivos — CEO/COO/VP Eng, solo contacto #2/#3 o
  fallback). Cada título queda marcado evidencia real vs. inferido.
  **Sigue provisional:** ni Gaby ni Aldahir han validado el diccionario completo todavía — se
  aprobó la estructura (ALTA/SECUNDARIA) pero no cada título individual.
  **Falta decidir:** validar el diccionario conforme se acumulen corridas reales; confirmar el
  título exacto de 2 entradas marcadas "función real, título inferido" (Head of Supply Chain / Head
  of Manufacturing) antes de usarlas verbatim.
- **Provisional:** solo `4B`/`4C` están soportados; `4A`/`4D` devuelven
  `SUB_SEGMENT_NOT_SUPPORTED`.
  **Falta decidir:** definir los roles de comité para 4A/4D antes de extender la skill (depende
  también del pendiente de icp-check sobre el entry point de 4D).
- **Cuenta específica, no es un problema de la skill:** Mainspring Energy tuvo un cambio de CEO
  (Shannon Miller, fundadora, ya no es CEO desde 2026-06-10) que rompe la premisa de "founder still
  leading" del arquetipo 4C.
  **Falta decidir:** si `prima-icp-check` debe reconsiderar la clasificación/sub-segmento de
  Mainspring a la luz de este cambio.

## `prima-email-waterfall`

- **Provisional:** el orden de proveedores del waterfall (findymail → hunter → prospeo → icypeas →
  datagma → leadmagic → contactout → lusha → rocketreach → wiza → bettercontact → fullenrich) es
  una propuesta razonable, sin validar con datos reales de costo/tasa de acierto.
  **Falta decidir:** corregir el orden una vez que la primera corrida real con dinero genere datos
  de qué proveedor realmente rinde mejor para los contactos de Prima.
- **Bloqueante para la primera corrida real:** no tenemos el pricing real de Deepline por
  proveedor — nunca se inventó, sigue pendiente de conseguir.
  **Falta decidir/conseguir:** el pricing real antes de aprobar cualquier batch >20 contactos.

## `prima-hook`

- Hereda los dos pendientes de `capacity_expansion`/`job_opening` de `prima-signal-scan` arriba,
  porque su tabla de exclusión de ganchos depende directamente de esas reglas de freshness.
  **Falta decidir:** lo mismo que en signal-scan — no es un pendiente adicional distinto, solo
  aparece también aquí porque afecta qué ganchos se consideran "elegibles".

## `prima-draft`

- **Provisional:** la biblioteca de templates solo tiene 2 templates semilla
  (`T-4B-plantpurchasing-v1`, `T-4C-founder-v1`), marcados `seed-v1-unvalidated` — escritos para
  destrabar el Sprint 2, sin revisión de Gaby ni datos reales de respuesta.
  **Falta decidir:** que Gaby los revise/apruebe (o los corrija) antes del primer envío real.
- **Encontrado en la prueba del 2026-07-20:** ambos templates semilla tienden a deslizarse hacia
  lenguaje de precio/costo subordinado — 3 de 6 borradores de prueba dispararon el Warning W5 de
  `prima-guardrail-audit` ("price subordinate to reliable-supply narrative"), aunque ningún
  esqueleto de template lo pide explícitamente.
  **Falta decidir:** si Gaby quiere bajarle a ese ángulo en una v2 de cualquiera de los dos
  templates (su default es dial down el ángulo de ahorro).
- **Cobertura parcial:** solo hay 1 template por sub-segmento (el rol de entry-point primario) — un
  contacto con otro `committee_role` dentro del mismo sub-segmento (ej. "Supply Chain Director" en
  vez de "Plant Purchasing Manager") cae por fallback al mismo template genérico del sub-segmento.
  **Falta decidir:** priorizar qué combinaciones rol × sub-segmento necesitan su propio template
  específico conforme crezca el volumen real.

## `prima-guardrail-audit`

- **Provisional (ya documentado en la propia skill):** la lista de guardrails (Blockers/Warnings)
  no está formalizada en Notion todavía — el archivo SKILL.md es la fuente de verdad mientras tanto.
  **Falta decidir:** cuándo/si Notion formaliza una sección de guardrails, y entonces conciliar
  deliberadamente este archivo con esa página (no inferir el cambio a mitad de una corrida).

---

## Hallazgos de verificación técnica (2026-07-20, post-cierre)

Una pasada de verificación sobre las 7 skills (frontmatter, referencias cruzadas, consistencia de
esquemas entre skills consecutivas) encontró 3 cosas. Van uno por uno:

1. **[CORREGIDO]** `T-4C-founder-v1`'s `committee_role` fusionaba dos roles de la tabla de
   `prima-committee` ("Founder / CEO" + "VP Engineering / Head of Manufacturing") en un solo string,
   por lo que ningún contacto real habría hecho match exacto contra ese template — siempre caía en
   fallback sin que la documentación lo reflejara. Corregido: `committee_role` ahora es una lista
   por template (ver `templates/index.md` → "Matching rule"), y un match contra cualquier elemento
   de la lista cuenta como match real, no fallback.
2. **[ABIERTO]** Dos mensajes de estado internos están en español dentro de archivos que son 100%
   inglés en todo lo demás: la nota de `NO_HOOK` en `prima-hook/SKILL.md` y la razón de `NO_DRAFT`
   en `prima-draft/SKILL.md`. No necesariamente es un error — puede ser intencional que las notas
   internas (para uso de Aldahir/Gaby) queden en español mientras el copy al prospecto es en
   inglés — pero no está declarado como regla en ningún lado, a diferencia de la regla de idioma que
   sí existe para los templates. **Falta decidir:** si se unifica a inglés (consistencia con el
   resto del archivo) o se declara explícitamente que las notas internas siguen el idioma de
   operación (español) y el copy al prospecto sigue el idioma del destinatario.
3. **[ABIERTO]** `prima-email-waterfall` describe su umbral de muestra (≤20 sin gate de aprobación)
   como "el mismo protocolo de muestra usado en otras partes de este pipeline" — pero ninguna de las
   otras 6 skills de este repo define ese umbral. La referencia es correcta en espíritu (viene de
   una convención de Aldahir fuera de estos 7 archivos), pero alguien que solo lea estas skills no
   encontraría dónde vive esa convención. **Falta decidir:** documentar el protocolo de muestra en
   un solo lugar citable (¿el Ejecutable Maestro v2?) en vez de solo referenciarlo de pasada.

## Resumen para la conversación con Gaby

De los 7, los que más necesitan su ojo directo son **`prima-draft`** (templates sin validar + el
sesgo hacia lenguaje de precio) y **`prima-committee`** (mapeo de roles sin confirmar). Los de
`prima-signal-scan`/`prima-hook` (ventanas de freshness) probablemente se resuelven solos con más
corridas reales, no necesitan una decisión de Gaby hoy — pero vale la pena que los conozca ya que
alimentan directamente lo que `prima-draft` termina escribiendo.
