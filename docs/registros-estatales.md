# Registros estatales (SR) y alineación con la WCA

Este documento explica cómo Cubing México determina los **registros estatales (SR)**, cómo se relaciona eso con el reglamento WCA (en particular **9i2**), y qué nos falta para igualar el comportamiento completo de los registros regionales de la WCA.

Código relevante:

- Web: [`apps/web/lib/update-state-records.ts`](../apps/web/lib/update-state-records.ts)
- Backend (recompute global / cron): [`apps/backend/routes/admin_updates.py`](../apps/backend/routes/admin_updates.py) (`update_state_records`)

---

## Jerarquía de marcas (como en la WCA)

En la WCA, cada resultado guarda **una sola** marca regional en `regional_single_record` / `regional_average_record`. Si un tiempo es récord mundial, se etiqueta solo como `WR`; no se guarda también como `NAR` ni `NR`.

La lógica en el código WCA (`CheckRegionalRecords.compute_record_marker`) sube la etiqueta:

1. Si iguala o mejora el nacional → `NR`
2. Si además iguala o mejora el continental → p. ej. `NAR`
3. Si además iguala o mejora el mundial → `WR`

Cubing México añade un nivel inferior:

**WR > NAR > NR > SR**

Si el resultado ya trae `NR`, `NAR` o `WR` desde la WCA, **no** escribimos `SR` en `state_single_record` / `state_average_record`. El tiempo sí actualiza el “mejor hasta ahora” del estado, para que un resultado peor posterior no se marque como SR por error.

---

## Reglamento WCA 9i2

Texto relevante (reglamento oficial):

> Todos los resultados de una ronda se consideran ocurridos en la **última fecha calendario de esa ronda**, según la hora local del lugar de la competencia. Si un registro regional se logra **varias veces el mismo día calendario**, **solo el mejor** se reconoce como el que rompe ese registro.

Implicaciones:

- No es una ventana de “24 horas”, sino el **mismo día calendario**.
- La fecha de un resultado no es necesariamente el día en que se resolvió en el escenario, sino el **último día programado de esa ronda**.
- En una competencia de varios días, la primera ronda del sábado y la final del domingo pueden generar registros distintos (días distintos). Dos mejoras el mismo sábado solo cuentan la mejor.

Fuente: [Reglamento WCA — 9i](https://www.worldcubeassociation.org/regulations/#9i).  
Implementación de referencia en la WCA: [`lib/check_regional_records.rb`](https://github.com/thewca/worldcubeassociation.org/blob/main/lib/check_regional_records.rb).

---

## Cómo funciona hoy el SR en Cubing México

1. Se toman las personas con `persons.state_id` = estado actual.
2. Se limpian sus marcas `state_*_record`.
3. Por cada evento (salvo eventos excluidos), se cargan singles y averages válidos, ordenados por:
   - `competitions.start_date`
   - `competitions.id`
   - rango del tipo de ronda
   - tiempo (mejor primero)
   - `results.id`
4. Se recorre en orden cronológico con un “mejor hasta ahora” (`bestSoFar`).
5. Los resultados se agrupan por **día = `competitions.start_date`** (solo fecha).
6. En cada día, entre los que igualan o mejoran `bestSoFar`, solo se etiquetan como `SR` los que empatan el **mejor valor de ese día**, y solo si no tienen ya `NR`/`NAR`/`WR`.
7. `bestSoFar` pasa a ese mejor del día (aunque todos hayan sido degradados por marca regional).

Propiedades importantes:

- La atribución es **retroactiva al estado actual** del competidor (no al estado histórico en la fecha de la competencia).
- Los empates en el mejor tiempo del día (mismo valor) pueden recibir todos `SR`, salvo los que ya son regionales.

---

## Qué ya alineamos con la WCA

| Comportamiento | WCA | Cubing México (SR) |
| --- | --- | --- |
| Solo la marca más alta | WR / NAR / NR en una columna | No poner SR si ya hay NR/NAR/WR |
| Empate con el récord vigente (`<=`) | Sí | Sí |
| Mismo día calendario → solo el mejor | 9i2 | Sí (con la clave de fecha que tenemos) |
| Mejor histórico corriendo en el tiempo | Sí | Sí |

---

## Qué nos falta para el comportamiento completo WCA

### 1. Fecha real de cada ronda (lo principal)

La WCA fecha cada ronda a su **último día calendario**. Nosotros usamos **`competitions.start_date`**.

Consecuencia en una competencia viernes–domingo:

- WCA: primera ronda sábado y final domingo → dos días distintos → pueden haber dos SR.
- Nosotros: todo el fin de semana cae bajo el `start_date` (p. ej. viernes) → solo sobrevive el mejor de ese bucket.

Para igualar 9i2 hace falta saber **cuándo terminó cada ronda** (hora local). Eso sale del **horario / WCIF** de la competencia (actividades con `startTime`/`endTime` y zona horaria), no solo de `start_date`/`end_date` de la competencia. Hoy no persistimos ese dato a nivel ronda en nuestra base.

### 2. Competencias con fechas solapadas

La WCA, en `CheckRegionalRecords.confirm_records`, no “confirma” el récord de una competencia hasta que la siguiente empieza **después** del `end_date` de la anterior (`next_start > prev_end`). Así evita inconsistencias cuando dos competencias se solapan el mismo fin de semana.

Nosotros solo colapsamos por `start_date` compartido; no implementamos esa cola de competencias pendientes con rangos `start`–`end`.

### 3. Datos de horario

Sin horarios (o al menos una fecha de fin por ronda), cualquier aproximación será incompleta:

- `start_date` de la competencia (actual)
- `end_date` de la competencia
- solapamiento estilo WCA a nivel competencia

Ninguna de esas tres opciones reproduce “último día de la ronda” en competencias de varios días.

---

## Resumen

El SR de Cubing México sigue la **jerarquía de marcas** de la WCA y la idea de **9i2** (mismo día → solo el mejor), usando como día el inicio de la competencia. Para igualar del todo el criterio WCA haría falta **fechas por ronda** derivadas del schedule/WCIF, y opcionalmente la lógica de **competencias solapadas** del checker oficial.
