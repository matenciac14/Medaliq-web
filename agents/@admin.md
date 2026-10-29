# @admin — Agente de panel admin

Eres el agente del panel de administración de Medaliq. Tu dominio: endpoints `/api/admin/*`, UI admin, acciones destructivas, auditoría.

---

## Contexto obligatorio antes de cualquier tarea

1. **Leer `../specs/admin.spec.md`** — 16 endpoints, patterns de hard delete y auditoría
2. **Leer `../domains/plataforma.md`** — estado del sistema, flags, crons
3. **Leer `../domains/seguridad.md`** — soft delete vs hard delete, flujo de anonimización
4. **Leer `../specs/_traps.spec.md`** — traps transversales (T10, T18, T19, T20)

---

## Auth admin

- Solo `role === 'ADMIN'` — verificar con el guard de rol antes de cualquier acción
- `auth()` desde `@/auth` — mismo sistema que web

---

## Patrón crítico: logAdminAction ANTES de delete

```typescript
// CORRECTO — log primero, delete después
await logAdminAction({ adminId, action: 'DELETE_USER', targetId: userId, details })
await prisma.user.delete({ where: { id: userId } })

// INCORRECTO — si delete falla, no hay log
await prisma.user.delete(...)
await logAdminAction(...)
```

**Este orden es obligatorio para toda acción destructiva.**

---

## Soft delete vs hard delete

| Operación | Tipo | Qué hace |
|-----------|------|----------|
| Suspender usuario | Soft | `status = 'SUSPENDED'` |
| Eliminar usuario | Soft + anonimización | Email anonimizado, HealthProfile deleted, SessionLog anonymized, datos financieros conservados 5 años |
| Hard delete | Solo admin, casos específicos | Requiere `logAdminAction` previo |

---

## Estado del sistema (admin debe saber esto)

- **`UserStatus`**: implementado (ACTIVE|SUSPENDED|BLOCKED|DELETED) pero middleware enforcement NO activo (PLT-01 pendiente)
- **Crons**: TODOS desactivados en `vercel.json` — admin puede forzar manualmente vía endpoint
- **`/coaches` directory**: oculto hasta 20+ coaches activos
- **Billing desactivado en beta**: `BILLING_ENABLED !== 'true'` → todos son PRO

---

## Endpoints admin disponibles

Ver `../specs/admin.spec.md` para lista completa de los 16 endpoints con sus contratos.

Categorías principales:
- Gestión de usuarios (listar, suspender, eliminar, cambiar plan)
- Gestión de coaches (verificar, activar, desactivar)
- Billing manual (forzar renovación, ajustar tier)
- Roadmap (`roadmap_data.ts` — `done: true` al completar features)
- Crons (forzar ejecución manual con `Authorization: Bearer $CRON_SECRET`)

---

## Roadmap — al completar features

Archivo: `src/app/admin/roadmap/roadmap_data.ts`

Al terminar una feature: `done: true` + `note` con fecha y descripción.

---

## NO HACER

- NO hacer delete sin `logAdminAction` previo
- NO activar `/coaches` navigation sin 20+ coaches activos
- NO correr crons sin `Authorization: Bearer $CRON_SECRET`
- NO activar `BILLING_ENABLED` sin completar integración Wompi
- NO usar `prisma db push` — siempre `prisma migrate deploy`
