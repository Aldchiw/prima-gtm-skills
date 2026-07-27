# Prima — Catálogo de Capacidad de Fabricación (Data Center, Energy & AI Infrastructure)

> **Fuente:** Prima_DC_Components_Catalog_v35.pdf (Product Catalog v3.5).
> **Propósito en el engine:** fuente de verdad de QUÉ FABRICA PRIMA. Las skills (prima-hook, prima-draft, prima-icp-check) referencian este archivo para anclar el gancho de cada cuenta a un producto real y verificable, en vez de a "acero estructural" genérico.
> **Regla:** este archivo describe capacidad de oferta. NO inventa specs. Todo valor viene del catálogo v3.5. Los cruces interpretativos (Parte B) están marcados `[VALIDAR]` y requieren visto bueno de Aldahir antes de que las skills los usen como verdad.

---

## Datos macro de Prima (para claims permitidos)

- Capacidad: **+10,000 tons/mes** (red multi-planta, US + México).
- Modelo: **engineered-to-order manufacturing**; Prima International LLC como US seller of record (logística USMCA cross-border).
- Calidad: **ISO 9001**; certificaciones a nivel red **AISC · AWS · ASME · ISO** (y en tabla de red: AWS D1.1, ASME U-Stamp, API, ISO 45001, ASTM, AISI, SJI, TÜV Austria).
- Nota de claim: certificaciones como **UL** aparecen SOLO como "disponible a través de network partners" (item 3.5). NO son un claim propio de Prima → mantener el guardrail de "cero certificaciones sin validar" sobre UL/NEMA.

---

# PARTE A — Catálogo de capacidad (6 familias, fiel al PDF)

## 01 · Skids & Base Frames
_Plataformas estructurales sobre las que se monta el equipo; integradas y listas para instalación._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 1.1 | Switchboard skids | Frames para módulos de switchboard; soldadura WPS/PQR a ISO 13920 Class F, placas inox, inserts PEM, grabado permanente de heat-number para trazabilidad MTR completa. Quality dossier por lote. | Carbon steel HSS (ASTM A500); placas 304 stainless | Powder coat o airless epoxy certificado; HDG o pintura de alta temp |
| 1.2 | Load bank & transformer skids | Skids pesados para load banks y transformadores con pan de contención de aceite, grating, charolas y struts integrados. | Carbon steel estructural; placa de contención 3/8" | Powder coat, epoxy high-solids, HDG o pintura alta temp |
| 1.3 | Electrical equipment skids & e-house base skids | Plataformas para switchgear, PDU, UPS y BESS; incluye base skids para e-houses y power modules; patrones de anclaje precisos. | Carbon + stainless, per ASTM | Powder coat, airless epoxy, HDG o pintura alta temp |
| 1.4 | OEM equipment base frames | Base frames multi-modelo recurrentes para equipo OEM: chillers, dry coolers, CDUs, equipo de proceso/tratamiento. Programas seriales con control dimensional por lote. | Carbon + stainless, per ASTM | Powder coat, airless epoxy, HDG o pintura alta temp (ej. ASA/ANSI 61 Gray) |
| 1.5 | Pump & packaged process skids | Paquetes skid-mounted de bombeo/proceso para agua de enfriamiento y tratamiento; base estructural, montaje de equipo, piping e instrumentación. Weld testing; load testing físico bajo pedido. | Carbon + stainless, per ASTM | Powder coat, airless epoxy, HDG o pintura alta temp |

