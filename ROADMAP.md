# ROADMAP — Engine de prospección Data Centers

_Aldahir Chiw · última revisión 2026-08-05_

---

## El marco (decidido 2026-08-04)

El TAM es chico: **cientos de cuentas, no miles**. Eso cambia qué significa
"potente". Con 400 cuentas se puede vigilar el universo completo, cosa imposible
con 50,000. El engine deja de ser **generador de listas** y se vuelve **sistema
de vigilancia del TAM completo**.

Cinco capas: **vigilar → entender → decidir → ejecutar → aprender**.

## Dónde estamos hoy

| Capa | Estado |
|---|---|
| **Vigilar** | v0.1 — colector de vacantes (Cat3/Cat4, `predictleads`). Falta noticias (Cat1/2) y barrido continuo. |
| **Entender** | Sólido, pero solo para 2 de las 7 categorías del ICP. |
| **Decidir** | Sólido. committee con tiers, match funcional, seniority, banca. |
| **Ejecutar** | De Zadrac (email). LinkedIn es mío. Bloqueado por warm-up. |
| **Aprender** | No existe. Los pesos del scoring son suposiciones sin validar. |

**El hueco más grande no es técnico, es de cobertura:** el ICP tiene 7
categorías, el motor cubre 2 (Cat 3 y Cat 4). Cat 1 (AI Infrastructure
Operators) y Cat 2 (Crypto Miners → AI) son **Priority 1** y están fuera. Ahí
viven CoreWeave, TeraWulf, MARA, CleanSpark, IREN, Core Scientific.

Y de escala: ~28 cuentas identificadas de un TAM estimado en cientos. El
universo ni siquiera está enumerado.

## Lo que NO se construye

- Generación de copy — es de Zadrac.
- Nada que persiga volumen — techo de 20/semana, TAM chico.
- Nada que automatice el criterio del operador — ese es el foso, no el cuello
  de botella.
- Herramientas nuevas antes de usar las que ya existen (Wiza llevaba meses
  disponible y gratis sin usarse; Import Genius sigue desconectado).

---

## La secuencia

Ordenada por dependencia, no por gusto. Cada fase habilita la siguiente.

### Fase 1 — Cerrar la alineación: `prima-scope-score`
Último eslabón sin alinear. No conoce Cat 3 (la nota vive en el archivo
equivocado) y no referencia la regla de match funcional, así que puede repetir
el error de falso negativo que ya costó en signal-scan.
**Costo:** cero. **Bloquea:** nada, pero deja el motor coherente.

### Fase 2 — Abrir Category 1 y Category 2
Donde está el TAM P1 sin tocar. **No es copiar Cat 3:** estas empresas *compran
equipo*, no subcontratan fabricación. scope-score no aplica igual, el buying
committee es otro (SVP Data Centers, VP Strategic Sourcing, Chief Development
Officer, VP Engineering & Construction), y el ángulo comercial es distinto.
Es diseño nuevo.
**Costo:** cero (diseño). **Bloquea:** la enumeración completa.

### Fase 3 — Arreglar Tier 0
El descubrimiento firmográfico lleva semanas roto (`industries`/`employeeSize`
no existen en el schema real de AI Ark). Bajo el marco de vigilancia importa
menos para corridas recurrentes, pero es **la herramienta correcta para
enumerar** el universo de una vez.
**Estado: HECHA (2026-08-10).** Validada en las 2 verticales Cat4 (Power &
Electrical, Energy Storage). Commits: `26cc862` (formas del payload), `5c8e477`
(Cat4 P&E: KEYWORD + exclude wholesale), `2fc8266` (Cat4 Energy Storage:
INDUSTRY + exclude renewable), `90d9267` (roster). Regla: el `source` depende
del tipo de término (producto→KEYWORD, industria→INDUSTRY); el `exclude` es
por-categoría, nunca global.
**Costo:** créditos para probar contra el API real. Requiere aprobación.

### Fase 4 — Enumerar el TAM completo
Ejercicio de **una sola vez**, no motor recurrente. Listar las cuentas de las 7
categorías. Con Tier 0 funcionando y todas las categorías abiertas, se hace una
vez y bien, en vez de descubrir en lotes semanales.
**Depende de:** Fases 2 y 3.

### Fase 5 — Poblar el roster sobre el TAM completo
Correr committee sobre todas las cuentas enumeradas. Barato (WebSearch + Wiza
gratis), mecánico. Deja banca lista en todo el universo.
**Depende de:** Fase 4.

### Fase 6 — Construir la capa de vigilar
Monitoreo continuo sobre la watchlist completa: aduanas (Import Genius, ya
pagado y desconectado), vacantes de procurement, fondeo, permisos, expansiones.
El output deja de ser "genera 20 leads" y pasa a ser "3 de tus cuentas se
movieron esta semana". Aquí entra el bot de Slack — no para disparar a mano,
sino para avisar.
**Estado: EN PROGRESO.** v0.1 (vacantes) listo — skill `prima-signal-radar`,
colector de vacantes de procurement para Cat3/Cat4 vía `predictleads`, validado
end-to-end 2026-08-10. Falta: v0.2 (noticias, para cubrir Cat1/2 — hoy sin
señal de vacantes por la limitación de categorización de `predictleads`),
enumerar el universo completo desde Notion (hoy la lista de entrada al radar es
un parámetro manual), y v0.3 (barrido continuo/programado en vez de a demanda).
Nota: el cockpit del equipo (`outreach-cockpit.html`) es la superficie visual
donde aterriza el feed del radar, más asignaciones (Zadrac) y warm intros
(Gaby/Daniel). Dependencias humanas: export de conexiones de LinkedIn de Gaby y
Daniel; definir con Zadrac dónde viven las asignaciones y los follow-ups.
**Depende de:** Fase 4 (sin watchlist no hay qué vigilar).

### Fase 7 — Cerrar el ciclo de aprender
Las respuestas clasificadas de Zadrac (interesado / pide info / no / OOO /
bounce) recalibran los pesos del scoring, hoy suposiciones. Responde la única
pregunta que importa: qué señal, qué segmento y qué ángulo convierten.
**Depende de:** que Zadrac regrese las respuestas. Dependencia externa — es lo
más estratégico de esa llamada, más que el punto de entrega.

---

## Decisiones abiertas del operador (no técnicas)

- **`vertical_owner` de Cat 3** — cruza verticales por diseño. Acordar con Manu.
- **¿4B debe tener tier FALLBACK?** Hoy no lo tiene; cuando solo hay C-suite
  visible (caso IEM), la cuenta queda en cero contactos.
- **Punto de entrega con Zadrac** — Notion, CSV directo, o Sheet.
- **Deduplicación con Zadrac** — quién evita que la misma persona reciba dos
  toques.

## Deuda menor (no bloquea nada)

- El roster no avisa cuando una corrida nueva encuentra a alguien mejor que un
  `active` existente (caso IEM / Kris Syal).
- PCX quedó con contactos junior en `active`, de antes de la regla de seniority.
- `prima-generate-leads` se contradijo a sí mismo 3 veces en una sesión — es el
  archivo más parchado. Merece una lectura completa buscando contradicciones.
- Borrar la fila duplicada de Rosendin en Cat 5 del Notion.
- El merge de `leads_final.csv` es por `account_name` como texto: si el nombre
  cambia, pierde el historial.
