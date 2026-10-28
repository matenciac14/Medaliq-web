# Medaliq Web — Sesión Actual

> Actualizar al CERRAR cada sesión. Leer al ARRANCAR cada sesión.
> Leer también: MEDALIQ/.claude/memory/session.md para contexto de producto.

## Última actualización
2026-10-28

## Estado técnico
- Branch activa: develop (en sync con main — punto de partida limpio)
- Git flow: main ← develop ← feature/* (PRs siempre a develop)
- Pre-push gate: npx next build ✅ activo
- Billing: desactivado en beta
- Prisma import correcto: `@/generated/prisma/client` (NO `@/generated/prisma`)
- Docker local: container `medaliq-db` (postgres:16-alpine, puerto 5432)
- DATABASE_URL local: `postgresql://postgres:postgres@localhost:5432/medaliq`

## Lo que se hizo en esta sesión
- AI Factory setup: agents/ (forge pipeline + @dev/@dba/@mobile), CLAUDE-SCHEMA.md, memoria
- Worktree workflow eliminado — flujo simplificado: develop → feature/* → PR → develop
- Referral coach feature (mergeada a main via PR #106):
  - CoachReferral model + migración aplicada en DB local
  - domain/referral/referral.use_case.ts (generate, getSummary, redeem con $transaction)
  - GET+POST /api/coach/referral (rate limited, COACH only)
  - register/route.ts: optional referralCode best-effort redemption
  - ReferralSection UI en /coach/profile
  - Build limpio, roadmap done: true
- Git flow main←develop←feature documentado y aplicado en web y mobile
- develop sincronizado con main en ambos repos (sin conflictos)

## Próxima sesión
- DEBT-02: rate limiting en 4 endpoints coach (POST /coach/clients/create, GET /admin/search, GET|POST /coach/posts, GET|POST /coach/gym/exercises)
- DEBT-03: quitar hardcoded America/Bogota en planned-summary y cron/checkin-reminder
- EAS Build setup: app.json bundleIdentifier/package + eas.json profiles (App Store + Google Play)
