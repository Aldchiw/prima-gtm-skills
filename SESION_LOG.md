## 2026-08-24 — Milestone: cockpit lee del Sheet (team_status/notes visibles)
- `scripts/generate-cockpit.js` ya no lee `output/leads_master.csv`: lee el Google Sheet en vivo,
  reusando el mismo service account/spreadsheetId que `scripts/sync-sheet.js` (export agregado ahí,
  guardado por `require.main === module` para que importar el archivo no dispare su `main()`/no toque
  el Sheet). `loadRows()`/`build()`/`main()` pasaron a async.
- Cada contacto ahora trae `team_status` y `notes` desde el Sheet, y `docs/outreach-cockpit.html` los
  pinta: etiqueta discreta junto al nombre + nota chica debajo, reusando variables de estilo
  existentes (`--ink-2`, `--ink-3`, `--border`) — vacío no renderiza nada. Exclusión, agrupación,
  asignación de dueños y `stage:0` intactos, sin tocar.
- Modo snapshot: el tablero solo refleja el Sheet al momento de correr `node scripts/generate-cockpit.js`,
  no en vivo.
- Validado end-to-end contra el Sheet real (Eos Energy Enterprises / Will Nauman): escritura directa
  vía API, corrida del script, y confirmación de que `team_status`/`notes` llegaron intactos al bloque
  DATA del HTML. Valor de prueba limpiado al cierre (celdas vacías confirmadas).
- Commit c272ff7 (`generate-cockpit.js`, `sync-sheet.js`, `docs/outreach-cockpit.html`).
**Pendiente:** (b) compartir el Sheet en vivo con el equipo (permisos).

## 2026-08-23 (cierre) — sync-sheet.js preserva columnas de equipo (team_status/notes)
- `scripts/sync-sheet.js` ahora preserva `team_status` y `notes` (columnas 24-25, editadas a mano por
  el equipo en el Sheet) casando cada fila por `account_name|contact_name` antes del clear+rewrite —
  ya no es un overwrite ciego que pisa lo que el equipo escribe. Fila nueva o sin match -> celdas
  vacías, sin error; sheet vacío o primera corrida (columnas aún no existen) -> también sin error.
  Commit 72decb1.
- Validado end-to-end contra el Sheet real (no solo local): fila testigo Eos Energy Enterprises /
  Will Nauman — escritura directa vía API (`team_status="PRUEBA_PURSUE"`, `notes="PRUEBA_NOTA_777"`),
  corrida real de `node scripts/sync-sheet.js`, y relectura: ambos valores sobrevivieron intactos y la
  fila no se movió (fila 3 antes y después). Valores de prueba limpiados al cierre (celdas vacías
  confirmadas).
- Diagnóstico previo (CSV local, 275 filas de datos): 0 llaves `account_name|contact_name`
  duplicadas hoy, pero 38 filas con `contact_name` vacío — riesgo latente de colisión de llave si una
  misma cuenta llega a tener 2+ filas sin contacto (no ocurre todavía).
**Pendientes:**
- (a) El HTML del cockpit (`docs/outreach-cockpit.html`) debe leer del Sheet para mostrar
  `team_status`/`notes` — hoy solo se hornean datos desde el CSV local vía `generate-cockpit.js`, el
  Sheet no se lee de vuelta.
- (b) Compartir el Sheet en vivo con el equipo (permisos).
- (c) Guard para cuentas con 2+ filas sin `contact_name`: hoy colisionarían bajo la misma llave y se
  pisarían team_status/notes entre sí.

## 2026-08-23 — Pull Cat4 no recuperable + pivote a proyecto "cockpit portable"
- Se pidió cerrar una sesión previa de pull Cat4 (ai_ark search de ~210 cuentas + muestra de 12
  enriquecidas) pero esa data NO aparece en ningún archivo del repo ni en contexto disponible al
  retomar — ni `output/cat4_tam_2026-08-23.csv`, ni cambios de Cat4 pendientes en `leads_master.csv`
  (lo único sin commitear ahí son 21 filas Cat3 de `cat3_icp_pull_2026-08-18`, ya presentes antes de
  hoy). Se decidió NO escribir cifras de costo/resultado no verificables (evita registro falso de
  gasto) — si esa corrida existe en otro lado (Sheet, screenshot), pendiente traerla para loggearla
  con datos reales.
- Apollo en PAUSA: su plan Free no expone email/teléfono vía API.
- Foco de sesión pivoteó a arrancar el proyecto "cockpit portable" — hoy el cockpit es HTML local
  (`docs/outreach-cockpit.html`); objetivo: abierto y operable para el equipo, no solo para Aldahir.
  Plan en 3 piezas: (1) publicación segura — repo privado por la data sensible, Aldahir es non-admin
  en cuentas Prima, pendiente resolver con Zadrac/Mike; (2) usar el Google Sheet en vivo como capa de
  persistencia en vez de backend nuevo; (3) botones que operen de verdad (no solo vista). Explícito:
  no poblar más leads esta sesión. Diagnóstico completo de las 3 piezas en
  `docs/cockpit-portable-diagnostico.md`: pieza 1 (publicación) bloqueada por permisos, pendiente de
  Zadrac/Mike; pieza 2 (`sync-sheet.js` es unidireccional CSV→Sheet, sin camino de vuelta) y pieza 3
  (HTML sin `fetch`/`localStorage`, botones de stage/secuencia solo mutan el DOM) quedan listas para
  construirse en la próxima sesión, no dependen de permisos de org.

## 2026-08-18 — Cat3 poblado por firmográfico-enriquecido (método Cat4); merge final al master
- Cat3 poblado por firmografico-enriquecido (metodo Cat4): +cuentas, +VERIFIED. Corregido el error de
  gatear enrichment por señal de noticia (Cat3 signal-first daba 2/126 = 1.6%; el fit firmografico ahora
  califica, la señal pasa a post-hoc para secuenciar outreach, no a filtro de entrada).