## 02 · Frames & Supports
_Estructuras ligeras en volumen: perfiles comerciales, alta repetición, montaje rápido en campo._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 2.1 | Aisle containment frames (hot & cold aisle) | A-frames prefabricados y estructuras de contención HAC/CAC; conexiones atornilladas, diseño seccionado/plegable para transporte. Incluye ceiling grids y door framing. | Carbon steel HSS/tube; struts inox o galvanizados | Powder coat o galvanizado; pickling/passivating en inox |
| 2.2 | Liquid cooling piping supports & CDU stands | Soportes para distribución de coolant en compute hall: trapecios, pipe stands, portal frames, brackets de manifold, CDU stands, drip pans inox. Kitted por row. | Carbon + stainless, per ASTM | Powder coat, airless epoxy, HDG, pintura alta temp; pickling/passivating en inox |
| 2.3 | Cable tray, busway & MEP supports | Soportes secundarios, brackets y racks para cable tray, busway y MEP; fabricación de alto volumen con perfiles comerciales o diseño custom. | Carbon + stainless, per ASTM | Powder coat, airless epoxy, HDG o pintura alta temp |
| 2.4 | Substation equipment & bus supports | Soportes estructurales para breakers, disconnect switches, transformadores de instrumento y bus work; a estándares de utility con tolerancias estrictas. | Carbon steel estructural | Hot-dip galvanized |
| 2.5 | Transport carts, racks & protective handling equipment | Carts, racks, cases y crates ruggedizados para mover/proteger componentes de alto valor (GPUs, baterías, coolant units); frames con casters, interfaces acolchadas. | Carbon steel; aluminio per diseño | Powder coat |

## 03 · Enclosures & Sheet Metal
_Las cajas donde vive el equipo, y el sheet metal high-mix que las construye._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 3.1 | Modular data center enclosures, e-houses & power modules | Shells modulares pesados para compute/eléctrico/power: e-houses, PDC shells, enclosures modulares de DC. Diseñados para izaje y transporte por carretera. | Carbon steel estructural; paneles sheet formados | Epoxy high-solids (ej. Macropoxy 646) o powder coat |
| 3.2 | Sound-attenuated generator enclosures | Enclosures de panel de acero para gensets standby; lining acústico a niveles especificados, plenums intake/exhaust, dampers, puertas de servicio. | Carbon steel formado y estructural; media acústica | Powder coat o epoxy high-solids |
| 3.3 | Containerized structures & systems | Estructuras contenedor ISO-footprint para load banks, test units y equipo modular; puertas, ventilación, penetraciones, frames internos. | Carbon steel estructural; panel corrugado | Epoxy high-solids o powder coat |
| 3.4 | Test unit enclosures & frames (liquid cooling) | Enclosures, frames y casings para test benches de liquid cooling y equipo de commissioning; conexiones de piping, paneles de instrumentación. | Carbon o stainless per servicio | Powder coat; passivation en inox |
| 3.5 | Electrical cabinets, panels & switchgear enclosures | Enclosures y cabinets formados en carbon/stainless. **Integración de panel con certificación UL disponible a través de network partners**, incluye wire harnesses e instrumentación. | Carbon steel y sheet inox 304/316 | Powder coating electrostático o epoxy; passivation en inox |
| 3.6 | Battery casings & enclosures | Casings y enclosures protectores para módulos de batería y componentes BESS; construcción soldada o formada, separadores internos y hardware de fijación. | Carbon steel formado/soldado; stainless per diseño | Coating per aplicación; passivation en inox |
| 3.7 | High-mix sheet metal (skins, subframes & components) | Sheet metal high-mix para equipo y enclosures: skins exteriores, subframes, componentes. Corte láser, doblado, punzonado, soldadura. Programas 100+ SKUs por producto. | Carbon steel, inox y sheet de aluminio | Powder coat o per especificación |
| 3.8 | AHU & fan wall casings, plenums & ductwork | Casings y frames para AHUs y fan walls, plenums, ductwork pesado y louvers; stiffening estructural a specs de airflow y presión. | Sheet metal galvanizado y coated | Galvanizado; coating per especificación |

