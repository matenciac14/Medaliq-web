# Medaliq Web — Contexto Tecnico

> Producto y negocio -> `../CLAUDE.md` | Schema -> `prisma/schema.prisma` | Mobile -> `../MEDALIQ-MOBILE/CLAUDE.md`

## Stack
Next.js 16 · React 19 · TypeScript 5 · PostgreSQL · Prisma 7 · Tailwind v4 · Auth.js v5 · jose (JWT mobile) · Zod 4 · Vitest · pnpm

## Auth
- **Web**: `auth()` desde `@/auth`. Session mappers en `lib/auth/session_mappers.ts`
- **Mobile**: `getMobileUser(req)` desde `lib/auth/mobile_auth.ts`. Bearer JWT, 30d expiry. Rutas `/api/mobile/*`
- **Middleware**: `src/middleware.ts` — protege rutas, redirects por rol, flujos especiales (onboarding, pending, suspended)

## Arquitectura
```
domain/<modulo>/    <- logica pura, SIN Prisma/Next.js (use_case.ts, types.ts)
infrastructure/db/  <- repositorios Prisma
app/api/            <- rutas delgadas (~25 lineas)
lib/                <- utilidades compartidas
```
**$transaction**: reads FUERA → writes DENTRO → I/O externo FUERA

## Naming
- Palabras: `_` (`get_plan_data.ts`) · Rol: `.` (`checkout.use_case.ts`) · Tests: `.test.ts`
- Dirs URL: `-` (`forgot-password/`) · Dirs codigo: `_` (`coach_dashboard/`)

## Git flow
`main` ← `develop` ← `feature/<n>-kebab` · `bugfix/<n>-kebab`
Commits: `feat:` · `fix:` · `chore:` · `docs:`
**PRs siempre a `develop`** — `develop` → `main` solo en releases.
**Pre-push**: `npx next build` debe pasar. Nunca pushear build roto.

---

## Estado del sistema — NO "corregir" sin verificar aqui

### R-series completions (codigo intencional que parece incompleto)

| Codigo | Comportamiento actual | Razon |
|--------|-----------------------|-------|
| R3 | `syncWeight` solo guarda `weightKg` — NO recalcula TDEE | Diseño intencional |
| R4 | `applySessionAdjustments` NO esta en check-in | Removido intencionalmente — solo en "accept suggestion" |
| R5 | `intensityToDayType` existe pero consumidores usan `MODERATE` hardcoded | Target de intensidad es fijo |
| R6 | `PendingNutritionAdjustment` eliminado — retorna `pendingAdjustment: null` | Deprecado y removido |

**Si ves R3/R4/R5/R6 → NO tocar. No es un bug.**

### Estado de produccion

- **Crons**: TODOS desactivados en `vercel.json` — no corren en produccion
- **`BILLING_ENABLED`**: si no es `'true'` → `getUserPlan()` retorna `'PRO'` para todos (modo beta)
- **`PlanSource`**: `COACH` es el UNICO valor valido en DB. `SYSTEM` y `TEMPLATE` son dead code.
- **`UserStatus` enforcement**: NO activo (PLT-01 pendiente)
- **`/coaches` directory**: oculto hasta 20+ coaches activos

### Modelos deprecados (NO usar en codigo nuevo)

- `Recipe` + `RecipeIngredient` — NUT-13
- `MealPlanVersion` — NUT-13
- `PendingNutritionAdjustment` — R6, eliminado

### Campo con 4 nombres (T05 — el trap mas peligroso)

`hardestSessionRpe` (DB) = `rpe` (domain) = `hardestRpe` (web) = `muscleSoreness` (mobile)

---

## Agentes de rol

Para tareas especializadas, invocar el agente correcto:

| Agente | Archivo | Cuando usarlo |
|--------|---------|--------------|
| `@dev` | `agents/@dev.md` | features web, API routes, domain layer |
| `@dba` | `agents/@dba.md` | schema.prisma, migraciones |
| `@mobile` | `agents/@mobile.md` | pantallas mobile, endpoints /api/mobile/* |
| `@admin` | `agents/@admin.md` | panel admin, acciones destructivas, roadmap |
| `@cpo` | `agents/@cpo.md` | decisiones de producto, priorización, features vs roadmap |
| `@cmo` | `agents/@cmo.md` | pitch, posicionamiento, GTM, coaches, marketing |
| `@security` | `agents/@security.md` | auth dual, multi-tenant, datos de salud, OWASP |

Invocar: abrir nueva terminal → `claude` → `"Eres @dev. Lee agents/@dev.md. Tu tarea: <descripcion>"`

## Slash commands — Skills invocables

| Comando | Que hace |
|---------|----------|
| `/forge` | Orquestador — decide carril y ejecuta el pipeline completo |
| `/survey` | Fase 1: captura contexto, decide carril, mapea scope |
| `/build` | Fase 2: implementacion en orden DB→domain→infra→API→UI→tests |
| `/inspect` | Fase 3: auditoria post-build (seguridad, traps, build, mirror) |
| `/seal` | Fase 4: cierre (roadmap, spec, domain, memoria, commit, PR) |
| `/review` | Code review de cambios actuales (git diff) — pre-PR |
| `/verify` | QC station: tsc + vitest + build + coverage |
| `/wrap` | Cierre de sesion + actualizacion de memoria |

**Uso**: escribir el comando directamente en el input (ej: `/forge implementar feature X`).

## Forge — pipeline de desarrollo (referencia)

Protocolos detallados en `agents/forge-*.md`. Los slash commands arriba son la forma preferida de invocar Forge.

| Fase | Protocolo | Slash command |
|------|-----------|---------------|
| 1 — Survey | `agents/forge-survey.md` | `/survey` |
| 2 — Build | `agents/forge-build.md` | `/build` |
| 3 — Inspect | `agents/forge-inspect.md` | `/inspect` |
| 4 — Seal | `agents/forge-seal.md` | `/seal` |

---

## SDD — Spec-Driven Development

**Principio**: la spec ES el contexto. Este archivo es un ROUTER, no un manual.

**Rutas**:
- Specs: `../specs/<modulo>.spec.md` — COMO esta implementado
- Domains: `../domains/<modulo>.md` — QUE hace el sistema
- Traps: `../specs/_traps.spec.md` — decisiones no obvias (25 traps)
- Mirror: `../specs/_mobile_mirror.spec.md` — 60+ pares web/mobile

**Convencion de specs**: el nombre del archivo = el modulo. `gym.spec.md` para gym, `auth.spec.md` para auth, `billing.spec.md` para billing. Nutricion y plan tienen sub-specs: `nutrition_tracking`, `nutrition_plans`, `nutrition_templates`, `nutrition_proposals`, `plan_checkin`, `plan_sessions`, `plan_dashboard`.

**Antes de modificar codigo**: leer TL;DR + Contratos AI de la spec (Capa 1). Solo profundizar si la tarea lo requiere.
**Antes de crear codigo nuevo**: generar spec con `_template.spec.md`, esperar OK de Miguel.
**Si codigo parece raro**: buscar en traps del modulo antes de "corregir".

### Traps por modulo (leer solo las relevantes)

```
auth     → T06, T07, T21, T22
nutrition→ T03, T04, T11, T13, T14
gym      → T08, T12, T15
plan     → T02, T05, T09, T16, T24, T25   ← T05: hardestRpe/muscleSoreness/rpe/hardestSessionRpe = mismo campo
dashboard→ T01, T17
routes   → T10, T18, T19, T20 (transversal)
dates    → T01, T17, T23 (transversal)
```

---

## Pre-vuelo — ANTES de editar codigo

1. Leer archivo completo
2. Si toca DB → verificar campos en `prisma/schema.prisma`
3. Si POST/PATCH/DELETE → `req.json()` con `.catch(() => null)`
4. Si client fetch → `res.ok` antes de `res.json()`
5. Si fechas server → `todayInTz(tz)`, nunca `new Date()` directo
6. Si fix → verificar que el bug existe (leer codigo, no confiar en reporte)
7. Si web endpoint → buscar mirror mobile en `_mobile_mirror.spec.md`
8. Si codigo "raro" → consultar traps del modulo antes de "corregir"

---

## NO HACER

- **NO** generar planes de entrenamiento automaticamente — sistema determinista
- **NO** agregar AI/LLM a ningun flujo sin aprobacion de Miguel
- **NO** crear migraciones DB sin que la tarea lo requiera
- **NO** refactorizar fuera del scope
- **NO** agregar dependencias npm sin preguntar
- **NO** modificar auth sin leer `seguridad.md`
- **NO** modificar schema.prisma sin leer el schema completo
- **NO** crear archivos nuevos si la logica cabe en uno existente
- **NO** agregar features no pedidas
- **NO** implementar sin spec aprobada

---

## Auditoria (cuando se audita el codebase)

1. **Encontrar** (solo lectura) → listar hallazgos con severidad y confianza
2. **Verificar** → cada hallazgo contra traps + schema + semantica JS → descartar falsos positivos
3. **Aplicar** → un fix a la vez, build entre fixes criticos, revertir si rompe

Anti-patrones: no reportar como bug algo en traps, no "estandarizar" codigo intencional, no agregar campos sin verificar schema.

---

## /wrap — Reflex de cierre de sesion

Correr SIEMPRE al terminar una sesion de trabajo.

1. Actualizar auto-memory MEMORY.md (se carga automaticamente en proxima sesion)
2. Si nueva decision tecnica → `.claude/memory/architecture.md`
3. Si nuevo trap/patron → `.claude/memory/discoveries.md`
4. **NO duplicar** — si ya esta en CLAUDE.md, architecture.md, o discoveries.md, no repetirlo en MEMORY.md

---

## Al terminar

1. Roadmap: `done: true` + `note` en `src/app/admin/roadmap/roadmap_data.ts`
2. Spec: actualizar si cambio contrato
3. Domain doc: actualizar si cambio comportamiento
4. Tests: para logica nueva