- 84 cuentas del TAM firmografico enriquecidas (Wiza gratis -> Hunter -> icypeas, techo 40cr/$4): 29
  VERIFIED, 64 filas con contacto mergeadas al master. Dedup: Gurtz Electric Co. y The ProLift Rigging
  Company ya estaban en master (lote signal-first previo) -> 0 duplicados, saltadas correctamente.
- Merge deterministico: backup output/leads_master-pre-cat3-final.csv, append puro (0 filas existentes
  tocadas, header/BOM/quoting verificados).
- Cockpit + Sheet regenerados. Enviables post-merge: Cat1 9/12, Cat2 10/11, Cat3 35/58, Cat4 26/68 —
  total 80/149 cuentas.
- Costo real: ultimo tramo (59 cuentas restantes de 84) 5.38 cr (~$0.54); batch completo de 84 cuentas
  8.66 cr (~$0.87).

## 2026-08-18 — Cat3 firmográfico-puro validado como fuente pobre + pivote a signal-first
- Cat3 firmografico-puro = fuente pobre (2/126, 1.6%); tamaño NO predice señal. 2 leads reales metidos (Gurtz/Vantage $15B, ProLift/Atlanta DC boom, 3 VERIFIED). TAM 127 guardado. Pivote: Cat3 signal-first desde proyectos DC conocidos.

## 2026-08-18 — Pull acotado + front en data real + sourcing Cat1/Cat2
- Deepline recargado (77 cr). Enriquecimiento bajo cost-control (techo $5/corrida, sample-first, billed_on_match, sin contactout).
- Muestra Cat1/Cat3 + reintento 5 colgados: 6 VERIFIED, 3.44 cr. Commit fff82b8.
- Backfill Cat4 (2 enviables/cuenta): 14 VERIFIED en 14 cuentas, 23 fallidos registrados, 4.34 cr. Commit 071a056.
- Sourcing Cat1/Cat2 desde Notion (OAuth Notion conectado): 3 cuentas nuevas (Lancium P1, Bitdeer P1, Nscale P2) + 6 contactos VERIFIED, 1.8 cr; xAI senal sin contacto. Descubrimiento gratis (Wiza+WebSearch). Commit 5dcff33.
- Total sesion: 26 VERIFIED + 3 cuentas nuevas, 9.58 cr (~$0.96). Saldo 67.48.
- Front: cockpit regenerado; Sheet via nuevo scripts/sync-sheet.js (clean-and-rewrite).
- Waterfall real: Apollo sin API key, Lusha caida por su limite -> Hunter->icypeas. Committee gratis via WebSearch+Wiza (ai_ark no usado).
- Senales viejas a refrescar antes de outreach: Bitdeer (nov-2025), Nscale (oct-2025), xAI (ene-2026). Lancium fresca.
- Pendientes: cerrar 4 Cat4 con candidatos sin intentar (Prolec/PCX/Switchgear/PTT); CleanSpark cuando Lusha reviva; discrepancia Fluidstack (Cat2 master vs Cat1 Notion); asignar owner Cat1/Cat2; Volta/Gcore/Panthalassa en watch por falta de US.

## 2026-08-18 — Pull de leads acotado + front conectado a data real
- Deepline recargado (77 cr). Enriquecimiento bajo cost-control (techo $5/corrida, sample-first, billed_on_match, sin contactout).
- Muestra Cat1/Cat3 + reintento de 5 colgados: 6 VERIFIED, 3.44 cr. Commit fff82b8.
- Backfill Cat4 (regla 2 enviables/cuenta): 14 VERIFIED en 14 cuentas, 23 fallidos registrados, 4.34 cr. Commit 071a056.
- Total sesion: 20 VERIFIED nuevos, 7.78 cr (~$0.78), ~$0.039/lead. Saldo 69.28.
- Front: cockpit regenerado desde leads_master (commit 80bb929, solo bloque DATA); Sheet via nuevo scripts/sync-sheet.js.
- Enviables ahora: 65 (Cat1 9, Cat2 10, Cat3 12, Cat4 34).
- Waterfall: Apollo sin API key (fuera), Lusha caida por su limite -> orden real Hunter->icypeas.
- Pendientes: cerrar 4 cuentas con candidatos sin intentar (Prolec, PCX, Switchgear, PTT); CleanSpark cuando Lusha reviva; sourcing net-new Cat1/2/3.

## 2026-08-15 · cuenta: trabajo
**Cockpit — pulido final, paleta de marca Prima real y logo.**

- /impeccable polish + delight: refinamiento de espaciados/jerarquía + micro-interacciones
  sutiles (hover en cards, transiciones) con mesura de modo Operate.
- /impeccable colorize con la paleta REAL de Prima extraída de capturas del ERP: negro cálido
  #1A1A1A, rojo-CORAL #DA5551 (no rojo puro — el real de Prima, más suave), azul acero
  #2E6DA4 SOLO para navegación/links (source→). Disciplina de color: rojo=estado/urgencia,
  azul=navegación, selección simple en negro/blanco. Contraste AA verificado.
- Logo de Prima real agregado al header (docs/assets/prima-logo.png) junto a "Outreach
  Cockpit", alineado al centro. Quitado el subtítulo "Data Centers" del header para limpieza.
  Nota: el PNG tiene ~67px de padding transparente arriba/abajo (afecta alineaciones finas si
  se reusa).
- SHOW_WARM_INTROS quedó en true tras la iteración.
- Todo verificado: LEADS/USERS/CATS byte-igual. Backups acumulados: outreach-cockpit-backup,
  -pre-shape, -pre-polish, -pre-brand.