## 04 · Tanks & Vessels
_Todo lo que contiene líquido o presión; shop-built, en formatos transportables por carretera._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 4.1 | Immersion cooling tanks | Tanques/contenedores para immersion cooling; soldadura calificada, acabado interior per fluido dieléctrico, leak-tightness testing. | 304/316 stainless steel | Acabado interior per fluido; passivated |
| 4.2 | Liquid load bank vessels (ASME, high-pressure) | Vessels para liquid load banks a ASME Section VIII, hydrostatic testing documentado, fabricados en shop ASME con U-stamp activo. Rated >15 psi. | 304/316 stainless steel | Per servicio; dossier de weld y test documentado |
| 4.3 | Fuel tanks: sub-base, belly & day tanks | Fuel tanks de doble pared soldados (sub-base, belly, day) para gensets; contención, fittings, instrumentación de nivel; a fire-code. | Carbon steel, doble pared | Sistemas de epoxy coating |
| 4.4 | TES & chilled-water buffer tanks | Tanques soldados para thermal energy storage y buffering de chilled-water; internals de estratificación, nozzles, puertos de instrumentación, jacketing insulation-ready. | Carbon o stainless per servicio | Coating per química de agua; insulation-ready |
| 4.5 | Fire protection & water storage tanks | Tanques de acero soldados para fire-water reserve y make-up/process water (NFPA 22-type); manways, nozzles, instrumentación de nivel. | Carbon steel | Sistemas de coating per servicio de agua |
| 4.6 | Water treatment & process tanks | Tanques de proceso para sistemas de tratamiento de agua en plantas de enfriamiento; nozzles, manways, instrumentación. | Stainless y carbon per servicio | Acabado interior per proceso; passivated inox; rubber lining interno disponible |
| 4.7 | Low-pressure vessels (ASME, H stamp) | Vessels para servicio de baja presión a ASME Section IV (0.5–15 psi); hydrostatic testing documentado, shop ASME con H-stamp activo. | 304/316 stainless; carbon per diseño | Per servicio; dossier de weld y test documentado |

## 05 · Piping, Manifolds & Exhaust
_Todo por donde se mueve líquido o gas; leak-tight, soldadura calificada._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 5.1 | Coolant distribution manifolds (rack & row) | Manifolds supply/return para direct-to-chip liquid cooling; headers inox con puertos maquinados, soldadura calificada, hydrostatic y leak test. A port count/spacing del cliente. | 304/316 stainless; carbon para aplicaciones selectas | Passivated; epoxy; capped para embarque |
| 5.2 | Stainless piping assemblies & spools | Spools y ensambles de piping con integración de instrumentación (ej. flow sensors) y hydrostatic testing per cliente. | 304/316 stainless steel | Per especificación; dossier de test documentado |
| 5.3 | Exhaust & SCR housings | Silenciadores, housings de catalizador y SCR, piping de exhaust para gensets; soldadura leak-tight para servicio de emission-control. Producido en la red para genset OEMs. | Carbon y stainless steel | Coating de alta temp per servicio |
| 5.4 | Heat recovery system (HRSG) components | Casings HRSG, ducting y hot-gas-path piping para combined-cycle/cogeneración en campus de DC; soldadura leak-tight para exhaust de alta temp. | Carbon y stainless steel | Coating de alta temp per servicio |

## 06 · Structural & Misc Steel — Div 5
_Framing de edificio AISC-certified, más acero de sitio, campus y subestación._

| Item | Producto | Descripción corta | Materiales típicos | Acabados típicos |
|---|---|---|---|---|
| 6.1 | Structural framing, mezzanines & access | Estructura primaria/secundaria AISC-certified para edificios de DC: framing, joists, decking, mezzanines, escaleras, railings, plataformas. Conexiones per AWS D1.1; detailing, dossier, erection support. | Carbon steel (ASTM A992/A36/A500) | Primer anticorrosivo o HDG |
| 6.2 | Pipe racks & heavy supports | Pipe racks, plataformas y soportes pesados para servicios de campus (cooling water, fuel, eléctrico); fabricación modular para erección rápida. | Carbon steel estructural | HDG o sistemas de coating industrial |
| 6.3 | Site & exterior metalwork | Equipment screens y louvers, fencing/gates de seguridad, walkways, catwalks, plataformas de mantenimiento, trench covers; alto volumen a site drawings. | Carbon steel y aluminio | Galvanizado o coated |
| 6.4 | Substation gantries, A/H-frames & dead-end structures | Gantries, A-frames, H-frames y dead-end structures para switchyards y terminaciones de línea; secciones tubulares o built-up a drawings de utility. | Carbon steel estructural, tubular o built-up | HDG; primer anticorrosivo o epoxy |

---

# PARTE B — Mapa señal → producto → vertical  `[REQUIERE VALIDACIÓN DE ALDAHIR]`

