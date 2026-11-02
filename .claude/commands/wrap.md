Ejecuta el protocolo de cierre de sesión para Medaliq Web.

## 1. Actualiza memoria en repo: `.claude/memory/session.md`

- `## Ultima actualizacion` → fecha de hoy
- `## Lo que se hizo en esta sesion` → lista de lo implementado/corregido (archivos editados, features, bugs)
- `## Proxima sesion` → próximos pasos concretos y específicos

## 2. Si hubo patrón nuevo o trap descubierto

Agregar entrada en `.claude/memory/discoveries.md`:
```
## [FECHA] — [descripción en una línea]
- Qué se descubrió
- Por qué importa
- Dónde está en el código
```

Solo agregar si es un gotcha no obvio que quemaría a otro dev. Si ya está en `../specs/_traps.spec.md`, no duplicar.

## 3. Si cambió arquitectura o decisión técnica

Actualizar `.claude/memory/architecture.md` con la decisión y el por qué.

## 4. Roadmap

Si se completó alguna tarea: marcar `done: true` en `src/app/admin/roadmap/roadmap_data.ts`.

## 5. Actualiza auto-memory del sistema

Ruta: `/Users/miguelatencia/.claude/projects/-Users-miguelatencia-Desktop-FACTORY-AI-SOFTWARE-MEDALIQ-MEDALIQ-PROJECT/memory/MEMORY.md`

Actualizar las secciones que cambiaron (estado, deuda técnica, auditorías, última sesión). NO reescribir todo — solo lo que cambió.

Si la sesión tuvo cambios importantes que afectan a otros repos (mobile, docs), anotar en la sección relevante para que el próximo /wrap en ese repo lo recoja.

## 6. Confirma

Responde con una línea por cada archivo actualizado y los próximos pasos.
