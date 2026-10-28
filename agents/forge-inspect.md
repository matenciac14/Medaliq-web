# forge-inspect — Fase 3: Auditoría post-build

Ejecutar después de `forge-build.md`. El objetivo es encontrar errores antes de que lleguen a develop.

---

## Protocolo

### 1. Verificación técnica

```bash
npx next build        # DEBE pasar — sin errores ni warnings críticos
```

Si build falla → volver a build, corregir, no pasar a seal hasta que pase.

### 2. Auditoría de seguridad (solo endpoints nuevos/modificados)

Para cada endpoint nuevo:
- [ ] Auth guard presente (`auth()` web / `getMobileUser()` mobile)
- [ ] Feature flag verificado si la feature tiene gate
- [ ] Rate limit presente (`rateLimitAsync()`)
- [ ] Tenant key filtra los datos (`userId` / `athleteId`)
- [ ] Input validado con Zod
- [ ] No expone datos de otro tenant

### 3. Auditoría de dominio

- [ ] Los campos usados existen en schema.prisma con el nombre exacto
- [ ] No hay `new Date()` directo en lógica server — usa `todayInTz(tz)`
- [ ] `$transaction` sigue el patrón: reads FUERA, writes DENTRO
- [ ] Ningún endpoint rompe un contrato documentado en su spec

### 4. Verificar traps

Revisar los traps del módulo tocado. ¿Algún cambio contradice un trap?
Si sí → documentar la excepción o revertir.

### 5. Mirror mobile

Si se creó/modificó un endpoint web:
- [ ] Verificar en `_mobile_mirror.spec.md` si tiene par mobile
- [ ] Si el par mobile existe y no se actualizó → crear issue en `CLAUDE.worktree.md`

### 6. Checklist final

- [ ] Build pasa
- [ ] Sin `console.log` en código productivo
- [ ] Sin `TODO` sin ticket asociado
- [ ] Sin campos hardcodeados que deberían ser dinámicos (ej: timezone, userId)
- [ ] Roadmap item identificado para marcar `done: true` en seal

---

## Salida esperada

Al terminar inspect: lista de hallazgos con severidad (CRITICO / MEDIO / LOW).
- CRITICO → corregir antes de seal
- MEDIO → corregir o documentar con decisión explícita
- LOW → anotar en discoveries.md si es patrón nuevo

Pasar a `forge-seal.md`.
