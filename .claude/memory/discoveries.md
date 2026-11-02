# Medaliq Web — Descubrimientos y Traps Técnicos

> Patrones no obvios descubiertos en sesiones. Complementa _traps.spec.md (25 traps formales).
> Antes de "corregir" código que parece raro: buscar aquí y en specs/_traps.spec.md

## Traps por módulo (índice rápido)
- auth:      T06, T07, T21, T22
- nutrition: T03, T04, T11, T13, T14
- gym:       T08, T12, T15
- plan:      T02, T09, T16, T24, T25
- dashboard: T01, T17
- routes:    T10, T18, T19, T20 (transversal)
- dates:     T01, T17, T23 (transversal)

## Patrones descubiertos en sesiones

### R-series completions — código intencional que parece bug (2026-10-29)

Revisión completa de las 27 specs y 12 domain docs reveló 4 "completions" que el sistema marca explícitamente como intencionalmente incompletos:

- **R3**: `syncWeight` solo guarda `HealthProfile.weightKg`. NO recalcula TDEE ni propaga. El agente que vea esto tenderá a "completar" la función — no hacerlo.
- **R4**: `applySessionAdjustments` fue removido del flujo de check-in. Existe solo para el endpoint de "accept suggestion". No está "faltando" en el flujo principal.
- **R5**: `intensityToDayType(intensity)` existe en utils pero ningún consumidor la usa — todos hardcodean `MODERATE`. Diseño intencional: el target de nutrición es fijo independiente de la sesión.
- **R6**: `PendingNutritionAdjustment` eliminado de código y schema. Cualquier endpoint que antes lo usaba ahora retorna `pendingAdjustment: null` hardcoded.

### Sistema en producción — estado no obvio (2026-10-29)

- **Crons**: Los 10 crons listados en `domains/flujos-por-actor.md` están TODOS desactivados en `vercel.json`. Un agente que vea el código de crons podría asumir que corren — no es así.
- **`PlanSource.COACH`**: el enum tiene `SYSTEM` y `TEMPLATE` en el tipo TypeScript pero CERO rows con esos valores en DB. Todo el código que hace `plan.source === 'SYSTEM'` es dead code intencional.
- **`BILLING_ENABLED`**: la lógica de billing existe completa pero está en modo bypass. `getUserPlan()` retorna `'PRO'` para todos cuando el flag no está activo.
- **`UserStatus` enforcement**: el campo existe y tiene valores, pero el middleware que lo usa para redirigir/bloquear está desactivado (PLT-01 pendiente).

### 4 nombres para 1 campo (T05) — el trap más peligroso (2026-10-29)

El campo que guarda el RPE máximo de la semana tiene 4 nombres según la capa:
- **DB**: `hardestSessionRpe` (en `WeeklyCheckIn`)
- **Domain**: `rpe`
- **Web API / UI**: `hardestRpe`
- **Mobile API / UI**: `muscleSoreness`

Un agente que recibe `muscleSoreness` desde mobile y busca ese nombre en el schema no lo encontrará. Debe mapear a `hardestSessionRpe`.

### `dayOfWeek` — convención inconsistente (T08) (2026-10-29)

En TODO el sistema `dayOfWeek` es base-1 (1=Lunes, 7=Domingo). **Excepción**: `GymSession.dayOfWeek` guarda JS nativo (0-6) y la API convierte a base-1 en la respuesta. No "corregir" esta inconsistencia — es intencional para mantener compat con el código legacy.

### Tres modelos de nutrición coexisten (2026-10-29)

`NutritionPlan` (macros del atleta), `MealPlan` (JSON de distribución, legacy), `AssignedNutritionPlan` (plantilla del coach). Un agente puede confundirlos. El contrato de cada endpoint especifica cuál usa.

### `ARCH-07` — segunda sesión por día invisible (2026-10-29)

La DB soporta múltiples sesiones por día pero `CalendarDay` tiene solo 3 slots fijos. Una segunda sesión en el mismo día no se muestra en el UI. Esto NO es un bug — es un ARCH pending documentado. No "corregir" el display sin que la tarea lo pida.

### FoodLog — snapshot inmutable (2026-10-29)

Los macros en `FoodLog` son snapshots guardados en el momento del log. Si `kcalLogged = null` (datos legacy), recalcular desde `food.kcalPer100g * grams / 100`. NUNCA actualizar un snapshot existente con datos actuales del alimento.

### `prisma db push` prohibido en producción (2026-10-29)

Elimina los partial indexes que viven en archivos SQL de migración pero no en schema.prisma. Siempre `prisma migrate deploy`. Requiere `DIRECT_URL` (el pooler de Neon no soporta DDL).
