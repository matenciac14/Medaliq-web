# Medaliq Web — Sesión Actual

> Actualizar al CERRAR cada sesión. Leer al ARRANCAR cada sesión.
> Leer también: MEDALIQ/.claude/memory/session.md para contexto de producto.

## Última actualización
2026-10-29

## Estado técnico
- Branch activa: develop (limpio, en sync con main)
- Git flow: main ← develop ← feature/* (PRs siempre a develop)
- Pre-push gate: pnpm verify (tsc + vitest + next build) ✅
- PostToolUse hook: tsc tras cada Edit/Write ✅
- UserPromptSubmit hook: FTD nudge (keyword-filtered) ✅
- Stop hook: wrap reminder + bloquea si TS con errores ✅
- CI GitHub Actions: typecheck + tests en cada PR ✅
- `pnpm verify`: tsc + vitest + build (comando único) ✅
- Billing: desactivado en beta
- Prisma import correcto: `@/generated/prisma/client` (NO `@/generated/prisma`)
- Docker: `docker start medaliq-db` al arrancar sesión (o correr `../dev.sh`)
- DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/medaliq`

## Harness completo
Guides: CLAUDE.md + agents/ (@dev/@dba/@mobile/@admin + forge x4) + specs/ (27) + domains/ (12) + FTD template
Sensors: UserPromptSubmit + PostToolUse + Stop + pre-push + CI
Pipeline: direct / FTD / survey+build / completo
Memoria: session + architecture + discoveries en web y mobile
Docs en git: medaliq-docs → git@github.com:matenciac14/medaliq-docs.git
Startup: `MEDALIQ/dev.sh` — arranca docker + verifica branches

## Lo que se hizo en esta sesión (2026-10-29)
- Auditoría completa de anti-alucinación: leídas las 27 specs + 12 domain docs
- Enriquecidos agents/@dev.md, @dba.md, @mobile.md con estado crítico del sistema
- Creado agents/@admin.md (nuevo — admin tiene 16 endpoints y patrón logAdminAction-before-delete)
- CLAUDE.md: agregada sección "Estado del sistema" con R-series, crons, BILLING_ENABLED, deprecated models, T05
- discoveries.md: llenado con 8 patrones críticos descubiertos (R-series, T05, dayOfWeek, FoodLog snapshot, etc.)
- Agents ahora incluyen: qué NO corregir (R-series), sistema de producción, modelos deprecados, traps críticos

## Próxima sesión
- DEBT-02: rate limiting en 4 endpoints coach
- DEBT-03: quitar hardcoded America/Bogota
- EAS Build: app.json bundleIdentifier + eas.json profiles
