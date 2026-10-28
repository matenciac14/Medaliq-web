# forge-build — Fase 2: Implementación

Ejecutar después de completar `forge-survey.md`. El mapa de scope debe estar listo.

---

## Protocolo

### 1. Orden de implementación (siempre este orden)

```
1. DB migration      — si hay cambio de schema
2. Domain            — use_case.ts, types.ts, schemas (sin Prisma, sin Next)
3. Infrastructure    — repository.ts (implementa el port)
4. API routes        — thin (~25 líneas), delegan al domain/service
5. UI web            — page / component
6. API mobile        — mirror del endpoint web si aplica
7. UI mobile         — screen / api call en src/api/
8. Tests             — junto a cada capa
```

### 2. Reglas por capa

**DB:**
- Leer `prisma/schema.prisma` completo antes de agregar campo
- `$transaction`: reads FUERA → writes DENTRO → I/O externo FUERA
- Multi-tenant: `userId` o `athleteId` en TODO modelo nuevo

**Domain:**
- Sin imports de Prisma, Next.js ni fetch
- Funciones puras o use cases con repos inyectados como parámetro

**API routes:**
- `req.json().catch(() => null)` en POST/PATCH/DELETE
- `res.ok` antes de `res.json()` en client fetches
- Fechas server: `todayInTz(tz)` — nunca `new Date()` directo
- Rate limit: `rateLimitAsync()` en endpoints públicos o de escritura

**UI:**
- Leer el componente completo antes de editar
- No crear archivo nuevo si la lógica cabe en uno existente

### 3. Checklist por archivo editado

Antes de pasar al siguiente archivo:
- [ ] El archivo compila sin error TS
- [ ] Los campos usados existen en el schema (verificar nombre exacto)
- [ ] El tenant key está presente en la query
- [ ] No hay `any` sin justificación

### 4. Build incremental

- Un archivo a la vez en el orden del punto 1
- Si aparece un trap no documentado → anotarlo en `CLAUDE.worktree.md` bajo `## Decisiones tomadas`
- Si el scope crece durante build → parar, documentar, preguntar a Miguel antes de continuar

---

## Salida esperada

Al terminar build: todos los archivos implementados + build sin errores TS.

Pasar a `forge-inspect.md`.