ESTADO DEL COCKPIT: diseño terminado. Estructura reorganizada por categoría, nombres reales,
filtros de selección única, sort, feature flag warm-intros, paleta de marca Prima real, logo.
Listo para recibir datos reales.

PENDIENTES (otro Claude / Cowork): conectar cockpit a leads_master.csv (datos reales) — ahí
se ven noticias/radar reales y el sort trabajando.
PENDIENTES (Deepline recargado): Cat3/Cat4 signal-scan + 5 emails colgados.
PENDIENTE (futuro): detección de contactos en común para prender warm-intros (Sales Nav API
vs lista manual).

## 2026-08-15 · cuenta: trabajo
**Iteración de diseño del cockpit con Impeccable — reestructura + feature flag.**

- /impeccable init creó el brief que faltaba: PRODUCT.md + DESIGN.md (modo Operate, North Star
  "The Sales Ledger", regla del rojo en 5 lugares, mono solo para datos). Los rediseños
  previos corrían sin brief — por eso quedaban conservadores.
- /impeccable critique identificó problemas ESTRUCTURALES (no de piel): lista plana aunque
  prometía "by category"; códigos Cat1-4 sin los nombres reales que sí existen en datos;
  orden fijo escondido; stat-tiles que parecían botones sin serlo.
- /impeccable shape reestructuró: agrupación real por categoría con encabezados, nombres
  completos (AI Operators, etc.), selector Sort (warm/freshest/most-advanced) conectado a
  compareLeads(), stat-tiles ahora son filtros funcionales.
- Fixes: tiles de filtro ahora selección única (una a la vez); Sort funciona pero no se nota
  con data de muestra (1 lead/sección) — se verá con datos reales.
- Feature flag SHOW_WARM_INTROS=false: la función de warm-intro ("Daniel knows X") existe
  pero apagada por default hasta resolver detección de contactos en común (Sales Nav API o
  lista manual, decisión futura). Con flag apagado el cockpit se ve limpio; en true todo
  reaparece sin reescribir.
- Datos LEADS/USERS/CATS intactos byte-igual. Backups: outreach-cockpit-backup.html,
  outreach-cockpit-pre-shape.html.

PENDIENTES (para el OTRO Claude / Cowork):
1. Conectar el cockpit a leads_master.csv (datos reales). Ahí el Sort se verá trabajar y
   aparecen noticias/radar reales. NO requiere recargar Deepline — los leads ya existen.
2. Detección de contactos en común para prender SHOW_WARM_INTROS (Sales Navigator API vs
   lista manual — decisión aparte, más grande).

PENDIENTES (Deepline, cuando se recargue): Cat3/Cat4 signal-scan + 5 emails colgados.

## 2026-08-14 · cuenta: trabajo
**Iteración de diseño del cockpit con Impeccable — reestructuración a fondo.**

- Corrí /impeccable init con brief de marca de Prima → creó PRODUCT.md y DESIGN.md (modo
  Operate, North Star "The Sales Ledger", regla del rojo en 5 lugares, mono solo para datos).
  Esto era el paso que faltaba antes: los comandos previos corrían sin brief.
- /impeccable critique reveló los problemas estructurales reales (no de piel): la lista
  prometía agrupar "by category" pero era plana; mostraba códigos Cat1-4 sin los nombres
  reales que sí existen en los datos; orden fijo y escondido; stat-tiles que parecían botones
  sin serlo.
- /impeccable shape reestructuró: agrupación real por categoría con secciones y encabezados,
  nombres completos visibles (AI Operators, etc.), selector Sort (warm intro / freshest / most
  advanced) conectado a compareLeads(), stat-tiles ahora son filtros funcionales.
- Fix de 2 bugs de comportamiento: tiles de filtro ahora son selección única (una a la vez);
  Sort funciona pero no se nota con datos de muestra (1 lead por sección) — se verá con datos
  reales.
- Datos (LEADS/USERS/CATS) intactos byte-igual en todo. Backups: outreach-cockpit-backup.html
  y outreach-cockpit-pre-shape.html.

PENDIENTES:
1. Iterar más el diseño si se quiere (polish final, o typeset/delight). El look base ya gusta.
2. Push del cockpit + briefs a GitHub cuando se apruebe (hoy commit local).
3. Conectar el cockpit a leads_master.csv (datos reales) — en el otro Claude. Ahí el Sort se
   verá trabajar.

## 2026-08-14 · cuenta: trabajo
**Cockpit al repo + Impeccable instalado + primer pase de rediseño (en pausa para iterar).**

- Subí docs/outreach-cockpit.html al repo (commit ffd8e97, pusheado). Antes solo vivía como
  artefacto en el otro Claude, no en el repo.
- Instalé Impeccable (npx skills add pbakaus/impeccable) en .agents/skills. Corrí
  /impeccable audit sobre el cockpit: score 12/20, "aceptable". Fondo bueno (taxonomía Cat1-4,
  warm intros, cadencia E1/LI/E2/E3 son específicos de Prima, no genéricos), pero con 3 P1 de
  accesibilidad/legibilidad.
- Corrí /impeccable harden: arregló los 3 P1 (teclado/ARIA en filtros y toggle, contraste del
  texto ilegible --ink-3 de 2.6:1 a 5.0:1 sobre todo la edad de señal, tamaño de labels de
  cadencia). 15 líneas, 0 en datos/lógica.
- Backup creado: docs/outreach-cockpit-backup.html (pre-rediseño).
- Corrí rediseño visual (typeset+colorize+layout+polish) con dirección de marca: estilo
  Linear/Vercel minimalista, negro/blanco + rojo SOLO como acento sutil (5 lugares
  deliberados), quitó Space Grotesk/mono genérico y el grid punteado, paleta de categorías
  apagada sin rojo. Datos (CATS/USERS) intactos.
