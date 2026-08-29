# 🔍 Deep Analysis — Outreach Cockpit

_Análisis high-level de la lógica de la app, basado en el sistema que construimos y auditamos hoy. Objetivo: dejarlo redondo. No es para ejecutar todo — es para que TÚ decidas qué sí, qué no, y en qué orden._

---

## 1. Cómo está armado hoy (mapa mental)

**Entidades:** cuentas (empresa) → contactos (personas). Cada contacto tiene un `stage` y una fecha `last_touch_at`.

**Estados del stage:** Not Contacted → First Touch (Email/LinkedIn) → FUP 1 … FUP 10 → (Replied).

**Tres vistas:**
- **Followups** (arriba): contactos en flujo Y vencidos (día 8+). Botón "Done".
- **Pipeline** (tile "My leads"): los NO en flujo. Botón "Start sequence".
- **In sequence** (tile clickeable): los en flujo. FUP + días + "Done".

**Timer:** reloj de 7 días desde el último toque. Día 8+ = vencido. "Done" y "Start sequence" reinician el reloj.

Esta base es sólida. Los problemas de abajo NO son de estructura — son huecos en los bordes que, si no se cierran, van a estorbar cuando lo uses en serio.

---

## 2. Huecos de lógica y casos que se rompen (por prioridad)

### 🔴 CRÍTICO — No hay forma de marcar "Replied" (respondió)
El botón "Done" solo avanza en la secuencia (First Touch → FUP 1 → … → FUP 10). **No existe ninguna acción para marcar que un contacto RESPONDIÓ.** El estado "Replied" está en la base de datos, pero la interfaz nunca puede llegar a él.

Por qué importa: responder es **el objetivo de todo el outreach**. Sin poder marcarlo, (a) no puedes sacar a alguien de la secuencia cuando ya te contestó, y (b) nunca vas a poder medir tu métrica reina (interested reply rate). Este es, con diferencia, el hueco más importante.

### 🔴 CRÍTICO — No hay forma de SALIR de una secuencia (dead / no interesado)
Una vez que le das "Start sequence", no hay "deshacer", "pausar", ni "cerrar/muerto". Si arrancas por error, o el contacto es un callejón sin salida (no respondió pero ya no tiene caso seguir), **se queda en el flujo para siempre**, acumulando "days overdue" y ensuciando la vista.

Por qué importa: sin una salida, tu lista de followups se va a llenar de zombis que no puedes limpiar.

### 🟠 IMPORTANTE — En FUP 10 el contacto queda atorado (ya es Entrega B)
Al llegar a FUP 10, "Done" se deshabilita. Hasta que construyamos el cierre de secuencia (Entrega B), ese contacto se queda vencido para siempre con un botón muerto. Ya está en el plan, pero mientras tanto, es un zombi más.

### 🟠 IMPORTANTE — Tres formas distintas de representar el mismo stage (van a chocar)
Hoy conviven TRES representaciones del progreso:
1. El texto real en Supabase ("FUP 7").
2. Un número 0–4 en la interfaz (que COLAPSA FUP 3 a 10 en un solo "4").
3. La barrita vieja de 4 puntos (E1 · LI · E2 · E3) y el "Next: E3".

El problema: la tarjeta te dice "FUP 7" (texto real) pero la barrita de puntos sigue mostrando el modelo viejo de 4 pasos, y "Next: E3" ya no tiene sentido cuando vas en FUP 7. **Se contradicen entre sí.** Conforme agregues features, esto va a causar bugs sutiles. La barrita E1-E4 hoy es engañosa.

### 🟠 IMPORTANTE — El menú viejo de stage y el botón "Done" pueden coexistir (confirmar en código)
Es probable que en las tarjetas en flujo siga apareciendo el menú desplegable viejo de stage (el "stagesel", con opciones limitadas 0–4) AL MISMO TIEMPO que el botón "Done". Serían dos formas de cambiar el stage que no concuerdan: el menú solo llega a FUP 3, "Done" llega a FUP 10. Si es así, hay que quitar el menú viejo de esas tarjetas y dejar solo "Done".

