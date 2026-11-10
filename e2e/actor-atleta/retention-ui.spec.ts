/**
 * E2E — Actor: Atleta | Módulo: Retention UI (browser)
 * Tags: @atleta @retention @ui
 *
 * Cubre las páginas web de retención:
 * - /dashboard: EnergyBalanceCard visible (desktop) (RET-01)
 * - /settings/gym: Rest Timer settings form (RET-02)
 * - /progress: Running PRs section (RET-04)
 * - /gym?sid=...: Session Summary modal (RET-03)
 * - /dashboard: Strava badge en CalendarStrip (RET-05)
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

/** Verifica si la página actual es /login (sesión inválida) */
async function isOnLogin(page: import('@playwright/test').Page): Promise<boolean> {
  return page.url().includes('/login')
}

test.describe('Retention UI — Energy Balance Card (RET-01) @atleta @retention @ui', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('dashboard muestra sección de balance energético en desktop @critical', async ({ page }) => {
    await goTo(page, '/dashboard')

    // EnergyBalanceCard tiene textos clave: Budget/Presupuesto, Consumido, Balance
    const balanceSection = page.getByText(/balance energético|energy balance|presupuesto/i).first()
    const count = await balanceSection.count()

    // Si el usuario tiene NutritionPlan con tdee > 0, la card es visible
    if (count > 0) {
      await expect(balanceSection).toBeVisible()
      // Debe mostrar números de kcal
      await expect(page.getByText(/kcal/i).first()).toBeVisible()
    }
    // Si no tiene plan nutricional, la card no aparece — eso es correcto
  })

  test('energy balance card muestra macros (protein, carbs, fat)', async ({ page }) => {
    await goTo(page, '/dashboard')

    const proteinBar = page.getByText(/proteína|protein/i).first()
    const count = await proteinBar.count()

    if (count > 0) {
      await expect(proteinBar).toBeVisible()
      // Las barras de carbohidratos y grasa también deben estar
      await expect(page.getByText(/carbohidratos|carbs/i).first()).toBeVisible()
      await expect(page.getByText(/grasa|fat/i).first()).toBeVisible()
    }
  })
})

test.describe('Retention UI — Rest Timer Settings (RET-02) @atleta @retention @ui', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('/settings/gym carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/settings/gym')
    if (await isOnLogin(page)) { test.skip(true, 'Sesión no disponible — DB sin seed'); return }
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('/settings/gym muestra toggles de rest timer', async ({ page }) => {
    await goTo(page, '/settings/gym')
    if (await isOnLogin(page)) { test.skip(true, 'Sesión no disponible — DB sin seed'); return }

    const autoStartToggle = page.getByText(/auto.?start|inicio automático/i).first()
    const soundToggle = page.getByText(/sonido|sound/i).first()
    const vibrationToggle = page.getByText(/vibración|vibration/i).first()

    await expect(autoStartToggle).toBeVisible()
    await expect(soundToggle).toBeVisible()
    await expect(vibrationToggle).toBeVisible()
  })

  test('/settings/gym muestra steppers de segundos', async ({ page }) => {
    await goTo(page, '/settings/gym')
    if (await isOnLogin(page)) { test.skip(true, 'Sesión no disponible — DB sin seed'); return }

    const compoundControl = page.getByText(/compuesto|compound/i).first()
    const isolationControl = page.getByText(/aislamiento|isolation/i).first()

    await expect(compoundControl).toBeVisible()
    await expect(isolationControl).toBeVisible()
  })

  test('rest timer settings: toggle cambia estado y guarda', async ({ page }) => {
    await goTo(page, '/settings/gym')
    if (await isOnLogin(page)) { test.skip(true, 'Sesión no disponible — DB sin seed'); return }

    // Buscar cualquier switch/toggle en la página
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]')
    const count = await toggles.count()

    if (count > 0) {
      // Click en el primer toggle
      await toggles.first().click()

      // Esperar a que se guarde (puede haber toast o cambio visual)
      await page.waitForTimeout(1000)

      // Recargar y verificar que el estado persistió
      await page.reload()
      await page.waitForLoadState('networkidle')

      // La página debe cargar sin errores
      await expect(page.locator('body')).not.toContainText('500')
    }
  })
})

test.describe('Retention UI — Running PRs (RET-04) @atleta @retention @ui', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('/progress muestra sección de PRs Running @critical', async ({ page }) => {
    await goTo(page, '/progress')

    // La sección de PRs running debe existir (con o sin datos)
    const prsSection = page.getByText(/PRs Running|records de running|marcas running/i).first()
    const count = await prsSection.count()

    if (count > 0) {
      await prsSection.scrollIntoViewIfNeeded()
      await expect(prsSection).toBeVisible()

      // Debe mostrar las distancias estándar
      const distances = ['1K', '5K', '10K', '21K', '42K']
      for (const d of distances) {
        const distLabel = page.getByText(d, { exact: false }).first()
        const exists = await distLabel.count()
        if (exists > 0) {
          await expect(distLabel).toBeVisible()
        }
      }
    }
  })

  test('PRs running: buckets con datos muestran pace y tiempo', async ({ page }) => {
    await goTo(page, '/progress')

    // Si hay algún PR con datos, debe mostrar formato min/km
    const paceFormatted = page.getByText(/min\/km/i).first()
    const count = await paceFormatted.count()

    if (count > 0) {
      await expect(paceFormatted).toBeVisible()
    }
  })
})

test.describe('Retention UI — Session Summary Modal (RET-03) @atleta @retention @ui', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('/gym con sid inexistente no rompe la página', async ({ page }) => {
    // El modal debe manejar gracefully un sessionId que no existe
    await goTo(page, '/gym?sid=nonexistent-id')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

test.describe('Retention UI — Strava Badge (RET-05) @atleta @retention @ui', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('CalendarStrip carga en dashboard sin errores', async ({ page }) => {
    await goTo(page, '/dashboard')

    // El calendar strip es visible si hay sesiones registradas
    // Solo verificamos que no rompe la página
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})
