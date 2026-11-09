import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { fetchWeeklyEnergyData, estimateCalories } from '@/infrastructure/db/energy_balance_queries'
import { getSessionIntensity } from '@/domain/plan/intensity'

type DayBalance = {
  date: string         // YYYY-MM-DD
  dow: number          // 1=Mon…7=Sun
  tdeeBase: number
  exerciseCalories: number
  totalBudget: number
  consumed: number
  balance: number
  hasData: boolean     // at least 1 FoodLog
}

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${user.id}:energy-balance-weekly`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = user.id
  const timezone = (user as { timezone?: string }).timezone ?? null

  const data = await fetchWeeklyEnergyData(userId, timezone)
  const { monday, nutritionPlan, weekFoodLogs, weekGymSessions, weekSessionLogs, recentCheckIns } = data

  const weightKg = data.userProfile?.profile?.weightKg ?? 70
  const tdee = nutritionPlan?.tdee ?? 0

  // ── Build date -> YYYY-MM-DD map for the 7 days Mon-Sun ──────────────────
  const days: DayBalance[] = []
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday.getTime() + i * 86400000)
    const dateStr = dayDate.toISOString().slice(0, 10)

    // Food logs for this day
    const dayFoodLogs = weekFoodLogs.filter(fl => fl.date.toISOString().slice(0, 10) === dateStr)
    const consumed = dayFoodLogs.length > 0
      ? dayFoodLogs.reduce((sum, fl) => {
          const r = fl.grams / 100
          return sum + Math.round(fl.kcalLogged ?? (fl.food.kcalPer100g * r))
        }, 0)
      : 0

    // Exercise calories — SessionLog first, GymSession fallback
    let exerciseCalories = 0
    const sessionLog = weekSessionLogs.find(sl => sl.completedAt.toISOString().slice(0, 10) === dateStr)
    if (sessionLog) {
      const type = sessionLog.plannedSession?.type ?? sessionLog.freeSessionType ?? null
      exerciseCalories = sessionLog.caloriesBurned
        ?? estimateCalories(type, weightKg, sessionLog.durationMin ?? null)
    } else {
      const gymSession = weekGymSessions.find(gs => gs.date.toISOString().slice(0, 10) === dateStr)
      if (gymSession) {
        exerciseCalories = gymSession.caloriesBurned
          ?? (gymSession.durationMin ? Math.round(gymSession.durationMin * 5.0) : 0)
      }
    }

    const totalBudget = tdee + exerciseCalories
    const balance = totalBudget - consumed

    days.push({
      date: dateStr,
      dow: i + 1, // 1=Mon…7=Sun
      tdeeBase: tdee,
      exerciseCalories,
      totalBudget,
      consumed,
      balance,
      hasData: dayFoodLogs.length > 0,
    })
  }

  // ── Averages (only days with at least 1 FoodLog) ─────────────────────────
  const daysWithData = days.filter(d => d.hasData)
  const avgConsumed = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.consumed, 0) / daysWithData.length)
    : null
  const avgBalance = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.balance, 0) / daysWithData.length)
    : null
  const avgExerciseCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.exerciseCalories, 0) / daysWithData.length)
    : null

  // ── Weight change (last 2 check-ins) ────────────────────────────────────
  const weightCurrent  = recentCheckIns[0]?.weightKg ?? null
  const weightPrevious = recentCheckIns[1]?.weightKg ?? null
  const weeklyWeightChange = weightCurrent !== null && weightPrevious !== null
    ? Math.round((weightCurrent - weightPrevious) * 10) / 10
    : null

  return NextResponse.json({
    weekStart: monday.toISOString().slice(0, 10),
    tdeeBase: tdee,
    days,
    summary: {
      avgConsumed,
      avgBalance,
      avgExerciseCalories,
      daysTracked: daysWithData.length,
    },
    weight: {
      current:      weightCurrent,
      previous:     weightPrevious,
      weeklyChange: weeklyWeightChange,
      trend: weeklyWeightChange === null ? null
        : weeklyWeightChange >= 0.3 ? 'up'
        : weeklyWeightChange <= -0.3 ? 'down'
        : 'stable',
    },
  })
}