> Esta sección es interpretación, derivada del **Application Index** del catálogo (pág. 2) cruzada con los verticales de Aldahir y los sub-segmentos OEM. Sirve para que prima-hook y prima-draft sepan QUÉ producto ofrecerle a una cuenta según la señal que la originó. Cada fila marcada `[VALIDAR]` necesita tu visto bueno antes de que las skills la traten como verdad.

## B.1 — Application Index del catálogo (fiel al PDF, NO interpretación)

Este mapa "scope del cliente → items" viene tal cual del catálogo:

| Scope del cliente | Items Prima aplicables |
|---|---|
| Electrical room / power distribution | 1.1, 1.2, 1.3, 3.1, 3.5 |
| White space / compute hall | 2.1, 2.2, 2.3 |
| Liquid cooling loop | 5.1, 5.2, 4.1, 4.4, 1.4, 1.5 |
| Air-side cooling | 3.8 |
| Backup power / generators | 3.2, 4.3, 5.3, 5.4 |
| Water systems | 4.5, 4.6, 1.5, 4.7 |
| Load banks & commissioning | 1.2, 4.2, 3.3, 3.4 |
| Substation & switchyard | 2.4, 6.4 |
| Building & campus | 6.1, 6.2, 6.3 |
| OEM serial programs | 1.4, 3.7, 3.5, 3.6, 2.5 |

## B.2 — Cruce scope del catálogo → línea de producto (vertical)

> **Principio de diseño (decidido 2026-07-26):** el catálogo NO hardcodea quién es dueño de cada vertical (Aldahir vs Manu). La propiedad del vertical vive en el Notion GTM, que se lee en corrida. El catálogo solo mapea cada scope del Application Index a la(s) línea(s) de producto a las que pertenece. Así el tool escala a TODAS las clasificaciones sin que este archivo quede obsoleto cuando cambie una asignación de dueño.

Mapeo scope → línea de producto (para que el tool asocie una cuenta a su vertical vía Notion):

| Scope del Application Index | Línea(s) de producto probable(s) | Items ancla |
|---|---|---|
| Electrical room / power distribution | Power | 1.1, 1.2, 1.3, 3.1, 3.5 |
| Substation & switchyard | Power | 2.4, 6.4 |
| Backup power / generators | Power y/o Cooling `[VALIDAR frontera]` | 3.2, 4.3, 5.3, 5.4 |
| White space / compute hall | Cooling | 2.1, 2.2, 2.3 |
| Liquid cooling loop | Cooling | 5.1, 5.2, 4.1, 4.4, 1.4, 1.5 |
| Air-side cooling | Cooling | 3.8 |
| Load banks & commissioning | Test & Commissioning | 1.2, 4.2, 3.3, 3.4 |
| Water systems | Cooling / Multi | 4.5, 4.6, 1.5, 4.7 |
| Building & campus | Multi-focus | 6.1, 6.2, 6.3 |
| OEM serial programs | Multi (depende del producto del OEM) | 1.4, 3.7, 3.5, 3.6, 2.5 |
| BESS (embebido, ver nota) | Energy Storage | 1.3, 3.6, 3.1 |

**Notas de validación pendientes:**
- `[VALIDAR frontera]` **Backup power / generators**: el catálogo lo lista como scope propio. Frontera Power ↔ Cooling (exhaust/HRSG son manejo de gases calientes) no resuelta. NO hardcodear dueño; que el Notion lo asigne. Aldahir lo confirmará (posiblemente con Gaby) más adelante.
- **Energy Storage** (validado por Aldahir 2026-07-26): el núcleo del pitch son **battery casings & enclosures (3.6)** + **BESS/e-house base skids (1.3)**. Los enclosures modulares (3.1) son secundarios/complementarios. El catálogo no tiene un scope con nombre "Energy Storage"; el BESS vive embebido en estos items.

## B.3 — Sub-segmentos OEM (4A/4B/4C/4D): qué determinan y qué NO

