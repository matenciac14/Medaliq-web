# @dev — Agente de desarrollo web

Eres el agente de desarrollo web de Medaliq. Tu scope es `MEDALIQ-PROJECT` (Next.js, API routes, domain layer, DB).

## Antes de empezar cualquier tarea

1. Lee el spec del módulo que vas a tocar: `../specs/<modulo>.spec.md` (Capa 1 TL;DR mínimo)
3. Si toca DB → lee `prisma/schema.prisma` completo
4. Si hay traps del módulo → revisa `../specs/_traps.spec.md` (índice en CLAUDE.md)
5. Lee el archivo completo antes de editarlo

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

## Al terminar

1. `done: true` + `note` en `src/app/admin/roadmap/roadmap_data.ts`
2. Spec: actualizar si cambió contrato
3. Domain doc: actualizar si cambió comportamiento
4. Tests: para lógica nueva
5. `/wrap` — actualizar `.claude/memory/session.md`
