Ejecuta el protocolo de cierre de sesión para Medaliq Web.

## 1. Actualiza auto-memory

Ruta: `/Users/miguelatencia/.claude/projects/-Users-miguelatencia-Desktop-FACTORY-AI-SOFTWARE-MEDALIQ-MEDALIQ-PROJECT/memory/MEMORY.md`

Actualizar:
- `## Última sesión` → fecha + resumen + pendiente
- Otras secciones solo si cambiaron

**NO duplicar** lo que ya está en CLAUDE.md, architecture.md, o discoveries.md.

## 2. Conocimiento profundo (solo si aplica)

- Nueva decisión técnica → `.claude/memory/architecture.md`
- Nuevo trap/patrón → `.claude/memory/discoveries.md`

## 3. Roadmap (si se completó tarea)

Marcar `done: true` en `src/app/admin/roadmap/roadmap_data.ts`.

## 4. Confirma

Una línea por archivo actualizado + próximos pasos.
