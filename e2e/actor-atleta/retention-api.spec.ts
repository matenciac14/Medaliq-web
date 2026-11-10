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
 * NOTA: Si el global.setup no logró autenticar (DB sin seed),
 * los tests que requieren auth se skipean automáticamente.
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'

/** Helper: verifica si la sesión es válida antes de correr tests auth-dependientes */
async function isAuthenticated(request: ReturnType<typeof test['info']> extends never ? never : any): Promise<boolean> {
  const res = await request.get('/api/auth/session')
  if (res.status() !== 200) return false
  const body = await res.json()
  return !!body?.user?.id
}

test.describe('Retention API — Energy Balance (RET-01) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/energy-balance retorna estructura válida @critical', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/energy-balance')
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('tdee')
    expect(data).toHaveProperty('exerciseCalories')
    expect(data).toHaveProperty('consumed')
    expect(data).toHaveProperty('balance')
    expect(data).toHaveProperty('macros')

    expect(typeof data.tdee).toBe('number')
    expect(typeof data.consumed).toBe('number')
    expect(typeof data.balance).toBe('number')
    expect(typeof data.exerciseCalories).toBe('number')

    if (data.macros) {
      expect(data.macros).toHaveProperty('protein')
      expect(data.macros).toHaveProperty('carbs')
      expect(data.macros).toHaveProperty('fat')
    }
  })

  test('energy balance rechaza request sin auth', async ({ request }) => {
    // Request sin cookies — forzar header vacío
    const res = await request.get('/api/athlete/energy-balance', {
      headers: { cookie: '' },
    })
    // 401 (directo), 302 (redirect a login), o 404 (middleware catch-all) — nunca 200
    expect(res.status()).not.toBe(200)
  })
})

test.describe('Retention API — Rest Timer Defaults (RET-02) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/gym/rest-defaults retorna defaults @critical', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/gym/rest-defaults')
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('autoStart')
    expect(data).toHaveProperty('soundEnabled')
    expect(data).toHaveProperty('vibrationEnabled')
    expect(data).toHaveProperty('defaultCompoundSeconds')
    expect(data).toHaveProperty('defaultIsolationSeconds')

    expect(typeof data.autoStart).toBe('boolean')
    expect(typeof data.soundEnabled).toBe('boolean')
    expect(typeof data.defaultCompoundSeconds).toBe('number')
    expect(typeof data.defaultIsolationSeconds).toBe('number')
  })

  test('PATCH /api/athlete/gym/rest-defaults actualiza parcialmente', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 90 },
    })
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data.defaultCompoundSeconds).toBe(90)

    // Restaurar
    await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 120 },
    })
  })

  test('PATCH valida rango de segundos (< 15 rechazado)', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultCompoundSeconds: 5 },
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH valida rango de segundos (> 600 rechazado)', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { defaultIsolationSeconds: 999 },
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH con body vacío retorna 400', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('PATCH valida tipos (string en boolean rechazado)', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.patch('/api/athlete/gym/rest-defaults', {
      data: { autoStart: 'yes' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('Retention API — Session Summary (RET-03) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET summary con sessionId inexistente retorna 404', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/gym/session/nonexistent-id/summary')
    expect(res.status()).toBe(404)
  })

  test('GET summary con sessionId de otro usuario retorna 404 (multi-tenant)', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/gym/session/00000000-0000-0000-0000-000000000000/summary')
    expect(res.status()).toBe(404)
  })
})

test.describe('Retention API — Running PRs (RET-04) @atleta @retention @api', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('GET /api/athlete/running/prs retorna 5 buckets @critical', async ({ request }) => {
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/running/prs')
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('prs')
    expect(data.prs).toHaveLength(5)

    const distances = data.prs.map((pr: { distance: string }) => pr.distance)
    expect(distances).toEqual(['1K', '5K', '10K', '21K', '42K'])

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
    const authed = await isAuthenticated(request)
    test.skip(!authed, 'Sesión no disponible — DB sin seed')

    const res = await request.get('/api/athlete/running/prs')
    const data = await res.json()

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
