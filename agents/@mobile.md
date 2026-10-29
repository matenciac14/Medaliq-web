# @mobile — Agente de desarrollo mobile

Eres el agente mobile de Medaliq. Tu scope es `MEDALIQ-MOBILE` (React Native + Expo Router).

## Antes de empezar

1. Lee `../MEDALIQ-MOBILE/CLAUDE.md` — stack, auth, UI rules, NO HACER
2. Si la feature toca un endpoint existente → lee `../specs/_mobile_mirror.spec.md` para el par web/mobile
3. Si toca auth → NO modificar `store/auth.ts` ni `api/client.ts` sin leer `../domains/seguridad.md`

## Inventario de pantallas (2026-10-28)

**Tabs** (`app/(app)/(tabs)/`):
dashboard · plan · gym · nutrition · progress · profile · checkin

**Fuera de tabs** (`app/(app)/`):
gym-session · gym-history · gym-builder · log · log-run · log-history ·
messages · coach-chat · coach-inbox · notifications · find-coach · exercises ·
edit-session · edit-health-profile · grocery-list · nutrition-builder ·
nutrition-constructor · nutrition-day-builder · nutrition-week-planner ·
routine-edit · pricing · upgrade · integrations

**Auth** (`app/(auth)/`):
login · register · onboarding · select-role · forgot-password

**API modules** (`src/api/`):
auth · gym · gym-history · nutrition · plan · checkin · coach · dashboard ·
exercises · messages · notifications · profile · progress · client (base)

**Stores** (`src/store/`):
auth.ts · gymSession.ts · gymSessionDraft.ts

## Reglas de UI (obligatorio en cada pantalla)

- `useSafeAreaInsets()` en todos los screens
- Touch targets >= 44px (`paddingVertical: 14`)
- `Haptics.impactAsync(Heavy)` en CTAs, `selectionAsync()` en toggles
- Componentes nativos del OS: DateTimePicker, ActionSheet, alerts — nunca simular con TextInput
- `inputMode="decimal"` / `"numeric"` para teclados numéricos

## Auth mobile

- JWT en SecureStore (nunca AsyncStorage)
- Header: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`
- `X-Client: medaliq-mobile` es OBLIGATORIO — sin él `getMobileUser(req)` retorna null y el endpoint da 401
- GETs incluyen `X-Timezone`
- 401 → clear store → redirect login
- **`AUTH_SECRET`** firma TANTO Auth.js COMO el JWT mobile — mismo secret, no hay `MOBILE_JWT_SECRET` separado
- Expiración JWT: 30 días
- Cuando coach activa atleta → evento `features_updated` → cliente llama `POST /api/mobile/auth/refresh` → JWT actualizado. Sin esto el cliente queda con `onboardingCompleted: false` en token

## Traps críticos mobile

| Trampa | Descripción |
|--------|-------------|
| **T05** | `muscleSoreness` (mobile) = `hardestRpe` (web) = `rpe` (domain) = `hardestSessionRpe` (DB) — 4 nombres para 1 campo |
| Onboarding token | `POST /api/mobile/onboarding` DEBE devolver `{ ..., token: string }` con JWT renovado |
| `nutritionAdherencePct` | Mobile envía 0-100, mapper divide `/10` para escala 1-10 del domain |
| `sessionId` mobile | = `plannedSessionId` en web/domain |
| `actualDurationMin` | = `durationMin` en web/domain |
| Dashboard auto-complete | `GET /api/mobile/dashboard` ejecuta auto-complete del plan internamente (no hay endpoint dedicado) |
| GymSession DOW | Se deriva de `new Date(gs.date).getUTCDay()`, NO del campo `gs.dayOfWeek` |
| RACE goals | `RACE_HALF_MARATHON` y `RACE_MARATHON` en mobile → mapean a `GENERAL_FITNESS` |
| Intensidad | Mobile recibe `intensityMap` directamente en body; web lo calcula desde DB |

## R-series completions — NO "corregir"

| Código | Qué | Estado |
|--------|-----|--------|
| R3 | `syncWeight` solo guarda peso, NO recalcula TDEE | COMPLETED intencional |
| R4 | `applySessionAdjustments` no está en check-in | COMPLETED intencional |
| R5 | Intensidad siempre `MODERATE` aunque existe `intensityToDayType` | COMPLETED intencional |
| R6 | `PendingNutritionAdjustment` eliminado — siempre retorna `pendingAdjustment: null` | COMPLETED intencional |

## Endpoints mobile-only (no tienen par web REST)

- `GET /api/mobile/dashboard` — incluye auto-complete del plan
- `GET /api/mobile/plan` — plan completo del atleta
- `GET /api/mobile/progress` — métricas de progreso
- `GET /api/mobile/gym/week` / `history` / `prs` / `templates`
- `GET /api/mobile/log/history`
- `GET /api/mobile/coach/athletes`
- `POST /api/mobile/push-token`
- `GET /api/mobile/nutrition/today` — NUT-14: endpoint unificado (1 secuencial + 14 paralelas = 15 queries)

## Sistema en producción

- **`BILLING_ENABLED`**: si no es `'true'`, todos los atletas son PRO — modo beta
- **Google Health Connect (Android)**: NO implementado — gap crítico para LatAm
- **Coach mobile**: NO implementado — solo web por ahora
- **Strava**: backend completo, necesita env vars para activar

## NO HACER

- NO agregar dependencias sin preguntar
- NO modificar `_layout.tsx` sin entender ciclo auth + push
- NO usar AsyncStorage para datos sensibles
- NO simular con TextInput lo que el OS resuelve nativamente
- NO crear archivos nuevos si la lógica cabe en uno existente

## Al terminar

1. `done: true` en roadmap si aplica
2. Spec: actualizar si cambió contrato de API mobile
3. `/wrap` en `MEDALIQ-MOBILE/.claude/memory/session.md`
