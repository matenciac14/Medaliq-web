Ejecuta la Fase 2 (Build) del pipeline Forge.

Lee `agents/forge-build.md` completo y sigue el protocolo paso a paso.

## Pre-requisito
El mapa de scope de `/survey` debe estar listo. Si no lo esta, ejecuta `/survey` primero.

## Orden de implementacion (NO alterar)
1. DB migration (si hay cambio de schema)
2. Domain — use_case.ts, types.ts, schemas (sin Prisma, sin Next)
3. Infrastructure — repository.ts
4. API routes — thin (~25 lineas)
5. UI web — page / component
6. API mobile — mirror si aplica
7. UI mobile — screen / api call
8. Tests — junto a cada capa

## Reglas
- Un archivo a la vez en el orden de arriba
- Import Prisma: `@/generated/prisma/client` (NUNCA sin `/client`)
- `$transaction`: reads FUERA, writes DENTRO
- `req.json().catch(() => null)` en POST/PATCH/DELETE
- Tenant key (`userId` / `athleteId`) en TODA query
- Si el scope crece: para y pregunta a Miguel

## Decision queue — park and continue

Si durante el build encuentras un blocker que requiere decision humana:

1. **NO te detengas** — documenta el blocker:
```
## Parked
- [ ] [BLOCKER] descripcion del problema + opciones posibles
  - Opcion A: ...
  - Opcion B: ...
  - Razon por la que no puedo decidir solo: ...
```

2. **Continua** con la siguiente tarea independiente del scope
3. Al terminar, muestra todos los items parked para que Miguel decida

Ejemplos de blockers que se parkean:
- Ambiguedad en spec que cambia el contrato
- Cambio de schema que afecta otro modulo
- Decisiones de UX no cubiertas en la spec
- Trade-offs de performance vs simplicidad sin criterio claro

Ejemplos que NO se parkean (decidir solo):
- Naming de variables/funciones
- Orden de campos en response
- Formato de error messages
- Estructura interna de un use_case

Al terminar: confirma que tsc pasa sin errores. Muestra items parked si los hay. Pasa a `/inspect`.
