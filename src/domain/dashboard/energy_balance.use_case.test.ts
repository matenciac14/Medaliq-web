import { vi } from 'vitest'
import { computeEnergyBalance, type EnergyBalanceInput } from './energy_balance.use_case'

vi.mock('@/domain/nutrition/daily_target', () => ({
  getDailyNutritionTarget: vi.fn(),
}))

import { getDailyNutritionTarget } from '@/domain/nutrition/daily_target'

const mockGetDailyNutritionTarget = getDailyNutritionTarget as ReturnType<typeof vi.fn>

const basePlan = {
  targetKcalHard: 2800,
  targetKcalEasy: 2400,
  targetKcalRest: 2000,
  proteinG: 160,
  carbsHardG: 320,
  carbsEasyG: 240,
  fatG: 70,
}

const baseInput: EnergyBalanceInput = {
  tdee: 2000,
  nutritionPlan: null,
  foodTotals: { kcal: 1800, proteinG: 150, carbsG: 200, fatG: 60 },
  exerciseCalories: 300,
  todaySession: { completed: true, type: 'GYM', durationMin: 60, caloriesBurned: 300 },
  intensity: null,
  water: { mlLogged: 1500, mlTarget: 2500 },
  weights: { current: 80.0, previous: 79.5 },
  date: '2026-11-09',
}

describe('computeEnergyBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('basic balance calculation', () => {
    it('computes totalBudget = tdee + exerciseCalories', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.totalBudget).toBe(2300)
    })

    it('computes consumed from foodTotals.kcal', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.consumed).toBe(1800)
    })

    it('computes balance = totalBudget - consumed', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.balance).toBe(500)
    })

    it('passes through tdee as tdeeBase', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.tdeeBase).toBe(2000)
    })

    it('passes through exerciseCalories', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.exerciseCalories).toBe(300)
    })

    it('passes through date', () => {
      const result = computeEnergyBalance(baseInput)
      expect(result.date).toBe('2026-11-09')
    })
  })

  describe('macros — with nutritionPlan', () => {
    it('calls getDailyNutritionTarget with intensity and plan', () => {
      mockGetDailyNutritionTarget.mockReturnValue({
        kcal: 2800, proteinG: 160, carbsG: 320, fatG: 70, label: 'Día duro', intensity: 'HIGH',
      })

      computeEnergyBalance({ ...baseInput, nutritionPlan: basePlan, intensity: 'HIGH' })

      expect(mockGetDailyNutritionTarget).toHaveBeenCalledOnce()
      expect(mockGetDailyNutritionTarget).toHaveBeenCalledWith('HIGH', basePlan)
    })

    it('uses returned proteinG/carbsG/fatG as macro targets', () => {
      mockGetDailyNutritionTarget.mockReturnValue({
        kcal: 2800, proteinG: 160, carbsG: 320, fatG: 70, label: 'Día duro', intensity: 'HIGH',
      })

      const result = computeEnergyBalance({ ...baseInput, nutritionPlan: basePlan, intensity: 'HIGH' })

      expect(result.macros.protein.target).toBe(160)
      expect(result.macros.carbs.target).toBe(320)
      expect(result.macros.fat.target).toBe(70)
    })
  })

  describe('macros — without nutritionPlan', () => {
    it('targets are all 0 when nutritionPlan is null', () => {
      const result = computeEnergyBalance({ ...baseInput, nutritionPlan: null })

      expect(result.macros.protein.target).toBe(0)
      expect(result.macros.carbs.target).toBe(0)
      expect(result.macros.fat.target).toBe(0)
      expect(mockGetDailyNutritionTarget).not.toHaveBeenCalled()
    })
  })

  describe('macros current values', () => {
    it('reflects foodTotals macros in current', () => {
      const result = computeEnergyBalance(baseInput)

      expect(result.macros.protein.current).toBe(150)
      expect(result.macros.carbs.current).toBe(200)
      expect(result.macros.fat.current).toBe(60)
    })
  })

  describe('weight trend', () => {
    it('trend is up when diff >= 0.3', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 80.5, previous: 80.0 } })
      expect(result.weight.trend).toBe('up')
      expect(result.weight.weeklyChange).toBe(0.5)
    })

    it('trend is down when diff <= -0.3', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 79.5, previous: 80.0 } })
      expect(result.weight.trend).toBe('down')
      expect(result.weight.weeklyChange).toBe(-0.5)
    })

    it('trend is stable when diff is between -0.3 and 0.3 exclusive', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 80.1, previous: 80.0 } })
      expect(result.weight.trend).toBe('stable')
      expect(result.weight.weeklyChange).toBe(0.1)
    })

    it('trend is stable at boundary diff = 0.2', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 80.2, previous: 80.0 } })
      expect(result.weight.trend).toBe('stable')
    })

    it('weeklyChange and trend are null when current weight is null', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: null, previous: 80.0 } })
      expect(result.weight.weeklyChange).toBeNull()
      expect(result.weight.trend).toBeNull()
    })

    it('weeklyChange and trend are null when previous weight is null', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 80.0, previous: null } })
      expect(result.weight.weeklyChange).toBeNull()
      expect(result.weight.trend).toBeNull()
    })

    it('weeklyChange and trend are null when both weights are null', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: null, previous: null } })
      expect(result.weight.weeklyChange).toBeNull()
      expect(result.weight.trend).toBeNull()
    })

    it('passes through current and previous weight values', () => {
      const result = computeEnergyBalance({ ...baseInput, weights: { current: 80.0, previous: 79.5 } })
      expect(result.weight.current).toBe(80.0)
      expect(result.weight.previous).toBe(79.5)
    })
  })

  describe('foodTotals null', () => {
    it('consumed is 0 when foodTotals is null', () => {
      const result = computeEnergyBalance({ ...baseInput, foodTotals: null })
      expect(result.consumed).toBe(0)
    })

    it('macro currents are all 0 when foodTotals is null', () => {
      const result = computeEnergyBalance({ ...baseInput, foodTotals: null })
      expect(result.macros.protein.current).toBe(0)
      expect(result.macros.carbs.current).toBe(0)
      expect(result.macros.fat.current).toBe(0)
    })

    it('balance equals totalBudget when foodTotals is null', () => {
      const result = computeEnergyBalance({ ...baseInput, foodTotals: null })
      expect(result.balance).toBe(result.totalBudget)
    })
  })

  describe('passthrough fields', () => {
    it('todaySession is passed through as-is', () => {
      const session = { completed: false, type: 'RUN', durationMin: 45, caloriesBurned: 200 }
      const result = computeEnergyBalance({ ...baseInput, todaySession: session })
      expect(result.todaySession).toBe(session)
    })

    it('todaySession null is passed through', () => {
      const result = computeEnergyBalance({ ...baseInput, todaySession: null })
      expect(result.todaySession).toBeNull()
    })

    it('water is passed through as-is', () => {
      const water = { mlLogged: 2000, mlTarget: 3000 }
      const result = computeEnergyBalance({ ...baseInput, water })
      expect(result.water).toBe(water)
    })
  })
})
