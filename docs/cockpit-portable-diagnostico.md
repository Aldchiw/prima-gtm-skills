# Cockpit portable — diagnóstico (2026-08-23)

Punto de partida para el proyecto "cockpit portable": hoy `docs/outreach-cockpit.html` es un
archivo local que solo Aldahir abre. Objetivo: abierto y operable para el equipo. Plan en 3 piezas.

## 1. Publicación segura — bloqueada, pendiente de Zadrac/Mike

Repo privado en `github.com/Aldchiw/prima-gtm-skills` (dato sensible: contactos/emails de leads).
Aldahir es non-admin en las cuentas Prima → no puede resolverlo solo. Opciones para llevar a esa
conversación:

- **GitHub Pages privado** — requiere plan GitHub Team/Enterprise en la org (Pages en repo privado
  no existe en plan Free/Pro individual).
- **Netlify/Vercel con password-gate** — hosting externo de un solo archivo estático, protegido por
  contraseña o allowlist de emails del equipo.
- **Quedarse interno, sin URL pública** — seguir compartiendo el HTML por archivo/Drive; no resuelve
  "operable para el equipo" en tiempo real, pero cero riesgo de exposición.

Ninguna opción se implementó — decisión de negocio/permisos, no técnica.

## 2. Google Sheet en vivo como capa que guarda — gap identificado

`scripts/sync-sheet.js` hoy es **unidireccional**: lee `output/leads_master.csv` local y sobrescribe
la hoja completa (clear + rewrite). No hay camino de vuelta Sheet → cockpit, ni de cockpit → Sheet.

`docs/outreach-cockpit.html` no tiene `fetch()` ni `localStorage` — los datos se hornean estáticos en
build time vía `scripts/generate-cockpit.js` (bloque `DATA:START`/`DATA:END`). Los botones de stage y
de secuencia que ya existen en el HTML (funciones `renderTiles`, `openSequence`, `seqStepHtml`, etc.)
solo mutan estado en memoria del navegador — se pierde al recargar.

Para que el Sheet funcione como capa de persistencia real hace falta un puente, porque el cockpit no
puede llamar la Sheets API directo desde el navegador sin exponer `google-key.json` (la credencial de
service account) en HTML público. Opción evaluada: **Google Apps Script Web App** atado a la misma
hoja, expuesto como endpoint HTTP (`doGet`/`doPost`) que el cockpit llama por `fetch()` — patrón
estándar para HTML estático que necesita escribir en Sheets sin backend propio ni credenciales
expuestas. No se implementó aún.

## 3. Botones que operen de verdad — depende de la pieza 2

Una vez que exista el endpoint de la pieza 2, conectar los botones existentes (stage, secuencia) para
que hagan POST/GET reales contra el Sheet en vez de mutar solo el DOM. No empieza hasta resolver 2.

## Estado al cierre de esta sesión

Solo diagnóstico — nada de código nuevo. Piezas 2 y 3 no dependen de permisos de org y se pueden
construir en una próxima sesión sin esperar a Zadrac/Mike; la pieza 1 sí depende de esa conversación.
