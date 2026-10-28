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

## Agentes de rol

Para tareas especializadas, invocar el agente correcto:

| Agente | Archivo | Cuando usarlo |
|--------|---------|--------------|
| `@dev` | `agents/@dev.md` | features web, API routes, domain layer |
| `@dba` | `agents/@dba.md` | schema.prisma, migraciones |
| `@mobile` | `agents/@mobile.md` | pantallas mobile, endpoints /api/mobile/* |

Invocar: abrir nueva terminal → `claude` → `"Eres @dev. Lee agents/@dev.md. Tu tarea: <descripcion>"`

## Forge — pipeline de desarrollo

Usar para cualquier feature que no sea un fix de 1 archivo:

| Fase | Archivo | Qué hace |
|------|---------|---------|
| 1 — Survey | `agents/forge-survey.md` | Mapea scope, lee specs y traps, define carril |
| 2 — Build | `agents/forge-build.md` | Implementa en orden: DB → domain → infra → API → UI → mobile → tests |
| 3 — Inspect | `agents/forge-inspect.md` | Audita seguridad, traps, build, mirror mobile |
| 4 — Seal | `agents/forge-seal.md` | Roadmap + spec + domain doc + tests + memoria + PR |

Arrancar con: `"Lee agents/forge-survey.md. La tarea es: <descripcion>"`

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
plan     → T02, T09, T16, T24, T25
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

Correr SIEMPRE al terminar una sesion de trabajo (no abrir sesion nueva — el contexto ya esta cargado).

1. Actualizar `.claude/memory/session.md`:
   - `## Ultima actualizacion` → fecha de hoy
   - `## Lo que se hizo en esta sesion` → lista de lo que se implemento/corrigio
   - `## Proxima sesion` → proximos pasos concretos
2. Si hubo patron nuevo o trap descubierto → agregar a `.claude/memory/discoveries.md`
3. Si cambio arquitectura o decision tecnica → actualizar `.claude/memory/architecture.md`

---

## Al terminar

1. Roadmap: `done: true` + `note` en `src/app/admin/roadmap/roadmap_data.ts`
2. Spec: actualizar si cambio contrato
3. Domain doc: actualizar si cambio comportamiento
4. Tests: para logica nueva