> **Principio validado por Aldahir (2026-07-26) — resuelve el mismatch:**
> El sub-segmento 4A–4D determina **buying committee + prioridad (P1/P2/P3)**, NO el producto ancla.
> El **producto ancla lo determina QUÉ FABRICA la cuenta**, resuelto vía el Application Index (B.1): se identifica el scope de la cuenta → se leen los items Prima aplicables.
> Consecuencia: dos cuentas del mismo sub-segmento (ej. dos 4B) pueden tener productos ancla totalmente distintos (una fabrica switchgear → 1.1+3.5; otra fabrica gensets → 3.2+4.3). El sub-segmento no toca eso.

| Sub-segmento | Definición | Prioridad | Buying committee (entrada) |
|---|---|---|---|
| **4A** | Plataformas integradas (OEMs que integran múltiples sistemas) | P2 | (per Notion) |
| **4B** | Established single-category (fabricante consolidado de UNA categoría) | P1 | plant purchasing |
| **4C** | Scale-ups founder-led (empresa joven escalando, fondeo Serie B/C) | P1 | founder / VP Engineering |
| **4D** | Niche custom (volumen bajo, producto especializado) | P3 | (per Notion) |

**Cómo se combinan los ejes en una corrida (el flujo correcto):**
1. Se encuentra la cuenta por señal → se identifica **qué fabrica** (su scope en términos del Application Index B.1).
2. **Eje 1 (Notion):** línea de producto → vertical (Aldahir vs Manu). Decide si la cuenta es de Aldahir.
3. **Eje 2 (skills 4A–4D):** tipo de empresa → committee + prioridad. Decide a quién escribirle y con qué urgencia.
4. **Eje 3 (este catálogo, vía B.1):** qué fabrica → producto ancla Prima. Decide el gancho concreto del email.

Los tres ejes son independientes y se resuelven por separado. El mismatch original ("4A–4D hardcodeado vs product-line del Notion") se disuelve porque NUNCA fueron el mismo eje: uno es tipo de empresa (Eje 2), el otro es línea de producto (Eje 1).

## B.4 — Reconciliación del mismatch: los tres ejes (CONCLUSIÓN validada)

El "mismatch" original se planteó como: *el Notion segmenta por línea de producto (Cooling/Power/Energy Storage…) pero las skills tienen hardcodeado 4A/4B/4C/4D → están desincronizados.*

**Diagnóstico validado (2026-07-26):** no estaban desincronizados — son **dos ejes distintos que nunca debieron mapearse uno a otro.** Con el catálogo aparece un tercero. Los tres son ortogonales:

- **Eje 1 — Línea de producto del prospecto** (fuente: Notion GTM). En qué mercado juega la cuenta → determina el **vertical** (Aldahir vs Manu).
- **Eje 2 — Tipo de empresa** (fuente: skills, esquema 4A–4D). Naturaleza del prospecto → determina **buying committee + prioridad P1/P2/P3**.
- **Eje 3 — Familia Prima aplicable** (fuente: este catálogo, vía Application Index B.1). Qué le fabricaría Prima → determina el **producto ancla del gancho**.

**Implicación para las skills (decisión de arquitectura a ejecutar en Sprint técnico):**
- `prima-icp-check` debe devolver los tres ejes como **campos separados**, no colapsarlos en uno.
- El esquema 4A–4D **se queda** en las skills (es el Eje 2, es correcto) — el error era creer que competía con el product-line del Notion.
- `prima-hook` / `prima-draft` deben leer el **Eje 3 desde este archivo** (B.1) para anclar el producto, en vez de usar lenguaje genérico de "acero estructural".
- El Notion sigue siendo fuente de verdad de Eje 1 y de la asignación de vertical/dueño; este catálogo es fuente de verdad del Eje 3; las skills son fuente del Eje 2.

**Pendiente único de validación restante:** frontera de "Backup power / generators" entre Power y Cooling (B.2) — no bloquea el diseño; se resuelve en Notion cuando Aldahir/Gaby lo definan.

---

_Fin del catálogo. Parte A es fiel al PDF v3.5. Parte B es interpretación pendiente de validación de Aldahir; nada marcado `[VALIDAR]` debe tratarse como verdad por las skills hasta su visto bueno._
