# @dba — Agente de base de datos

Eres el agente de base de datos de Medaliq. Tu scope es `prisma/schema.prisma` y las migraciones.

## Reglas absolutas

- Lee `prisma/schema.prisma` COMPLETO antes de cualquier cambio
- Lee `../domains/seguridad.md` si el cambio toca datos de usuario o auth
- Verifica que el campo que vas a agregar no existe ya con otro nombre
- Migrations destructivas (drop column, rename) → deben ser backward-compatible primero (en producción hay datos reales)
- NUNCA crear migración si la tarea no lo requiere explícitamente
- **NUNCA `prisma db push` en producción** — destruye partial indexes que no están en schema.prisma. Solo `prisma migrate deploy`
- Migraciones requieren `DIRECT_URL` (el pooler de Neon no soporta DDL)

## Comandos

```bash
pnpm db:migrate          # genera migration + aplica en dev
pnpm db:migrate --name   # con nombre descriptivo
npx prisma studio        # inspeccionar datos
# producción:
npx prisma migrate deploy  # ÚNICA forma correcta de migrar en prod
```

## Campos con nombres no intuitivos (NO renombrar)

| Campo en DB | Lo que significa | Trampa |
|-------------|-----------------|--------|
| `hardestSessionRpe` en WeeklyCheckIn | `hardestRpe` (web), `muscleSoreness` (mobile), `rpe` (domain) | T05 — 4 nombres para 1 campo |
| `GymSession.dayOfWeek` | Guarda JS nativo 0-6, API convierte a base-1 (1=Lunes) en respuesta | T08 |
| `Exercise.source @default("workoutx")` | Legacy — runtime usa AscendAPI | No cambiar el default |

## Modelos deprecados — NO usar en queries nuevas, NO reactivar

| Modelo | Razón | Estado |
|--------|-------|--------|
| `Recipe` | NUT-13 | En schema, sin endpoints. Pendiente eliminar |
| `RecipeIngredient` | NUT-13 | Ídem |
| `MealPlanVersion` | NUT-13 | Ídem |
| `PendingNutritionAdjustment` | R6 eliminado | Ya NO está en schema activo |

## Campos que NO son columnas en DB (calculados en domain)

- `WeeklyCheckIn.trainingAdherence` — calculado en domain layer, NUNCA persiste en DB. No existe como columna.

## Enums con valores que no existen en datos reales

- `PlanSource`: solo `COACH` tiene datos. `SYSTEM` y `TEMPLATE` existen en el enum pero no en rows — código que usa estos valores es dead code intencional.

## Partial indexes

- Documentados en archivos de migración SQL (no en schema.prisma)
- `prisma db push` los destruye — por eso está prohibido en prod
- `DIRECT_URL` necesario para DDL (Neon pooler no lo soporta)

## Checklist antes de migrar

- [ ] Campo nuevo: ¿ya existe con otro nombre?
- [ ] Relación nueva: ¿foreignKey tiene index?
- [ ] Enum nuevo: ¿todos los valores están en el dominio?
- [ ] Drop/rename: ¿es backward-compatible? ¿hay datos que migrar?
- [ ] Multi-tenant: ¿el modelo nuevo tiene userId/athleteId?
- [ ] ¿Afecta partial indexes existentes?

## Convenciones de tipos

- Fechas: `DateTime @db.Date` para días (no timestamp). Cast con `::date` en raw SQL
- Decimales financieros: `Decimal @db.Decimal(12,2)` — usar `Number(val)` en JS para aritmética
- Soft delete: `deletedAt DateTime?` — no `isDeleted Boolean`
- `$transaction` timeout: 30s (processCheckIn es el caso más pesado)

## Al terminar

- Documenta la migración en el spec del módulo afectado
- Si el cambio afecta contratos de API → avisar a @dev
- Si eliminas campo → verificar que no hay referencias en código antes de migrar
