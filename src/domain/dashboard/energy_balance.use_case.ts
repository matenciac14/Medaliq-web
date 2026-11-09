// ---------------------------------------------------------------------------
// energy_balance.use_case.ts — Balance energético diario (pure domain fn)
// ---------------------------------------------------------------------------

import { getDailyNutritionTarget } from '@/domain/nutrition/daily_target'

export type EnergyBalanceInput = {
  tdee: number
  nutritionPlan: {
    targetKcalHard: number
    targetKcalEasy: number
    targetKcalRest: number
    proteinG: number
    carbsHardG: number
    carbsEasyG: number
    fatG: number
  } | null
  foodTotals: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null
  exerciseCalories: number
  todaySession: { completed: boolean; type: string | null; durationMin: number | null; caloriesBurned: number | null } | null
  intensity: string | null
  water: { mlLogged: number; mlTarget: number }
  weights: { current: number | null; previous: number | null }
  date: string
}

export type EnergyBalanceResult = {
  date: string
  tdeeBase: number
  exerciseCalories: number
  totalBudget: number
  consumed: number
  balance: number
  macros: {
    protein: { current: number; target: number }
    carbs: { current: number; target: number }
    fat: { current: number; target: number }
  }
  todaySession: { completed: boolean; type: string | null; durationMin: number | null; caloriesBurned: number | null } | null
  water: { mlLogged: number; mlTarget: number }
  weight: {
    current: number | null
    previous: number | null
    weeklyChange: number | null
    trend: 'up' | 'down' | 'stable' | null
  }
}

function computeWeightTrend(
  current: number | null,
  previous: number | null,
): { weeklyChange: number | null; trend: 'up' | 'down' | 'stable' | null } {
  if (current === null || previous === null) return { weeklyChange: null, trend: null }
  const diff = Math.round((current - previous) * 10) / 10
  const trend: 'up' | 'down' | 'stable' =
    diff >= 0.3 ? 'up' : diff <= -0.3 ? 'down' : 'stable'
  return { weeklyChange: diff, trend }
}

export function computeEnergyBalance(input: EnergyBalanceInput): EnergyBalanceResult {
  const { tdee, nutritionPlan, foodTotals, exerciseCalories, todaySession, intensity, water, weights, date } = input

  const totalBudget = tdee + exerciseCalories
  const consumed = foodTotals?.kcal ?? 0
  const balance = totalBudget - consumed

  let macroTargets = { protein: 0, carbs: 0, fat: 0 }
  if (nutritionPlan) {
    const target = getDailyNutritionTarget(intensity, nutritionPlan)
    macroTargets = { protein: target.proteinG, carbs: target.carbsG, fat: target.fatG }
  }

  const { weeklyChange, trend } = computeWeightTrend(weights.current, weights.previous)

  return {
    date,
    tdeeBase: tdee,
    exerciseCalories,
    totalBudget,
    consumed,
    balance,
    macros: {
      protein: { current: foodTotals?.proteinG ?? 0, target: macroTargets.protein },
      carbs:   { current: foodTotals?.carbsG   ?? 0, target: macroTargets.carbs },
      fat:     { current: foodTotals?.fatG     ?? 0, target: macroTargets.fat },
    },
    todaySession,
    water,
    weight: {
      current:      weights.current,
      previous:     weights.previous,
      weeklyChange,
      trend,
    },
  }
}
