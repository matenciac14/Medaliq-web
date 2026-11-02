# Medaliq Web — Decisiones de Arquitectura Técnica

> Decisiones técnicas del repo web. Para decisiones de producto ver: MEDALIQ/.claude/memory/architecture.md

## Stack
Next.js 16 · React 19 · TypeScript 5 · PostgreSQL · Prisma 7 · Tailwind v4 · Auth.js v5 · jose (JWT mobile) · Zod 4 · Vitest · pnpm

## Capas
```
domain/<modulo>/    ← lógica pura, SIN Prisma/Next.js
infrastructure/db/  ← repositorios Prisma
app/api/            ← rutas delgadas (~25 líneas)
lib/                ← utilidades compartidas
```

## Decisiones técnicas — QUÉ y POR QUÉ

> Este archivo documenta el razonamiento detrás de cada decisión. Antes de "mejorar" algo, leer la razón.

---

### AUTH_SECRET firma tanto Auth.js como JWT mobile (mismo secret)

**Qué**: `AUTH_SECRET` (fallback `NEXTAUTH_SECRET`) se usa para Auth.js v5 (web) y para firmar los JWTs mobile con `jose`. No hay `MOBILE_JWT_SECRET` separado.

**Por qué**: simplificar la configuración de entornos (1 variable en lugar de 2). El riesgo de un secret compartido es bajo porque ambos sistemas viven en el mismo servidor y el token mobile incluye claims que solo el servidor genera.

**No hacer**: agregar `MOBILE_JWT_SECRET` separado — rompería todos los tokens mobile existentes en producción. Si se quiere separar en el futuro, requiere migración coordinada con forced-logout de todos los usuarios mobile.

---

### $transaction: reads FUERA → writes DENTRO → I/O externo FUERA

**Qué**: en Prisma `$transaction`, las lecturas se hacen antes de abrir la transacción, los writes van dentro, y cualquier I/O externo (emails, push, webhooks) va después.

**Por qué**: las transacciones largas bloquean conexiones en el pool de Neon. Un email que tarda 2s dentro de una transacción puede causar timeout y rollback del write. El patrón evita deadlocks y agota el pool más rápido.

**Caso real**: `processCheckIn` tiene timeout de 30s exactamente por esto — si se agregan llamadas externas dentro, se rompe.

---

### PlanSource.COACH es el único valor válido en datos reales

**Qué**: el enum `PlanSource` en Prisma tiene `COACH`, `SYSTEM` y `TEMPLATE`. Solo `COACH` tiene rows en la DB. Los otros dos nunca se escribieron.

**Por qué**: `SYSTEM` y `TEMPLATE` eran para generación automática de planes. Esa feature se descartó (sistema determinista, coach diseña). El enum no se eliminó porque requiere migración y el código que lo usa está marcado como dead code intencional.

**No hacer**: escribir code paths que asuman que `plan.source === 'SYSTEM'` puede ser verdadero. Nunca lo será con datos reales.

---

### Crons desactivados en vercel.json

**Qué**: 10 cron jobs con código completo y funcional, todos desactivados en `vercel.json`.

**Por qué**: Neon cobra por compute activo. En beta con pocos usuarios, el costo de tener crons corriendo cada hora supera el valor que generan. El código está listo para activarse cuando haya usuarios reales.

**Cómo activar**: la spec `cron.spec.md` tiene la sección "Para reactivar" con el bloque exacto a copiar en `vercel.json`.

**No hacer**: reactivar crons para "completar el sistema" sin revisar el costo real en Neon.

---

### prisma db push prohibido en producción

**Qué**: `prisma db push` está prohibido en producción. Solo `prisma migrate deploy`.

**Por qué**: los partial indexes viven en archivos SQL de migración, no en `schema.prisma`. `prisma db push` regenera el schema ignorando esos archivos — destruye los partial indexes silenciosamente. En desarrollo local, sin datos, es indetectable. En producción, rompe queries que dependen de esos índices.

**Requiere**: `DIRECT_URL` para migraciones (el pooler de Neon no soporta DDL).

---

### Tres modelos de nutrición coexisten

**Qué**: `NutritionPlan` (macros del atleta), `MealPlan` (distribución JSON, legacy), `AssignedNutritionPlan` (plantilla del coach). Los tres están activos en el schema.

**Por qué**: el sistema de nutrición evolucionó en tres fases. Eliminar los modelos legacy requiere migración de datos + auditoría de todos los endpoints. Se mantienen por compatibilidad hasta tener tiempo de hacer la consolidación limpiamente.

**No hacer**: crear código nuevo que use `MealPlan` directamente. Nuevo código usa `NutritionPlan` o `AssignedNutritionPlan`.

---

### UserStatus existe pero el middleware no lo enforcea

**Qué**: `User.status` tiene valores `ACTIVE | SUSPENDED | BLOCKED | DELETED`, pero `src/middleware.ts` no los usa para bloquear acceso.

**Por qué**: la implementación del enforcement (PLT-01) quedó pendiente. El campo se creó anticipando la feature pero el middleware no fue actualizado.

**No hacer**: asumir que un usuario con `status: SUSPENDED` no puede acceder a endpoints. Actualmente puede. Tampoco "corregir" el middleware sin leer PLT-01 primero.

---

### BILLING_ENABLED controla el modo beta

**Qué**: cuando `process.env.BILLING_ENABLED !== 'true'`, `getUserPlan()` retorna `'PRO'` para todos los usuarios, ignorando su tier real.

**Por qué**: en beta, antes de activar Wompi, todos los coaches y atletas tienen acceso completo. Esto evita bloquear usuarios mientras el sistema de pagos no está listo.

**No hacer**: confundir este flag con un bug. Si ves que `getUserPlan()` siempre retorna `'PRO'`, es intencional en el entorno actual.

---

### Import de Prisma: @/generated/prisma/client

**Qué**: el import correcto es `import { prisma } from '@/generated/prisma/client'`, no `@/generated/prisma`.

**Por qué**: el cliente generado por Prisma 7 vive en el subdirectorio `/client`. Next.js resuelve el path sin error en desarrollo pero falla silenciosamente en el build de producción si falta `/client`.

---

### Nomenclatura: módulo se llama "gym" en código, "Entrenamiento" en UI

**Qué**: el módulo de entrenamiento se llama `gym`, `GymSession`, `featureGym` en todo el código, pero se muestra como "Entrenamiento" en el UI.

**Por qué**: decisión de producto para LatAm. "Gym" es el término técnico interno; "Entrenamiento" es más amplio para el usuario.

**No hacer**: renombrar variables/modelos de `gym` a `entrenamiento` o `training`. El nombre interno es estable y hay decenas de referencias.