- APRENDIZAJE / próximo paso: los cambios funcionales y de accesibilidad gustan, PERO el
  rediseño mantuvo la ESTRUCTURA (mismo layout de cards) y sigue sintiéndose algo "AI". La
  estructura genérica es lo que da el look AI, no solo la piel. Impeccable por defecto es
  conservador con el layout.

PENDIENTES:
1. PRÓXIMA SESIÓN = ITERAR el diseño: darle a Impeccable permiso explícito para reestructurar
   el layout (no solo repintar), con contexto de qué necesita ver cada usuario de un vistazo.
   Considerar /impeccable bolder o /impeccable layout con dirección fuerte.
2. Push del cockpit rediseñado a GitHub cuando quede aprobado (hoy el rediseño está local, no
   pusheado; backup en docs/outreach-cockpit-backup.html).
3. Conectar el cockpit a leads_master.csv (datos reales) — Aldahir lo hará en el otro Claude.
4. Automatizar subida al Sheet + Cat3/Cat4 signal-scan (bloqueado por Deepline).

## 2026-08-14 · cuenta: trabajo
**leads_master.csv unificado + subido a Google Sheets en vivo.**

- Signal-scan Cat1/Cat2 ya estaba cerrado (16/17 con señal, commit 8ee17eb).
- Construí output/leads_master.csv: unifiqué los 4 CSVs (accounts_processed, leads_final,
  account_roster, pull) en un maestro único. 100 cuentas, 179 filas (1 por contacto), 23
  columnas. Por categoría: Cat1=9, Cat2=10, Cat3=13, Cat4=68. 19 excluidas marcadas (no
  perdidas). Conflicto de fuente: gana el más reciente + columna source_files. Banca de
  roster UNIDA (union+dedup por contact_name) en 9 cuentas → +27 contactos. Commit 118434d.
  Regla del maestro documentada en CLAUDE.md.
- Nota de arquitectura: el pull 2026-08-12 se generó por fuera del pipeline estándar (esquema
  ad-hoc signal_source/detail/url); el maestro normalizó a un solo esquema. Los 4 CSVs
  originales quedan como fuentes históricas intactas.
- Conecté terminal → Google Sheets vía service account. Google Cloud: proyecto
  prima-leads-sheet, robot prima-leads-bot@prima-leads-sheet.iam.gserviceaccount.com (Editor
  en el Sheet), API Sheets habilitada, llave en google-key.json protegida por .gitignore.
  Subí las 179 filas al Sheet en vivo con Node.js (googleapis + csv-parse, sin ensuciar el
  repo). Sheet: docs.google.com/spreadsheets/d/1lRWfcD4wIwvmTV8nuIpbpm2J9wCI8NQUF8RrF63v69g.
  OJO: el Sheet NO auto-actualiza — se alimenta del leads_master.csv local vía comando manual.
- Push a origin: 6 commits, main al día (3203c88..6c531f8).

PENDIENTES:
1. Automatizar la subida al Sheet (hoy comando manual; guardar el script Node como
   reutilizable).
2. Conectar el Sheet al cockpit (outreach-cockpit.html) — hoy corre con data de muestra.
3. Cat3/Cat4 signal-scan: bloqueado por Deepline (créditos negativos). Recargar para
   desbloquear + cerrar 5 emails colgados.
4. (Seguridad, decisión de Aldahir: NO rotar por ahora) La llave del service account quedó
   en el historial de git (commit 19a15ba, repo privado). Registrado como opcional, no
   bloqueador.

## 2026-08-12 · cuenta: trabajo
**signal-scan Cat1/Cat2 corrido — 17 cuentas ahora escribibles.**

- Corrí signal-scan sobre las 17 cuentas Cat1/Cat2 del pull, solo vía WebSearch, $0 gastado.
  Resultado 16/17 CON señal (fuente + fecha), 1 SIN señal (Voltage Park — ruido fuera de ventana,
  marcada "no contactar", no inventada). Commit 8ee17eb, local sin push.
- Scope estricto respetado: Cat3/Cat4 sin tocar. 22 filas modificadas = 17 cuentas (5 con 2
  contactos comparten señal).
- Señales de alta calidad: leases Anthropic (Riot, TeraWulf), AMD (Core Scientific), NVIDIA (IREN),
  rondas grandes (Together AI $800M, TensorWave $350M, RunPod, Lambda).

PENDIENTES:
1. signal-scan Cat3/Cat4: BLOQUEADO por predictleads/Deepline (créditos negativos). Recargar para
   desbloquear.
2. Cat1/Cat2 ya escribibles → siguiente fase hook/draft cuando toque.
3. Nota para Zadrac/draft: varias Cat2 son cripto-mineras pivoteando a AI (Riot, MARA, TeraWulf,
   Cipher, CleanSpark) — señal de "lease de XMW" puede necesitar ángulo distinto al de un OEM que
   abre planta.
4. Los 5 emails y las 3 cuentas blanco del pull siguen igual (bloqueados por crédito / sin
   dictionary committee 4A).

## 2026-08-12 · cuenta: trabajo
**Primer pull de leads US (4 categorías) + cost control. CRÍTICO: el pull salió SIN
señal — hay que correr signal-scan antes de que Zadrac escriba correos.**

- LEADS PULL (commit a59e1a9) → output/leads_pull_2026-08-12.csv. 37 cuentas (Cat1=7,
  Cat2=10, Cat3=10, Cat4=10), 34 con ≥1 contacto, 78% email VERIFIED, 76% LinkedIn.
  NO se usó prima-generate-leads completo — armado a mano: committee=ai_ark_people_search
  (WebSearch solo backup); email=waterfall Hunter→Lusha (billed-on-match), blank si ambos
  fallan; LinkedIn junto al email; máx 2-3 contactos/cuenta. Gates: descartar título sin
  match funcional, descartar contacto que ya no trabaja ahí (Lusha), conflicto de dominio→
  FOUND_UNVERIFIED, offshore marcado no descalificado. US ESTRICTO (regla: US=construye/opera
  en US, no HQ → IREN y Nebius entran; Nscale fuera). Cat1/Cat2 NO firmográficas → curadas y
  clasificadas A MANO contra el ICP con fuente.
