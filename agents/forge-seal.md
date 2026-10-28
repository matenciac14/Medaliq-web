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
- [ ] Memoria actualizada
- [ ] PR abierto a develop
