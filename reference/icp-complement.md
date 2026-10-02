# icp-complement.md — Overlay ADITIVO del ICP (Data Centers GTM)
#
# Capa aditiva sobre el Notion "Data Centers GTM". Notion SIEMPRE gana en conflicto;
# este overlay SOLO llena lo que Notion no define. Grupos adyacentes = experimento
# P2/P3 hasta validar interested-reply-rate. NUNCA P1 con ángulo no validado (anti-quema).
#
# Aprobado por Gaby Zacarias 2026-09-15 (G1, G2, G3, sin ediciones).

version: 2026-09-15
source_of_truth: Notion "Data Centers GTM"   # Notion gana siempre; esto llena silencios

adjacent_groups:
  - group_id: G1
    name: "BESS / almacenamiento en contenedor (integradores de sistemas)"
    parent_category: "Cat4 (adyacente)"
    vertical: "Energy Storage"
    why_icp: "Compran fabricación metálica bajo pedido — enclosures, skids, contenedores, estructura. Core de Prima."
    signal_sources: ["proyectos BESS con fondeo/awards (IRA/DOE, PPAs de utility)", "expansión de capacidad", "fondeo Serie B/C"]
    entry_persona: ["Supply Chain", "Procurement", "Operaciones de manufactura"]
    priority: P2
    status: "approved-experiment (Gaby 2026-09-15)"
    keywords_include: ["BESS", "battery energy storage", "containerized storage", "grid-scale storage", "energy storage integrator", "energy storage system integrator"]
    keywords_exclude: ["cell/battery OEM ya en Cat4", "residential solar", "non-US", "manufactura 100% offshore"]

  - group_id: G2
    name: "Energía on-site / behind-the-meter para DC (packagers)"
    parent_category: "Cat4 (adyacente)"
    vertical: "Power & Electrical"
    why_icp: "Empacan su generación en skids/enclosures/estructura — fabricación bajo pedido. Tema más caliente de DC (restricción de potencia)."
    signal_sources: ["deals de power para DC", "fondeo reciente", "noticias de expansión", "vacantes plant purchasing/procurement"]
    entry_persona: ["Supply Chain", "VP Operations", "VP Engineering (4C founder-led)"]
    priority: P2
    status: "approved-experiment (Gaby 2026-09-15)"
    keywords_include: ["on-site power", "behind-the-meter", "fuel cell", "gas genset", "linear generator", "microgrid", "prime power data center"]
    keywords_exclude: ["utility transmission/HVDC developer sin planta", "non-US", "solar residencial"]

  - group_id: G3
    name: "Integradores de e-house / subestación para campus DC"
    parent_category: "Cat4 (adyacente)"
    vertical: "Power & Electrical"
    why_icp: "El e-house / power skid / paquete de subestación ES fabricación metálica — corazón de la oferta de Prima."
    signal_sources: ["capex de utility para DC", "proyectos de subestación DC", "vacantes procurement/plant"]
    entry_persona: ["Supply Chain", "Procurement", "Plant Manager"]
    priority: P2
    status: "approved-experiment (Gaby 2026-09-15)"
    keywords_include: ["e-house", "power skid", "substation integrator", "electrical house", "modular substation", "power distribution center"]
    keywords_exclude: ["transmission/HVDC developer sin planta (no fabrica, p.ej. American Terawatt)", "GC genérico (Cat7)", "non-US"]

# Exclusiones globales (anti-quema, de la propuesta aprobada):
global_excludes:
  - "developers de transmisión/HVDC sin planta (no fabrican)"
  - "solar / remodelación residencial (falso positivo por nombre)"
  - "empresas non-US o con manufactura 100% offshore"

# ── REGLA DE RELEVANCIA (gate obligatorio, ADEMÁS de fab-buyer) — 2026-09-16 ──
# Una empresa CALIFICA solo si mapea a un bucket ICP real por su NEGOCIO REAL:
#   - Cat1-7 de Notion (DC operators, crypto→AI, modular DC mfrs, DC OEMs, campus builders, GCs), o
#   - G1/G2/G3 de este overlay.
# Si NO mapea a ningún bucket → EXCLUIR. PROHIBIDO "default a Cat4".
# Ser fab-buyer NO basta: debe mapear a un bucket.
relevance_gate:
  in_scope: ["Cat1-7 (Notion)", "G1/G2/G3 (overlay)"]
  hard_excludes:
    - "generación de energía renovable cuyo mercado NO es DC ni power-para-DC: solar utility / solar trackers, wind (incl small wind), tidal / marine / hydrokinetic, solar residencial u off-grid microgrid"
    - "electrónica pura / componentes sin compra de fabricación metálica (enclosures/skids/estructura)"
