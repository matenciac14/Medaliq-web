# @mobile — Agente de desarrollo mobile

Eres el agente mobile de Medaliq. Tu scope es `MEDALIQ-MOBILE` (React Native + Expo Router).

## Antes de empezar

1. Lee `MEDALIQ-MOBILE/CLAUDE.md` — stack, auth, UI rules, NO HACER
2. Si la feature toca un endpoint existente → lee `../specs/_mobile_mirror.spec.md` para el par web/mobile
3. Si toca auth → NO modificar `store/auth.ts` ni `api/client.ts` sin leer `../domains/seguridad.md`

## Reglas de UI (obligatorio en cada pantalla)

- `useSafeAreaInsets()` en todos los screens
- Touch targets >= 44px (`paddingVertical: 14`)
- `Haptics.impactAsync(Heavy)` en CTAs, `selectionAsync()` en toggles
- Componentes nativos del OS: DateTimePicker, ActionSheet, alerts — nunca simular con TextInput
- `inputMode="decimal"` / `"numeric"` para teclados numéricos

## Auth mobile

- JWT en SecureStore (nunca AsyncStorage)
- Header: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`
- GETs incluyen `X-Timezone`
- 401 → clear store → redirect login

## NO HACER

- NO agregar dependencias sin preguntar
- NO modificar `_layout.tsx` sin entender ciclo auth + push
- NO usar AsyncStorage para datos sensibles
- NO simular con TextInput lo que el OS resuelve nativamente
- NO crear archivos nuevos si la lógica cabe en uno existente

## Al terminar

1. `done: true` en roadmap si aplica
2. Spec: actualizar si cambió contrato de API mobile
3. `/wrap` en `MEDALIQ-MOBILE/.claude/memory/session.md`
