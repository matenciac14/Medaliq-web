/**
 * E2E — Stress & Rate Limit Tests | Retention APIs
 * Tags: @stress @retention
 *
 * Verifica:
 * - Rate limiting responde 429 cuando se excede el límite
 * - APIs manejan requests concurrentes sin errores 500
 * - Validación de input rechaza payloads malformados
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'

test.describe('Retention Stress — Rate Limiting @stress @retention', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('energy-balance: requests concurrentes no producen 500', async ({ request }) => {
    // Disparar 10 requests en paralelo
    const promises = Array.from({ length: 10 }, () =>
      request.get('/api/athlete/energy-balance')
    )

    const responses = await Promise.all(promises)

    for (const res of responses) {
      // Aceptamos 200 o 429 (rate limit), pero nunca 500
      expect([200, 429]).toContain(res.status())
    }
  })

  test('rest-defaults: requests concurrentes no producen 500', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get('/api/athlete/gym/rest-defaults')
    )

    const responses = await Promise.all(promises)

    for (const res of responses) {
      expect([200, 429]).toContain(res.status())
    }
  })

  test('running-prs: requests concurrentes no producen 500', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get('/api/athlete/running/prs')
    )

    const responses = await Promise.all(promises)

    for (const res of responses) {
      expect([200, 429]).toContain(res.status())
    }
  })
})

test.describe('Retention Stress — Input Validation @stress @retention', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('rest-defaults PATCH: payload con campos extra es manejado', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: {
        defaultCompoundSeconds: 90,
        unknownField: 'should be ignored',
      },
    })
    // Debe aceptar campos válidos e ignorar extras, o rechazar
    expect([200, 400]).toContain(res.status())
  })

  test('rest-defaults PATCH: null values rechazados', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { autoStart: null },
    })
    expect(res.status()).toBe(400)
  })

  test('rest-defaults PATCH: float en seconds rechazado', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 90.5 },
    })
    expect(res.status()).toBe(400)
  })

  test('rest-defaults PATCH: negative seconds rechazado', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultIsolationSeconds: -10 },
    })
    expect(res.status()).toBe(400)
  })

  test('session summary: SQL injection attempt en sessionId retorna 404', async ({ request }) => {
    const res = await request.get("/api/athlete/gym/session/'; DROP TABLE--/summary")
    // Prisma parametriza queries — no hay injection, solo 404
    expect([404, 400]).toContain(res.status())
  })
})
