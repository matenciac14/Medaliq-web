import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { fetchEnergyBalanceData, deriveExerciseCalories } from '@/infrastructure/db/energy_balance_queries'
import { computeFoodTotals } from '@/infrastructure/db/dashboard_queries'
import { computeEnergyBalance } from '@/domain/dashboard/energy_balance.use_case'
import { todayInTz } from '@/lib/core/date_utils'

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${user.id}:energy-balance`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = user.id
  const timezone = (user as { timezone?: string }).timezone ?? null

  const data = await fetchEnergyBalanceData(userId, timezone)

  const weightKg = data.userProfile?.profile?.weightKg ?? 70
  const { exerciseCalories, todaySession, intensity } = deriveExerciseCalories(data, weightKg)

  const foodTotals = computeFoodTotals(data.todayFoodLogs)

  const todayStr = todayInTz(timezone).toISOString().slice(0, 10)

  const result = computeEnergyBalance({
    tdee: data.nutritionPlan?.tdee ?? 0,
    nutritionPlan: data.nutritionPlan ? {
      targetKcalHard: data.nutritionPlan.targetKcalHard,
      targetKcalEasy: data.nutritionPlan.targetKcalEasy,
      targetKcalRest: data.nutritionPlan.targetKcalRest,
      proteinG:       data.nutritionPlan.proteinG,
      carbsHardG:     data.nutritionPlan.carbsHardG,
      carbsEasyG:     data.nutritionPlan.carbsEasyG,
      fatG:           data.nutritionPlan.fatG,
    } : null,
    foodTotals,
    exerciseCalories,
    todaySession,
    intensity,
    water: {
      mlLogged: data.waterLog?.mlLogged ?? 0,
      mlTarget: data.nutritionPlan?.waterMlTarget ?? 2000,
    },
    weights: {
      current:  data.recentCheckIns[0]?.weightKg ?? null,
      previous: data.recentCheckIns[1]?.weightKg ?? null,
    },
    date: todayStr,
  })

  return NextResponse.json(result)
}
