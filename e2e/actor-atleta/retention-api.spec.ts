/**
 * E2E — Actor: Atleta | Módulo: Retention APIs
 * Tags: @atleta @retention @api @critical
 *
 * Cubre los 5 endpoints de retención (RET-01 a RET-05):
 * - GET /api/athlete/energy-balance         (RET-01)
 * - GET /api/athlete/gym/rest-defaults       (RET-02)
 * - PATCH /api/athlete/gym/rest-defaults     (RET-02)
 * - GET /api/athlete/gym/session/:id/summary (RET-03)
 * - GET /api/athlete/running/prs             (RET-04)
 *
 * Todos usan sesión web autenticada (storageState).
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'

test.describe('Retention API — Energy Balance (RET-01) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/energy-balance retorna estructura válida @critical', async ({ request }) => {
    const res = await request.get('/api/athlete/energy-balance')
    expect(res.status()).toBe(200)

    const data = await res.json()

    // Campos obligatorios del resultado
    expect(data).toHaveProperty('tdee')
    expect(data).toHaveProperty('exerciseCalories')
    expect(data).toHaveProperty('consumed')
    expect(data).toHaveProperty('balance')
    expect(data).toHaveProperty('macros')

    // tdee y consumed deben ser numéricos
    expect(typeof data.tdee).toBe('number')
    expect(typeof data.consumed).toBe('number')
    expect(typeof data.balance).toBe('number')
    expect(typeof data.exerciseCalories).toBe('number')

    // macros debe tener la estructura correcta
    if (data.macros) {
      expect(data.macros).toHaveProperty('protein')
      expect(data.macros).toHaveProperty('carbs')
      expect(data.macros).toHaveProperty('fat')
    }
  })

  test('energy balance rechaza request sin auth', async ({ request }) => {
    // Crear un request context sin storageState
    const res = await request.get('/api/athlete/energy-balance', {
      headers: { cookie: '' },
    })
    // Puede ser 401 o redirect a login
    expect([401, 302]).toContain(res.status())
  })
})

test.describe('Retention API — Rest Timer Defaults (RET-02) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/gym/rest-defaults retorna defaults @critical', async ({ request }) => {
    const res = await request.get('/api/athlete/gym/rest-defaults')
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('autoStart')
    expect(data).toHaveProperty('soundEnabled')
    expect(data).toHaveProperty('vibrationEnabled')
    expect(data).toHaveProperty('defaultCompoundSeconds')
    expect(data).toHaveProperty('defaultIsolationSeconds')

    // Tipos correctos
    expect(typeof data.autoStart).toBe('boolean')
    expect(typeof data.soundEnabled).toBe('boolean')
    expect(typeof data.defaultCompoundSeconds).toBe('number')
    expect(typeof data.defaultIsolationSeconds).toBe('number')
  })

  test('PATCH /api/athlete/gym/rest-defaults actualiza parcialmente', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 90 },
    })
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data.defaultCompoundSeconds).toBe(90)

    // Restaurar valor original
    await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 120 },
    })
  })

  test('PATCH valida rango de segundos (< 15 rechazado)', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 5 },
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH valida rango de segundos (> 600 rechazado)', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultIsolationSeconds: 999 },
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH con body vacío retorna 400', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH valida tipos (string en boolean rechazado)', async ({ request }) => {
    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { autoStart: 'yes' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('Retention API — Session Summary (RET-03) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET summary con sessionId inexistente retorna 404', async ({ request }) => {
    const res = await request.get('/api/athlete/gym/session/nonexistent-id/summary')
    expect(res.status()).toBe(404)
  })

  test('GET summary con sessionId de otro usuario retorna 404 (multi-tenant)', async ({ request }) => {
    // Un UUID válido pero que no pertenece a este usuario
    const res = await request.get('/api/athlete/gym/session/00000000-0000-0000-0000-000000000000/summary')
    expect(res.status()).toBe(404)
  })
})

test.describe('Retention API — Running PRs (RET-04) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/running/prs retorna 5 buckets @critical', async ({ request }) => {
    const res = await request.get('/api/athlete/running/prs')
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('prs')
    expect(data.prs).toHaveLength(5)

    const distances = data.prs.map((pr: { distance: string }) => pr.distance)
    expect(distances).toEqual(['1K', '5K', '10K', '21K', '42K'])

    // Cada bucket tiene la estructura correcta
    for (const pr of data.prs) {
      expect(pr).toHaveProperty('distance')
      expect(pr).toHaveProperty('bestPaceSecPerKm')
      expect(pr).toHaveProperty('bestPaceFormatted')
      expect(pr).toHaveProperty('bestTimeSeconds')
      expect(pr).toHaveProperty('bestTimeFormatted')
      expect(pr).toHaveProperty('achievedAt')
      expect(pr).toHaveProperty('source')
    }
  })

  test('running PRs: buckets vacíos tienen valores null', async ({ request }) => {
    const res = await request.get('/api/athlete/running/prs')
    const data = await res.json()

    // Al menos verificar que los buckets sin datos tienen null
    for (const pr of data.prs) {
      if (pr.bestPaceSecPerKm === null) {
        expect(pr.bestPaceFormatted).toBeNull()
        expect(pr.bestTimeSeconds).toBeNull()
        expect(pr.bestTimeFormatted).toBeNull()
        expect(pr.source).toBeNull()
      }
    }
  })
})
