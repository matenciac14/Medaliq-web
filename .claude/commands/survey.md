Ejecuta la Fase 1 (Survey) del pipeline Forge.

Lee `agents/forge-survey.md` completo y sigue el protocolo paso a paso:

1. Lee la descripcion de la tarea
2. Identifica modulos afectados
3. Decide el carril (direct / FTD / survey+build / pipeline completo)
4. Verifica que el modulo tiene spec en `../specs/<modulo>.spec.md`
5. Lee traps del modulo en `../specs/_traps.spec.md`
6. Lee schema.prisma si toca DB
7. Mapea el trabajo (modelos, endpoints, domain, UI, tests, fuera de scope)

Al terminar: muestra el mapa de scope completo y la decision de carril.
No pases a build hasta que Miguel confirme el scope.
