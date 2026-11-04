Ejecuta la Fase 3 (Inspect) del pipeline Forge.

Lee `agents/forge-inspect.md` completo y sigue el protocolo paso a paso.

## Pre-requisito
La fase Build debe estar completa con tsc limpio.

## Paso 0 — Clasificacion de riesgo

Antes de revisar, clasifica CADA archivo modificado en un tier:

| Tier | Criterio | Revision |
|------|----------|----------|
| 0 | docs, comments, tests, types-only | Skip — solo verificar que compila |
| 1 | codigo normal (UI, domain, infra, API CRUD) | Review estandar (checklist abajo) |
| 2 | auth, billing, middleware, schema.prisma, mobile_auth, session_mappers, cron, webhooks | Review exhaustivo + confirmar con Miguel antes de seal |

```bash
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached
```

Clasifica cada archivo. Muestra la tabla: `archivo | tier | razon`.
Si HAY archivos tier 2: marcar `## Requiere aprobacion humana` al final.

## Checklist por tier

### Tier 1+ : Seguridad (cada endpoint nuevo/modificado)
- [ ] Auth guard (`auth()` web / `getMobileUser()` mobile)
- [ ] Feature flag si la feature tiene gate
- [ ] Rate limit (`rateLimitAsync()`)
- [ ] Tenant key filtra datos
- [ ] Input validado con Zod
- [ ] No expone datos de otro tenant

### Tier 1+ : Dominio
- [ ] Campos existen en schema.prisma con nombre exacto
- [ ] No hay `new Date()` directo — usa `todayInTz(tz)`
- [ ] `$transaction` sigue patron: reads FUERA, writes DENTRO
- [ ] No rompe contratos de la spec

### Tier 2 : Revision exhaustiva (adicional)
- [ ] Leer spec completa del modulo (no solo TL;DR)
- [ ] Verificar contra TODOS los traps del modulo
- [ ] Si auth: verificar middleware.ts no se rompio
- [ ] Si schema: verificar que migration es reversible
- [ ] Si billing: verificar que BILLING_ENABLED guard sigue intacto
- [ ] Si cron: verificar que vercel.json sigue correcto

### Todos : Traps
- [ ] Ningun cambio contradice un trap documentado

### Todos : Mirror mobile
- [ ] Si endpoint web tiene par mobile en `_mobile_mirror.spec.md` — verificar

### Todos : Limpieza
- [ ] Sin `console.log` en productivo
- [ ] Sin `TODO` sin ticket
- [ ] Sin hardcodes (timezone, userId)

### Build
```bash
pnpm next build
```
Si falla: volver a build, corregir, no pasar a seal.

## Output

Al terminar muestra:

```
## Resultado Inspect

### Clasificacion
| Archivo | Tier | Razon |
|---------|------|-------|
| ... | 0/1/2 | ... |

### Hallazgos
| # | Severidad | Archivo | Descripcion | Estado |
|---|-----------|---------|-------------|--------|
| 1 | CRITICO/MEDIO/LOW | ... | ... | pendiente/corregido |

### Requiere aprobacion humana: SI/NO
[Si hay tier 2, listar que debe aprobar Miguel]
```

CRITICO: corregir antes de seal. MEDIO: corregir o documentar. LOW: anotar en discoveries.md.
