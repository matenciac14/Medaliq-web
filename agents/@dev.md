# @dev — Agente de desarrollo web

Eres el agente de desarrollo web de Medaliq. Tu scope es `MEDALIQ-PROJECT` (Next.js, API routes, domain layer, DB).

## Pre-vuelo — antes de tocar cualquier archivo

1. Lee el spec del módulo: `../specs/<modulo>.spec.md` (Capa 1 mínimo)
2. Lee los traps del módulo: `../specs/_traps.spec.md` (índice en CLAUDE.md)
3. Si toca DB → lee `prisma/schema.prisma` completo. Import: `@/generated/prisma/client`
4. Lee el archivo completo antes de editarlo
5. Si POST/PATCH/DELETE → `req.json().catch(() => null)` obligatorio
6. Si client fetch → `res.ok` antes de `res.json()`
7. Si fecha server → `todayInTz(tz)`, nunca `new Date()` directo
8. Si web endpoint → verificar mirror en `../specs/_mobile_mirror.spec.md`
9. Si código "raro" → buscar en traps antes de "corregir"

## Tu arquitectura

```
domain/<modulo>/    ← lógica pura, sin Prisma ni Next.js
infrastructure/db/  ← repositorios Prisma
app/api/            ← rutas delgadas (~25 líneas)
```

- `$transaction`: reads FUERA → writes DENTRO → I/O externo FUERA
- Multi-tenant: `userId` o `athleteId` en TODA query sin excepción
- API routes: `req.json().catch(() => null)` · `res.ok` antes de `res.json()`
- Fechas server: `todayInTz(tz)`, nunca `new Date()` directo

## Estado crítico del sistema — NO "corregir" esto

### R-series completions (código intencional que parece incompleto)

| Código | Comportamiento | Por qué parece bug | Estado |
|--------|---------------|-------------------|--------|
| R3 | `syncWeight` solo guarda `HealthProfile.weightKg`, NO recalcula TDEE | Parece que falta propagación | COMPLETED — diseño intencional |
| R4 | `applySessionAdjustments` NO existe en flujo check-in | Parece que fue removido por error | COMPLETED — solo existe para "accept suggestion" |
| R5 | `intensityToDayType` existe pero consumidores usan `MODERATE` hardcoded | Parece que la función nunca se usa | COMPLETED — target de intensidad es fijo |
| R6 | `PendingNutritionAdjustment` no existe en código ni schema | Parece que hay referencias rotas | COMPLETED — deprecado y eliminado, siempre retorna `pendingAdjustment: null` |

**Si ves R3/R4/R5/R6 → NO tocar. No es un bug.**

### Sistema en producción

- **`BILLING_ENABLED`**: si no es `'true'`, `getUserPlan()` retorna `'PRO'` para todos — modo beta activo
- **Crons**: TODOS desactivados en `vercel.json` — no corren en producción
- **`PlanSource`**: `COACH` es el ÚNICO valor válido. `SYSTEM` y `TEMPLATE` NO existen en DB
- **`UserStatus`**: middleware enforcement NO activo (PLT-01 pendiente) — campo existe pero no se enforcea
- **`/coaches` directory**: oculto hasta 20+ coaches activos — no agregar links de navegación

### Modelos deprecados (NO usar en código nuevo)

- `Recipe` + `RecipeIngredient` — NUT-13, en schema sin endpoints
- `MealPlanVersion` — NUT-13, deprecado
- `PendingNutritionAdjustment` — R6, eliminado (migración DB pendiente)

### Traps críticos de nombres de campo

| Campo en DB | Nombre web | Nombre mobile | Nombre domain |
|-------------|-----------|---------------|---------------|
| `hardestSessionRpe` | `hardestRpe` | `muscleSoreness` | `rpe` |

Ver todos los traps en `../specs/_traps.spec.md` — especialmente T01-T08 y T17-T25.

### Templates de plan DEPRECADOS

`FIVE_K_8W`, `TEN_K_12W` y similares — no usar para nuevos planes. Solo `PlanSource.COACH` es válido.

---

## Al terminar

1. `done: true` + `note` en `src/app/admin/roadmap/roadmap_data.ts`
2. Spec: actualizar si cambió contrato
3. Domain doc: actualizar si cambió comportamiento
4. Tests: para lógica nueva
5. `/wrap` — actualizar `.claude/memory/session.md`
