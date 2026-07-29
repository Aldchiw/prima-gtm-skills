# COMMANDS.md — atajos del motor prima-gtm-skills

Cómo se usa: en Claude Code, di **"corre el comando `<nombre>` de COMMANDS.md"**
y Claude lee de aquí el prompt completo y lo ejecuta. Tú memorizas el nombre
corto; el detalle vive en este archivo.

Reglas que aplican a TODOS los comandos de abajo (ya vienen incluidas en cada
prompt, se listan aquí para que sepas qué te protegen):
- NUNCA tocar Deepline / ai_ark / email-waterfall / Tier 0 sin que lo pidas
  explícito (esos gastan créditos — hoy congelados por el refund pendiente).
- NUNCA comitear sin tu visto bueno, EXCEPTO `cierra-sesion` (esa sí comitea
  solo el SESION_LOG, es tu regla).
- NUNCA inventar datos: si un campo no está en el CSV, se deja vacío.
- Los CSVs de datos (leads_final, accounts_processed) no se regeneran ni se
  sobreescriben salvo que el comando lo diga.

---

## `genera` — generar leads nuevos (YA EXISTÍA)

Este ya está formalizado en prima-generate-leads. Sintaxis:

```
genera 20 leads de Power & Electrical
genera 15 leads de Energy Storage
```

OJO: este SÍ usa Tier 0 + email-waterfall (gasta créditos de Deepline).
No lo corras hasta que el refund esté resuelto y quieras cuentas nuevas.

---

## `regen-drafts` — redactar/auditar E1 sobre cuentas existentes (SIN Deepline)

La operación que más repites. Corre hook → draft → audit sobre las cuentas que
ya tienes, rutea cada una a su template correcto, y escribe a drafts_e1.md.

Prompt que dispara:
```
Trabaja SOLO con leads_final.csv y accounts_processed.csv. NO Tier 0,
NO email-waterfall, NO Deepline / ai_ark. NO regeneres los CSVs. NO comitees.

Con el override manual de scope P1 ya autorizado por Aldahir, regenera el E1
de las cuentas indicadas. Rutea por la regla de templates/index.md: signal_type
= capacity_expansion -> e1_datacenter_overflow; signal_type = funding (u otro)
-> el template normal por sub_segment (4C -> T-4C-founder-v2). Corre
prima-hook -> prima-draft -> prima-guardrail-audit por cada una.

Sobrescribe drafts_e1.md en la raíz. Por cuenta: account_name, contact_name,
contact_email, Subject, Body completo, template_id, y veredicto del audit.
Al final, tabla resumen (cuenta | template | audit). Confírmame que quedó
escrito. NO comitees ese archivo.
```
Si quieres solo un subconjunto, dilo al invocar: "corre regen-drafts solo para
las 6 de funding".

---

## `clasifica` — tabla de clasificación de una lista de cuentas (SIN Deepline)

Saca la verdad del CSV (vertical, sub-segment, priority, señal, anchor) sin
adivinar. Útil antes de decidir a quién escribir.

Prompt que dispara:
```
Trabaja SOLO con leads_final.csv y accounts_processed.csv. NO Tier 0,
NO email-waterfall, NO Deepline. NO comitees. WebSearch permitido (gratis).

Para la lista de cuentas que te doy, muéstrame una tabla con: account_name,
vertical (Energy Storage / Power & Electrical / frontera-verificar), priority
(P1/P2/P3, LEÍDA de accounts_processed.csv; "no-en-CSV" si no está), signal
(sí/no según signal_summary; "no-en-CSV" si falta), anchor_product (del CSV o
icp-check; vacío si no se sabe). No inventes ningún dato.
```

---

## `arma-tracker` — generar/actualizar el tracker de envío (SIN Deepline)

Crea outreach_tracker.csv con el bloque de clasificación lleno y los bloques de
cadencia/resultado vacíos para llenar a mano.

Prompt que dispara:
```
Trabaja SOLO con leads_final.csv y accounts_processed.csv. NO Deepline.
NO comitees. Archivo en inglés.

Crea/actualiza output/outreach_tracker.csv con una fila por cada cuenta
indicada y estas columnas EN ESTE ORDEN:
account_name, vertical, sub_segment, priority, signal_source, angle,
contact_name, contact_email, date_e1_sent, date_li_sent, date_e2_sent,
date_e3_sent, reply_status, reply_date, notes

Llena desde los CSVs: account_name, vertical, sub_segment, priority,
signal_source, contact_name, contact_email. Pon angle = "E1_overflow" (o el
que indique). Deja VACÍAS las columnas date_* y reply_*. Si un dato no está,
déjalo vacío, NO lo inventes. Muéstrame las primeras 3 filas y confirma que
quedó escrito. NO comitees.
```

---

## `cierra-sesion` — actualizar SESION_LOG y comitear SOLO el log

El único comando que comitea sin pedir OK (es la regla de cierre de sesión).

Prompt que dispara:
```
Agrega una entrada nueva al inicio del historial en SESION_LOG.md con la fecha
de hoy (cuenta: personal). Yo te dicto el resumen (Avancé / Pendiente / Sigue);
si no te lo doy, pídemelo una vez. Escribe la entrada, muéstramela, y luego
comitea SOLO SESION_LOG.md con un mensaje "docs: session log <fecha> — <resumen
en 6-10 palabras>". No toques ni comitees ningún otro archivo.
```

---

## Notas de mantenimiento (no son comandos, son recordatorios)

- Templates E2 / E3 y el LinkedIn de cadencia: pendientes de crear.
- Template fallback sin señal (e1_fallback_no_signal): diseñado, no creado.
- README.md de la raíz está corrupto (UTF-16) y vacío — reescribir algún día.
- Tier 0 roto (campos industries/employeeSize no existen en AI Ark) — arreglar
  cuando el refund de Deepline esté resuelto.
