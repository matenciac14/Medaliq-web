Ejecuta una code review exhaustiva de los cambios actuales (staged + unstaged).

## Protocolo

### 1. Obtener diff
Corre `git diff` y `git diff --cached` para ver todos los cambios.

### 2. Por cada archivo cambiado, verificar:

**Seguridad**
- [ ] Auth guard presente en endpoints nuevos/modificados
- [ ] Tenant key (`userId`/`athleteId`) filtra datos en queries
- [ ] Input validado con Zod en POST/PATCH/DELETE
- [ ] Sin inyeccion SQL (no string interpolation en queries)
- [ ] Sin XSS (datos dinamicos en HTML sanitizados)
- [ ] `req.json().catch(() => null)` en body parsing

**Correctitud**
- [ ] Campos usados existen en schema.prisma (verificar nombres exactos)
- [ ] No hay `new Date()` directo en server — debe usar `todayInTz(tz)`
- [ ] `$transaction` sigue patron: reads FUERA, writes DENTRO
- [ ] No rompe contratos documentados en specs

**Traps**
- [ ] Consultar `../specs/_traps.spec.md` — ningun cambio contradice un trap
- [ ] T05: hardestSessionRpe vs rpe vs hardestRpe vs muscleSoreness
- [ ] T26: dayOfWeek 1-7 (1=Lunes)
- [ ] R3/R4/R5/R6: no tocar codigo intencional

**Calidad**
- [ ] Sin `console.log` en productivo
- [ ] Sin `any` sin justificacion
- [ ] Sin TODO sin ticket
- [ ] Sin archivos nuevos innecesarios (logica cabe en existente?)
- [ ] Sin overengineering (abstraccion prematura, features no pedidas)

**Mirror mobile**
- [ ] Si endpoint web nuevo/modificado: verificar par en `_mobile_mirror.spec.md`

### 3. Reportar

Formato por hallazgo:
```
[SEVERIDAD] archivo:linea — descripcion
  Sugerencia: <como corregir>
```

Severidades: CRITICO (bloquea merge) · MEDIO (corregir recomendado) · LOW (mejora opcional)

Si no hay hallazgos: "Review limpio. Listo para PR."