- HUECO CRÍTICO — SIN SEÑAL: signal_source/detail/url/date en BLANCO; se saltó signal-scan.
  El correo es signal-first, así que estos leads NO son escribibles hasta correr signal-scan
  sobre las 37. Noticias (Cat1/2)=WebSearch GRATIS; vacantes (Cat3/4)=predictleads PAGADO.
  ES EL SIGUIENTE PASO.
- RADAR v0.2 (commit 9a9218a): colector de noticias Cat1/2 (buildout filter, freshness 180d,
  geo tag, safeguard transcripción fiel) en prima-signal-radar.
- COST CONTROL (commit 318c5e5, CLAUDE.md): techo default $5/corrida, balance-check antes de
  batch >$2, sample-first por tool/pricing, preferir billed-on-match. Caso: contactout_search_people
  cobra por perfil devuelto (no por match) → $9.52 no previstos, workspace a -22.94 créditos.

PENDIENTES:
1. signal-scan sobre las 37 → cada lead con gancho o "sin señal, no contactar". SIN ESTO el
   pull no le sirve a Zadrac. (noticias gratis ya)
2. 5 emails bloqueados por crédito (Deepline -22.94): Frank Basso/Voltage Park, Brent Shinall/MARA,
   Bradley Audiss/CleanSpark, Joseph Rivera/Hut 8, Adam Ziskind/Cipher. Recargar → cerrar (~$0.50).
3. 3 cuentas blanco: RunPod, Federal Pacific, Mitsubishi (por regla: committee no soporta 4A).
4. Pasar el CSV a Zadrac (manual). Puede arrancar con 34 — tracker aditivo.
5. LECCIÓN: pull por UNA vertical firmográfica con prima-generate-leads + signal-scan = barato
   + con señal. 4 cats a mano + sin signal = caro + manco. Regla: firmográfico con skill madura;
   manual solo para Cat1/Cat2 con techo de gasto.

FRENTES PAUSADOS: universo de vigilancia + radar v0.3 continuo (watchlist desde Notion con
dominios → noticias automáticas, alimenta el front); cockpit del equipo (une leads+feed del radar+
asignaciones+warm intros — warm intros necesitan export LinkedIn de Gaby+Daniel); sync CSV→Google
Sheet de Zadrac.

Guardrails: nunca inventar (blank si no hay); excluir Crusoe/Antora; outreach gateado a 20/semana
+ sign-off de Gaby (el pull es inventario, no envío); no comitear sin visto bueno (excepto SESION_LOG).

## 2026-08-11 · cuenta: trabajo
**Avancé — Primer pull de leads US Cat1-4 (37 cuentas), pipeline de enrichment validado:**
- Cerré la lista final: Cat1=7 (Nebius de vuelta por regla US-buildout), Cat2=10,
  Cat3=10 (paginado firmográfico a 10 US), Cat4=10 (P&E 5 con Switchgear Power
  Systems confirmado). 37 cuentas total.
- Enriquecí las 37 con el pipeline validado en la muestra: committee vía
  ai_ark_people_search como fuente primaria (cuenta + función), WebSearch solo
  de respaldo cuando el paid search da 0; waterfall de email Hunter → Lusha,
  blank solo si ambos fallan. Reglas de calidad aplicadas: descarta título sin
  match funcional, descarta contacto que ya no trabaje ahí (dato Lusha, ej. Joe
  Arellano se fue de FSG a Sodecia), marca conflicto de dominio como
  FOUND_UNVERIFIED sin elegir a ciegas (Joseph Harris/Riot, Cedrick
  McDuffie/Cleveland Electric).
- Carry-forward: consolidé 3 emails ya pagados en la muestra que se habían
  quedado fuera del CSV final por bug de merge (Hammons/Lambda,
  Jackson/Applied Digital, Tyndall/Core Scientific) — sin re-cobro.
- Re-source de blancos con contactout_search_people (nueva herramienta;
  confirmado que contactout_enrich_person NO sirve para esto — es enrich-only,
  necesita identidad ya conocida): recuperó 9 de 12 cuentas en blanco.
- Resultado final: 34/37 cuentas con contacto, 78% email VERIFIED, 76% con
  LinkedIn. Output: output/leads_pull_2026-08-12.csv.

**PENDIENTES:**
- 5 emails bloqueados por crédito insuficiente en Deepline (workspace quedó en
  -22.94): Frank Basso/Voltage Park, Brent Shinall/MARA Holdings, Bradley
  Audiss/CleanSpark, Joseph Rivera/Hut 8, Adam Ziskind/Cipher Mining — nombre +
  título + LinkedIn reales, solo falta el email. Requiere recargar créditos.
- 3 cuentas 100% en blanco: RunPod, Federal Pacific (ni ContactOut encontró
  nada), Mitsubishi Electric Power Products (Cat4 4A — sin dictionary de
  committee todavía, por regla de prima-committee no se inventa).
- Domain de Lambda sin forzar a uno solo: matt@lambda.ai y
  tandon@lambdalabs.com ambos verifican como deliverable — Lambda corre los
  dos dominios de correo vivos post-rebranding, no es un bug a resolver.
- LECCIÓN DE COSTO: contactout_search_people cobra por perfil devuelto, no por
  match relevante — un diagnóstico de 1 cuenta (2 perfiles, $0.28) no predijo
  el costo real en cuentas más grandes (hasta 12 perfiles, $9.52 en 11
  cuentas). Sample-first tiene que probar el rango de tamaño de resultado por
  herramienta/pricing model, nunca extrapolar de un solo diagnóstico barato.

