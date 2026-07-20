# Sprint 2 — pendientes provisionales/sin validar (para revisión de Gaby)

Las 7 skills del pipeline de Data Centers ya existen y el flujo end-to-end fue probado en seco
(`prima-committee` → `prima-email-waterfall` → `prima-hook` → `prima-draft` → `prima-guardrail-audit`,
2026-07-20). Nada de esto se ha corrido con gasto real todavía. Este documento junta **todo** lo que
quedó marcado como provisional/hardcoded-sin-confirmar en las 7 skills, para que Gaby (y Aldahir)
lo revisen antes de la primera corrida real.

Cada punto: **qué skill**, **qué quedó provisional**, **qué decisión falta**.

---

## `prima-icp-check`

- **Provisional:** el entry point/comité del sub-segmento `4D` (niche custom, low volume) nunca se
  definió — la tabla original lo deja explícitamente en blanco ("not yet defined — don't invent
  one, leave blank and flag for the user").
  **Falta decidir:** cuál es el entry point real para cuentas 4D, o confirmar que 4D sigue fuera de
  scope indefinidamente.

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

- **Provisional:** el mapeo sub-segmento → roles del comité (4B → Plant Purchasing/Supply Chain
  Director/Plant Manager; 4C → Founder-CEO/VP Engineering/COO) está hardcoded en el SKILL.md pero
  **nunca se confirmó rol por rol** con Aldahir — se aprobó solo como "hardcodéalo, misma excepción
  que 4A-D".
  **Falta decidir:** validar cada rol de la tabla contra comités reales conforme se acumulen
  corridas.
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

## Resumen para la conversación con Gaby

De los 7, los que más necesitan su ojo directo son **`prima-draft`** (templates sin validar + el
sesgo hacia lenguaje de precio) y **`prima-committee`** (mapeo de roles sin confirmar). Los de
`prima-signal-scan`/`prima-hook` (ventanas de freshness) probablemente se resuelven solos con más
corridas reales, no necesitan una decisión de Gaby hoy — pero vale la pena que los conozca ya que
alimentan directamente lo que `prima-draft` termina escribiendo.
