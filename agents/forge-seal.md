# forge-seal — Fase 4: Cierre

Ejecutar después de `forge-inspect.md` con 0 hallazgos CRITICOS.

---

## Protocolo

### 1. Roadmap

En `src/app/admin/roadmap/roadmap_data.ts`:
- [ ] Marcar `done: true` en el item correspondiente
- [ ] Agregar `note` con: qué se implementó + archivos clave + fecha

```ts
{ title: '...', done: true, note: 'DONE (YYYY-MM-DD). Descripción. Archivos: x, y, z.' }
```

### 2. Spec

En `../specs/<modulo>.spec.md`:
- [ ] Si cambió un contrato de API → actualizar Capa 1 (TL;DR + Contratos AI)
- [ ] Si cambió comportamiento → actualizar Capa 2
- [ ] Si se descubrió un nuevo trap → agregar a `_traps.spec.md` con código T-XX

### 3. Domain doc

En `../domains/<modulo>.md`:
- [ ] Si cambió lo que el sistema puede hacer → actualizar el domain doc
- [ ] Si hay nuevo flujo cross-actor → actualizar `flujos-cruzados.md`

### 4. Verificación final

Correr en este orden y confirmar que todo pasa:

```bash
pnpm verify   # tsc + vitest + next build — los tres deben pasar
```

- [ ] Tests para lógica nueva en domain/ (funciones puras)
- [ ] `pnpm verify` pasa sin errores

### 5. Memoria

En `.claude/memory/session.md`:
- [ ] Actualizar `## Lo que se hizo en esta sesión`
- [ ] Actualizar `## Próxima sesión`

Si hay nuevo trap o patrón → agregar a `.claude/memory/discoveries.md`

### 6. Índices — actualizar si el cambio los afecta

Revisar cada ítem. Si aplica → actualizar el archivo indicado antes de commitear.

| Si hiciste esto | Actualizar aquí |
|-----------------|-----------------|
| Nuevo trap (T-XX) agregado a `_traps.spec.md` | `CLAUDE.md` — sección "Traps por modulo", agregar T-XX al módulo correspondiente |
| Spec nueva creada para un módulo de coach | `forge-survey.md` paso 3 — quitar ese módulo de la lista "sin spec" |
| Endpoint `/api/mobile/*` nuevo sin par web | `agents/@mobile.md` — sección "Endpoints mobile-only" |
| Pantalla nueva en MEDALIQ-MOBILE | `agents/@mobile.md` — sección "Inventario de pantallas" |
| Agente nuevo creado (`agents/@xxx.md`) | `CLAUDE.md` — tabla "Agentes de rol" |
| Módulo nuevo aparece en dominios o comportamiento | `agents/@dev.md` — si afecta reglas de la capa que toca |

Si ninguno aplica → continuar.

### 7. Commit y PR

```bash
git add <archivos específicos>
git commit -m "feat(<modulo>): descripción concisa"
git push origin feature/<nombre>
# Abrir PR → develop  (NUNCA directamente a main)
```

**Mensaje de commit:**
- `feat:` feature nueva
- `fix:` bug fix
- `refactor:` sin cambio de comportamiento
- `chore:` infra, docs, config

---

## Seal completo cuando:

- [ ] Build pasa
- [ ] Tests pasan
- [ ] Roadmap actualizado
- [ ] Spec actualizada (si aplica)
- [ ] Índices actualizados (si aplica — ver paso 6)
- [ ] Memoria actualizada
- [ ] PR abierto a develop