### 🟡 BORDE — El conteo "In sequence" y el timer pueden desalinearse
El tile "In sequence" cuenta contactos con `stage > 0`. Pero el timer (Followups) necesita ADEMÁS que tengan `last_touch_at`. Si algún contacto llega con stage pero sin fecha (por ejemplo, cuando el engine haga sync a futuro), el tile lo cuenta pero NO aparece en Followups → un "fantasma" que suma al número pero no ves. Importante tenerlo presente para la fase de sync.

### 🟡 BORDE — Cuentas con varios contactos: solo se ve "el peor"
Las tarjetas de followup muestran solo el contacto con más delay de cada cuenta. Los otros contactos en flujo de esa misma cuenta quedan invisibles. Tu estrategia (secuencial: un contacto a la vez, luego la banca) hace que esto casi no pegue HOY — pero nada IMPIDE arrancar dos contactos de la misma cuenta a la vez, y ahí se enredaría. No urge, pero es un supuesto no forzado.

### 🟢 MENOR
- "Signal: null" cuando no hay señal (cosmético).
- Redondeo de días (medianoche/zonas horarias) — el conteo de "días" puede variar por horas en el borde.
- "Fresh signals": confirmar que su número no cambie raro al alternar entre vistas.

---

## 3. Qué falta para que se sienta COMPLETO (features, sin sobre-construir)

### Debe tener (desbloquean lo esencial)
1. **Acción "Replied / Interested"** — botón para marcar que respondió: saca de la secuencia y registra la victoria. Esto habilita la métrica reina. (Cierra el hueco crítico #1.)
2. **Acción "Stop / Dead"** — sacar a un contacto que ya no va (sin respuesta pero cerrado). (Cierra el hueco crítico #2.)

### Ya planeado (Entrega B)
3. **Comentarios por toque** (historial de "qué pasó" en cada FUP).
4. **Cierre de secuencia en FUP 10** + pasar al siguiente contacto de la cuenta.

### Vale la pena (calidad de vida, no urgente)
5. **Elegir CUÁL contacto arrancar** cuando la cuenta tiene varios (hoy hay selector de contacto activo — confirmar que "Start sequence" respete esa elección).
6. **Ver toda la banca de contactos** de una cuenta en la vista in-sequence, no solo el peor.
7. **"Undo" en Done** — si le picas por error, avanzó el FUP y reinició el reloj sin vuelta atrás. Una red de seguridad ayudaría.

### Infraestructura (ya identificado)
8. **Resend** (correo real, para que entre el equipo).
9. **Sync en vivo engine → Supabase** (prioridad máxima post-MVP).

---

## 4. La raíz de casi todo: cómo se representa el stage

Si tuviera que señalar UNA cosa que, arreglada, previene la mitad de los bugs futuros, es esto: **hoy el stage vive en tres idiomas** (texto real, número 0–4 colapsado, y la barra E1-E4). Cada feature nuevo que agregues tiene que "traducir" entre los tres, y ahí es donde se cuelan los errores.

El arreglo limpio (para cuando toque, NO hoy): dejar de usar el número 0–4 y la barra E1-E4, y trabajar directo con el stage real (First Touch / FUP N / Replied) + un índice numérico simple del FUP. Esto conecta con el "refactor de dos campos" (`cadence_step` + `status`) que ya tenías anotado para la métrica reina. Son el mismo problema.

---

## 5. Mi recomendación de orden (qué haría primero)

1. **Acción "Replied" + acción "Stop/Dead"** — cierran los dos huecos críticos, y son relativamente chicos. Sin esto, el sistema no puede reflejar un resultado real (ni una respuesta, ni un cierre).
2. **Limpiar la representación del stage** — quitar la barra E1-E4 engañosa y el menú viejo de stage de las tarjetas en flujo. Deja UNA sola verdad visible: el FUP real. (Previene bugs de aquí en adelante.)
3. **Entrega B** — comentarios por toque + cierre en FUP 10 (ya planeada, es la parte pesada).
4. **Resend** — cuando quieras meter al equipo.
5. **Sync del engine** — la grande, post-MVP.

Lo 1 y 2 son lo que haría que el sistema pase de "buen tracker de followups" a "sistema completo de outreach" — porque hoy modela perfecto el AVANCE, pero no modela el RESULTADO (respondió / murió), que es de lo que se trata.
