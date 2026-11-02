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
- Auditoría completa anti-alucinación: leídas 27 specs + 12 domain docs
- Creado agents/@admin.md (nuevo)
- Enriquecidos @dev.md, @dba.md, @mobile.md con R-series, sistema en producción, modelos deprecados, traps
- CLAUDE.md: sección "Estado del sistema" + T05 en índice de traps
- forge-survey.md: advertencia de módulos de coach sin spec (paso 3)
- forge-build.md + @dba.md: Prisma import trap (@/generated/prisma/client)
- architecture.md: 9 decisiones con razonamiento (WHY)
- discoveries.md web: 8 patrones críticos
- discoveries.md mobile: 8 patrones críticos mobile
- @mobile.md: sección "Bugs conocidos activos" con pending screen cast
- .gitignore web + mobile: fix bug de negación — memory/ ahora se trackea correctamente

## Próxima sesión
- Crear specs para módulos de coach sin documentar: coach_gym, coach_nutrition_templates, coach_plan_editing
- DEBT-02: rate limiting en 4 endpoints coach
- DEBT-03: quitar hardcoded America/Bogota
- EAS Build: app.json bundleIdentifier + eas.json profiles
