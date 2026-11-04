Ejecuta la QC station completa: typecheck + tests + build + coverage.

## Protocolo

### 1. TypeScript
```bash
pnpm tsc --noEmit
```
Si falla: listar errores con archivo:linea y descripcion.

### 2. Tests
```bash
pnpm vitest run --reporter=verbose
```
Si falla: listar tests fallidos con nombre y error.

### 3. Build
```bash
pnpm next build
```
Si falla: listar errores de build.

### 4. Coverage (si tests pasan)
```bash
pnpm vitest run --coverage
```
Verificar contra thresholds: lines 65%, statements 60%, functions 55%, branches 50%.

### 5. Reporte

```
QC Station Report
─────────────────
TypeScript:  PASS/FAIL (N errores)
Tests:       PASS/FAIL (N/M passed)
Build:       PASS/FAIL
Coverage:    PASS/FAIL (lines X%, statements X%, functions X%, branches X%)

Resultado:   LISTO PARA PR / BLOQUEADO (detalles)
```

Si todo pasa: "QC limpio. Listo para push."
Si algo falla: listar bloqueantes en orden de prioridad.
