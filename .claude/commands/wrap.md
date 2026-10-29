Ejecuta el protocolo de cierre de sesión para Medaliq Web.

## 1. Actualiza `.claude/memory/session.md`

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

## 5. Confirma

Responde con una línea por cada archivo actualizado y los próximos pasos.