## 2026-08-11 · cuenta: trabajo
**Avancé — Fase 3 (Tier 0) cerrada, Fase 6 (Vigilar) arrancada, cockpit del equipo:**
- FASE 3 (Arreglar Tier 0): HECHA y validada en las 2 verticales Cat4 (Power &
  Electrical, Energy Storage). Commits 26cc862 (formas del payload), 5c8e477
  (Cat4 P&E: KEYWORD + exclude wholesale), 2fc8266 (Cat4 Energy Storage:
  INDUSTRY + exclude renewable), 90d9267 (roster). Regla: el `source` depende
  del tipo de término (producto→KEYWORD, industria→INDUSTRY); el `exclude` es
  por-categoría, nunca global. Scope de Tier 0 queda en Cat3/Cat4; Cat1/2 se
  cubren por curación + señal, no por Tier 0.
- FASE 6 (Vigilar): arrancada. Skill nueva prima-signal-radar v0.1 = colector
  de vacantes de procurement vía predictleads. Salidas: output/signal_radar_feed.csv
  y output/signal_radar_sweeplog.csv. Safeguards: source_url obligatorio, dedup
  por (account, url), nunca inventar, sample-first con aprobación de costo.
  Validado end-to-end: Rosendin 2/2 señales frescas, PTT con su única vacante
  de purchasing correctamente filtrada por estar cerrada.
- LinkedIn: prima-committee ahora captura profile_url también en contactos
  resueltos por Tier 2 (Wiza/ai_ark), no solo Tier 1 (WebSearch). Blank si el
  proveedor no lo trae, nunca inventado.
- Cockpit del equipo: outreach-cockpit.html (estilo Deepline), 3 features:
  vista por usuario, conteo de follow-up (solo front por ahora), y warm intros
  (Gaby + Daniel). Corre con data de muestra. Es la superficie visual de la
  Fase 6.

**PENDIENTES:**
- Push: main sigue adelante de origin, sin push. (El fix de LinkedIn en
  prima-committee y prima-signal-radar + sus 2 CSV ya están comiteados —
  348484b y d68a0b3 — lo que falta es solo el push, no el commit.)
- v0.2 del radar: colector de noticias, para cubrir Cat1/2 (hoy sin señal de
  vacantes por la limitación de categorización de predictleads).
- Enumerar el universo de cuentas desde Notion — hoy la lista de entrada al
  radar es un parámetro manual, no se lee sola de ninguna fuente.
- v0.3 del radar: barrido continuo / programado, no a demanda.
- Zadrac: acceso al repo y al radar en docs/.
- Afinar el keyword fallback del filtro de vacantes con más data real.
- Pedir acceso a los monitors nativos de Deepline (hoy bloqueados).

## 2026-08-10 · cuenta: trabajo
**Avancé — Fix Tier 0 (Fase 3) + arranque capa Vigilar (Signal Radar):**
- Tier 0 firmográfico desbloqueado (llevaba semanas roto). 2 verticales Cat4.
  Commits: 26cc862 (formas), 5c8e477 (Cat4 P&E: KEYWORD+exclude wholesale),
  2fc8266 (Cat4 Energy Storage: INDUSTRY+exclude renewable), 90d9267 (roster).
  Hallazgos: el source depende del tipo de término; el exclude es por-categoría.
  Scope cerrado: Tier 0 = Cat3/Cat4; Cat1/2 por curación+señal.
- Capa Vigilar arrancada: skill nueva prima-signal-radar v0.1 (colector de
  vacantes Cat3/Cat4, fuente predictleads, feed+sweeplog+safeguards), validada
  end-to-end. Mockup visual entregado. Diseño en engine-vigilar-radar-log.md.
- LinkedIn: fix en prima-committee para capturar LinkedIn de Tier 2.

**PENDIENTES:**
- Push (main adelante de origin).
- v0.2 colector de noticias (Cat1/2).
- Universo desde Notion.
- v0.3 continuo.
- Zadrac acceso repo + radar en docs/.
- Afinar keyword fallback.
- Pedir acceso a monitors nativos de Deepline.

**DOCS:** engine-tier0-fase3-log.md, engine-vigilar-radar-log.md

## 2026-08-05 · cuenta: trabajo
**Avancé — Fase 1 y Fase 2 del ROADMAP: motor pasa de 2 a 4 categorías del ICP:**
- Creé ROADMAP.md en la raíz: análisis de estado por capa (vigilar/entender/
  decidir/ejecutar/aprender) y secuencia de 7 fases ordenada por dependencias.
- FASE 1 — prima-scope-score alineado: gate Cat4-only y la señal de sourcing
  ahora referencia el match funcional de committee. Con esto quedan las 5 skills
  bajo el mismo principio: committee es la única dueña del diccionario de
  títulos, las demás lo referencian.
- FASE 2 — abiertas Category 1 (AI Infrastructure Operators) y Category 2
  (Crypto Miners → AI). 16 cuentas nuevas, 11 de ellas P1: CoreWeave, IREN,
  Fluidstack, Lambda, Nebius, Riot, Core Scientific, CleanSpark, TeraWulf,
  Bitdeer y más.
- HALLAZGO CRÍTICO: la polaridad del scope se INVIERTE entre categorías. En Cat4
  scope-score penaliza a quien fabrica in-house (busca quien subcontrate). En
  Cat1/Cat2, operar y comprar todo directamente es exactamente lo que califica
  ("Full = builds AND equips own campus"). Aplicar la lógica de Cat4 ahí habría
  descalificado a las mejores cuentas. Por eso el gate de scope-score se invirtió
  de lista de exclusión a lista de inclusión: solo Cat4 pasa.
