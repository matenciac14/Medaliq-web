Ejecuta la Fase 4 (Seal) del pipeline Forge.

Lee `agents/forge-seal.md` completo y sigue el protocolo paso a paso.

## Pre-requisito
Inspect debe estar completo con 0 hallazgos CRITICOS.

## Checklist en orden

### 1. Roadmap
En `src/app/admin/roadmap/roadmap_data.ts`:
- Marcar `done: true` en el item correspondiente
- Agregar `note` con descripcion + archivos + fecha

### 2. Spec
En `../specs/<modulo>.spec.md`:
- Si cambio contrato API: actualizar Capa 1
- Si cambio comportamiento: actualizar Capa 2
- Si nuevo trap: agregar a `_traps.spec.md` con codigo T-XX

### 3. Domain doc
En `../domains/<modulo>.md`:
- Si cambio lo que el sistema puede hacer: actualizar
- Si nuevo flujo cross-actor: actualizar `flujos-cruzados.md`

### 4. Verificacion final
```bash
pnpm verify   # tsc + vitest + next build — los tres deben pasar
```

### 5. Memoria
Actualizar `.claude/memory/session.md` con lo que se hizo y proximos pasos.

### 6. Indices (si aplica)
- Nuevo trap → actualizar indice en CLAUDE.md
- Spec nueva → quitar modulo de lista "sin spec" en forge-survey.md
- Endpoint mobile nuevo → actualizar @mobile.md
- Agente nuevo → actualizar tabla en CLAUDE.md

### 7. Commit y PR
```bash
git add <archivos especificos>
git commit -m "feat(<modulo>): descripcion"
git push origin feature/<nombre>
# PR a develop (NUNCA a main directo)
```
