# Registros estatales (SR) y alineación con la WCA

Este documento explica cómo Cubing México determina los **registros estatales (SR)**, cómo se relaciona eso con el reglamento WCA (en particular **9i2**), y qué nos falta para igualar el comportamiento completo de los registros regionales de la WCA.

Código relevante:

- Web: [`apps/web/lib/update-state-records.ts`](../apps/web/lib/update-state-records.ts)
- Backend (recompute global / cron): [`apps/backend/routes/admin_updates.py`](../apps/backend/routes/admin_updates.py) (`update_state_records`)
- Fechas de ronda (WCIF / manual): tabla `competition_round_dates`; extractor [`apps/web/lib/competition-round-dates.ts`](../apps/web/lib/competition-round-dates.ts)
- Historial (lectura): [`apps/web/app/(root)/records/_lib/queries.ts`](<../apps/web/app/(root)/records/_lib/queries.ts>) (`getRecordHistory`)

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

En la **vista de historial** de registros estatales, sí se incluyen esos `NR`/`NAR`/`WR` de miembros del estado (igual que la WCA incluye WR/CR en el historial nacional: cualquier marca regional cuenta). Las marcas almacenadas en `state_*` siguen siendo exclusivas.

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
   - fecha efectiva 9i2: `COALESCE(competition_round_dates.end_date, competitions.start_date)`
   - `competitions.id`
   - rango del tipo de ronda
   - tiempo (mejor primero)
   - `results.id`
4. Se recorre en orden cronológico con un “mejor hasta ahora” (`bestSoFar`).
5. Los resultados se agrupan por **día = esa fecha efectiva** (solo fecha).
6. En cada día, entre los que igualan o mejoran `bestSoFar`, solo se etiquetan como `SR` los que empatan el **mejor valor de ese día**, y solo si no tienen ya `NR`/`NAR`/`WR`.
7. `bestSoFar` pasa a ese mejor del día (aunque todos hayan sido degradados por marca regional).

Propiedades importantes:

- La atribución es **retroactiva al estado actual** del competidor (no al estado histórico en la fecha de la competencia).
- Los empates en el mejor tiempo del día (mismo valor) pueden recibir todos `SR`, salvo los que ya son regionales.

### Fechas de ronda (`competition_round_dates`)

Para igualar 9i2 se persiste, por competencia / evento / `round_type_id`, la **fecha calendario local de fin de esa ronda**:

- **Automático (cron / admin):** solo si la competencia MX **ya tiene resultados** y aún no tiene filas de horario. Se lee el WCIF público, se extraen actividades de ronda (`startTime`/`endTime` + timezone del venue) y se mapea a `round_type_id`. Una vez importado, el cron **no vuelve a sobrescribir** esa competencia (el horario post-resultados se considera estable). Tampoco pisa filas con `source = 'manual'`.
- **Manual (admin):** para competencias sin WCIF disponible; se capturan fechas por las rondas presentes en `results`.
- **Fallback:** si no hay fila para esa ronda, se usa `competitions.start_date` (comportamiento anterior).

---

## Qué ya alineamos con la WCA

| Comportamiento                         | WCA                          | Cubing México (SR)                                            |
| -------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| Solo la marca más alta                 | WR / NAR / NR en una columna | No poner SR si ya hay NR/NAR/WR                               |
| Empate con el récord vigente (`<=`)    | Sí                           | Sí                                                            |
| Mismo día calendario → solo el mejor   | 9i2                          | Sí                                                            |
| Día = último día local de la ronda     | 9i2                          | Sí, cuando hay `competition_round_dates`; si no, `start_date` |
| Mejor histórico corriendo en el tiempo | Sí                           | Sí                                                            |

---

## Qué nos falta para el comportamiento completo WCA

### 1. Cobertura de horarios

Sin fila en `competition_round_dates` (comps viejas sin WCIF, o pendientes de importar/capturar), el día sigue siendo `start_date`. El panel de admin (filtro “Sin horario”) y el job `/update-competition-schedules` sirven para ir cerrando ese hueco.

### 2. Competencias con fechas solapadas

La WCA, en `CheckRegionalRecords.confirm_records`, no “confirma” el récord de una competencia hasta que la siguiente empieza **después** del `end_date` de la anterior (`next_start > prev_end`). Así evita inconsistencias cuando dos competencias se solapan el mismo fin de semana.

Nosotros colapsamos por la fecha efectiva 9i2 compartida; no implementamos esa cola de competencias pendientes con rangos `start`–`end`.

---

## Resumen

El SR de Cubing México sigue la **jerarquía de marcas** de la WCA y **9i2** (mismo día → solo el mejor), usando como día el **fin local de la ronda** cuando está en `competition_round_dates`, o `start_date` como respaldo. Queda pendiente la lógica de **competencias solapadas** del checker oficial y completar horarios faltantes (sobre todo comps sin WCIF).