- Diccionario Cat1/Cat2 en prima-committee: un solo tier PRINCIPAL (VP
  Infrastructure, Head of Deployment, Director of Supply Chain, VP Operations,
  Head of HPC, Procurement Director + variantes funcionales), COO en FALLBACK
  por la regla de C-suite. No hay segundo tier funcional a propósito: para un
  operador que compra equipo directo, el VP de Infraestructura ES el comprador.
- CRUSOE ES CLIENTE EXISTENTE (confirmado por Aldahir). Excluida en icp-check
  junto con Antora Energy, con lista nombrada de clientes existentes mantenida
  solo por confirmación humana. Aplica a toda entidad Crusoe (Cloud / Energy
  Systems), no solo al nombre del Notion.

**PENDIENTES:**
- Probar el diccionario Cat1/Cat2 en dos extremos: CoreWeave (pública, mucha
  huella) y Fluidstack (privada, poca) — ver si el FALLBACK al COO se dispara.
- vertical_owner de Cat1/Cat2 y Cat3: todas incluyen cooling skids (vertical de
  Manu). Todas en UNKNOWN hasta acordarlo con él.
- FASE 3 del roadmap: arreglar Tier 0. FASE 4: enumerar el TAM completo.
- Avisarle a Zadrac que Crusoe es cliente — aparece como prospecto en sus
  correos de prueba y su bot no puede detectarlo solo.
- ¿4B debe tener tier FALLBACK? Hoy queda en cero cuando solo hay C-suite.
- PCX quedó con juniors en active, de antes de la regla de seniority.

## 2026-08-05 · cuenta: trabajo
**Avancé — alineación de skills y poblado del roster:**
- Encontré un patrón de bug repetido en 4 skills: diccionarios de títulos
  duplicados, match por string exacto, y desconocimiento de Cat3. Lo perseguí a
  propósito en todas en vez de esperar a tropezarme.
- prima-signal-scan: dejó de mantener su propia lista y ahora referencia los
  diccionarios de prima-committee. Antes devolvía NO_SIGNAL en cuentas CON
  señal (falso negativo silencioso, el peor error posible). Probado con
  Excellerate: antes 3 rondas y criterio humano, ahora sale a la primera.
- Regla nueva: fallback acotado al dominio antes de marcar un título como no
  encontrado. Los títulos genéricos ("Plant Manager") se ahogan en web abierta.
- prima-generate-leads: BUG REAL corregido — ruteaba cuentas Cat3 a
  prima-scope-score, que es Cat4-only. Ahora las rutea por fuera. Además dejó
  de duplicar el ranking de seniority.
- prima-icp-check: la columna Entry point ya describe función, no títulos.
- Regla nueva: desempate por seniority dentro del tier (VP > Director > Manager
  > Buyer). Salió de PCX, donde "Buyer 1" quedó como contacto activo.
- Roster poblado: 13 cuentas con banca (Form Energy, EnerVenue, Eos, Moment,
  Redwood, Rosendin, Excellerate, Prolec, IEM, PCX, PTT, Cupertino).
- Wiza (gratis, dentro de Deepline) resolvió 2 veces lo que WebSearch no pudo,
  con costo $0. Debe ser siempre el primer proveedor.

**HALLAZGOS:**
- El 4B es MÁS difícil de sourcear que el 4C: los scale-ups tienen LinkedIn
  actualizado, los fabricantes establecidos no. IEM dio cero ALTA en WebSearch.
- 4B no tiene tier FALLBACK; cuando solo hay C-suite visible, queda en cero.
  Decidir si 4B debe tener FALLBACK.
- Excellerate: arrancó planta de $80.5M / 500K sq ft en Monroe LA (2026-08-01) y
  tiene 3 vacantes de sourcing abiertas. Cuenta hirviendo, pero sin contacto
  localizable. Requiere trabajo manual.

**PENDIENTES:**
- prima-scope-score: último eslabón sin alinear (no conoce Cat3, no referencia
  match funcional). Sin bugs activos.
- El roster no avisa cuando una corrida nueva encuentra a alguien mejor que un
  active existente (caso IEM/Kris Syal).
- PCX quedó con juniors en active, de antes de la regla de seniority.
- Verificar que company_category y notion_scope lleguen a leads_final.csv.
- Tier 0 sigue roto. vertical_owner de Cat3 con Manu. Llamada Zadrac.

## 2026-08-04 · cuenta: trabajo
**Avancé — apertura de Category 3 y rediseño de targeting de contactos:**
- Fase 1: prima-icp-check acepta Category 3 (Modular DC Systems Manufacturers,
  P1 en Notion). Columnas nuevas company_category y notion_scope. Cat3 usa
  sub_segment = N/A-Cat3, priority LEÍDA del Notion, vertical_owner = UNKNOWN
  pendiente con Manu. Commit 0481d7f. Probado con Rosendin (Cat3) + Powell
  (regresión Cat4). Duplica el universo de cuentas P1.
- Fase 2: prima-committee soporta Cat3 — entrada por procurement de la división
  de manufactura, regla crítica de división (nunca el corporativo de la matriz
  contratista), Cat3 P1 siempre sale NEEDS_HUMAN_REVIEW. Commit c36497b.
- 4C rediseñado: Founder/CEO baja a FALLBACK; ALTA ahora es procurement/supply
  chain, SECUNDARIA manufactura/operaciones. Razón: los 4C reales (Form Energy,
  EnerVenue, Eos, Redwood) ya tienen supply chain organizado; Prima vende
  suministro = conversación de compras. Commit 5d3b05c.
- Banca de contactos: sourcing de 3-4 nombres por cuenta (el guardrail de
  escribir a máx 2 no cambia). Nuevo output/account_roster.csv, ACUMULATIVO,
  con división de propiedad: la skill escribe quién existe, el operador marca
  qué pasó (contact_status, touches, outcome, notes). La banca NO consume
  Deepline: nombres por WebSearch (gratis), email solo al promover. Commit 3a52eb1.
