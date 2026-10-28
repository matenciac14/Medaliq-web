# forge-survey — Fase 1: Captura de contexto

Ejecutar ANTES de tocar cualquier archivo. Objetivo: entender el scope completo antes de actuar.

---

## Protocolo

### 1. Leer el scope
- Leer `CLAUDE.worktree.md` (o el issue/tarea que trajo aquí)
- Identificar módulos afectados

### 2. Decidir el carril

| Situación | Carril |
|-----------|--------|
| 1 archivo, patrón ya existente | `direct` — no usar Forge |
| Múltiples archivos, sin nueva abstracción | `survey → build` |
| Nueva abstracción / cross-módulo / auth / billing | `pipeline completo` |
| Ambigüedad | Preguntar a Miguel — no asumir |

### 3. Leer documentación por módulo (solo lo relevante)

**Siempre:**
- `../specs/_traps.spec.md` — traps del módulo que se toca (ver índice en CLAUDE.md)
- `prisma/schema.prisma` — si toca DB

**Según módulo:**
- `../specs/<modulo>.spec.md` — Capa 1 (TL;DR + Contratos AI) es suficiente para la mayoría
- `../domains/<modulo>.md` — si cambia comportamiento del dominio
- `../specs/_mobile_mirror.spec.md` — si toca endpoint web con par mobile

### 4. Mapear el trabajo

Antes de pasar a build, tener claro:

```
Modelos DB afectados:
  - [ ] <modelo> — campo nuevo / relación nueva / sin cambios

Endpoints:
  - [ ] <método> <ruta> — nuevo / modificado
  - [ ] Mirror mobile: <ruta mobile> — nuevo / modificado / no aplica

Domain:
  - [ ] <use_case.ts> — nuevo / modificado
  - [ ] <repository.ts> — nuevo / modificado

UI:
  - [ ] web: <componente / página>
  - [ ] mobile: <screen / api call>

Tests:
  - [ ] <archivo.test.ts> — nuevo / actualizar

Fuera de scope — NO tocar:
  - <lista explícita>
```

### 5. Verificar traps del módulo

Buscar en `_traps.spec.md` los códigos del módulo antes de escribir una línea.

---

## Salida esperada

Al terminar survey: el mapa de arriba completo + decisión de carril documentada en `CLAUDE.worktree.md` bajo `## Scope`.

Pasar a `forge-build.md`.