- Match por función, no por string exacto: los títulos del diccionario son
  ejemplos de una función. Commit af73842. Este fue el cambio decisivo.
- VALIDADO con Form Energy: 4 contactos de supply chain, cero CEOs, los 4 por
  match funcional (ninguno coincide literal), cero llamadas a Deepline.
  Contacto #1: Catherine Carmichael, VP Global Supply Chain. Con la regla vieja
  de string exacto los 4 se habrían descartado y habría caído al CEO.

**Marco estratégico acordado:** con TAM chico (cientos de cuentas), el engine
deja de ser generador de listas y se vuelve sistema de vigilancia del TAM
completo. Los dos huecos reales son VIGILAR (monitoreo continuo, no lotes) y
APRENDER (respuestas clasificadas que recalibren pesos). Todo lo construido
está en medio. NO construir: más generación de copy (es de Zadrac), nada que
persiga volumen, nada que automatice el criterio del operador.

**PENDIENTES:**
- Poblar account_roster.csv con el resto de las cuentas (por lotes chicos,
  revisando el match funcional).
- Re-correr prima-committee sobre las cuentas viejas: sus contactos se eligieron
  con la regla vieja (por eso salían CEOs).
- prima-scope-score no soporta Cat3 (tabla product-type es Cat4-only).
- Verificar que company_category y notion_scope lleguen a leads_final.csv (las
  escribe el orquestador, puede tener lista de columnas fija).
- vertical_owner de Cat3: acordar con Manu.
- Borrar fila duplicada de Rosendin en Cat 5 del Notion.
- Enumerar el TAM completo (ejercicio de una vez, no motor recurrente).
- Llamada Zadrac: punto de entrega, dedup, que regrese respuestas clasificadas
  (es lo más estratégico), volumen, guardrails para su agente.
- Canal nuevo de LinkedIn: template como primer toque mientras corre el warm-up.

## 2026-08-03 · cuenta: trabajo
**Avancé — apertura de Category 3 en el motor de prospección:**
- Leí el Notion "Data Centers GTM" en vivo y verifiqué la alineación del ICP.
  Hallazgo: el esquema 4A-4D NO está retirado (es capa propia sobre Cat 4,
  aprobada 2026-07-19) y la derivación de prioridad SÍ calibra contra el Notion
  (4A→P2, 4B→P1, 4C→P1, 4D→P3 coinciden con la Prima Priority curada). El 95%
  de cuentas P1 no es un bug: es la verdad del TAM de Cat 4.
- Fase 1 — prima-icp-check ahora acepta Category 3 (Modular DC Systems
  Manufacturers, P1 en Notion). Nuevas columnas company_category y notion_scope.
  Cat3 usa sub_segment = N/A-Cat3, priority LEÍDA del Notion (no derivada), y
  vertical_owner = UNKNOWN pendiente de acordar con Manu. Commit 0481d7f.
  Probado con Rosendin (Cat3 OK) + Powell (regresión Cat4 OK).
- Fase 2 — prima-committee ahora soporta Cat3: entrada por procurement/supply
  chain de la división de manufactura (principal) + líder de manufactura/prefab
  (secundario), máx 2 contactos. Regla crítica de división: nunca el corporativo
  de la matriz contratista (Excellerate no Faith Technologies; RK Mission
  Critical no RK Industries). Gate: Cat3 P1 siempre sale NEEDS_HUMAN_REVIEW.
  Commit c36497b.
- Hallazgo clave: Cat3 se salta el cuello de botella de scope-score, porque el
  Notion ya trae el "Fabrication Outsourcing Scope" curado a mano por empresa.
- Decisión de alcance: el copy de correos pasa a Zadrac (su SDR Bot). Mi foco
  es prospección y estructura de cuenta. prima-draft, guardrail-audit y los
  templates E2/E3 bajan de prioridad.
**PENDIENTES:**
- vertical_owner de Cat3: acordar con Manu (Cat3 cruza verticales por diseño).
- Borrar la fila duplicada de Rosendin en Cat 5 del Notion (el propio Notion la
  marca como redundante).
- Fase 3: que prima-generate-leads descubra cuentas Cat3 nuevas (hoy solo Cat 4).
  No urge: hay 9 Cat3 en Notion sin trabajar.
- prima-scope-score no soporta Cat3 (su tabla de product-type es Cat4-only).
- Llamada con Zadrac/Manu: punto de entrega del CSV, dedup, que me regrese las
  respuestas clasificadas, volumen (20-40/día vs techo 20/semana), y guardrails
  de mensaje para su agente (traía framing de precio 20-25% ya retirado).
- Los 19 E1 de drafts_e1.md siguen sin enviar.

## 2026-07-28 (sesión 3) · cuenta: trabajo
**Avancé — operativa + friendly-user:**
- Generé los 19 correos E1 reales (13 capacity + 6 funding), todos PASS, en drafts_e1.md. Envío manual pendiente.
- Calibré E1 a v1.3 (señal humana, sin em-dashes, intro AISC/AWS + AI infra + US seller of record, set fijo de productos, cierre backstop) y T-4C-founder a v2. Ambos comiteados.
- Creé COMMANDS.md (atajos del motor) y README.md real del repo (reemplazó el stub vacío).
- Ordené git: merge de los 2 commits remotos (web) con los locales + push. Repo alineado.
- Hallazgo documentado: anchor_products se calcula pero el template E1 ya no lo consume (set fijo desde v1.3) — decidir a futuro.
**PENDIENTES:**
- Templates E2/E3 + LinkedIn de cadencia (reloj ~5 días).
- Fallback sin señal.
- Otras capas friendly-user (Manu/Zadrac/Gaby).
- Mover/borrar templates.md huérfano.
- Refund Deepline + Tier 0 roto.

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
