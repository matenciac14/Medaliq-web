// ---------------------------------------------------------------------------
// energy_balance_queries.ts — Parallel DB queries for energy balance endpoints
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db/prisma'
import { todayInTz, getWeekMonday } from '@/lib/core/date_utils'
import { queryTodayFoodLogs } from '@/infrastructure/db/shared_athlete_data'
import { getSessionIntensity } from '@/domain/plan/intensity'

const MET_TABLE: Record<string, number> = {
  FUERZA: 5.0, RODAJE_Z2: 8.0, TEMPO: 10.0, INTERVALOS: 12.0,
  FARTLEK: 10.0, TIRADA_LARGA: 8.5, NATACION: 8.0, CICLA: 7.5, OTRO: 5.0,
}

export function estimateCalories(type: string | null, weightKg: number, durationMin: number | null): number {
  if (!durationMin) return 0
  const met = type ? (MET_TABLE[type] ?? 5.0) : 5.0
  return Math.round(met * weightKg * (durationMin / 60))
}

// ── Daily fetch ─────────────────────────────────────────────────────────────

export async function fetchEnergyBalanceData(userId: string, timezone?: string | null) {
  const todayStart = todayInTz(timezone)

  const [
    nutritionPlan,
    todayFoodLogs,
    waterLog,
    todayGymSession,
    todaySessionLog,
    recentCheckIns,
    userProfile,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    queryTodayFoodLogs(userId, timezone),
    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),
    prisma.gymSession.findFirst({
      where: { athleteId: userId, date: todayStart, completed: true },
      select: {
        durationMin: true,
        caloriesBurned: true,
        plannedSession: { select: { type: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sessionLog.findFirst({
      where: {
        userId,
        completedAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
      },
      select: {
        durationMin: true,
        caloriesBurned: true,
        freeSessionType: true,
        plannedSession: { select: { type: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: { weightKg: true, recordedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { weightKg: true } } },
    }),
  ])

  return {
    nutritionPlan,
    todayFoodLogs,
    waterLog,
    todayGymSession,
    todaySessionLog,
    recentCheckIns,
    userProfile,
  }
}

export type EnergyBalanceData = Awaited<ReturnType<typeof fetchEnergyBalanceData>>

// ── Derive exercise calories from today's sessions ───────────────────────────

export function deriveExerciseCalories(
  data: EnergyBalanceData,
  weightKg: number,
): {
  exerciseCalories: number
  todaySession: { completed: boolean; type: string | null; durationMin: number | null; caloriesBurned: number | null } | null
  intensity: string | null
} {
  const { todayGymSession, todaySessionLog } = data

  // SessionLog (running / plan-based) takes priority
  if (todaySessionLog) {
    const type = todaySessionLog.plannedSession?.type ?? todaySessionLog.freeSessionType ?? null
    const duration = todaySessionLog.durationMin ?? null
    const burned = todaySessionLog.caloriesBurned
      ?? estimateCalories(type, weightKg, duration)
    const intensity = type ? getSessionIntensity(type) : null
    return {
      exerciseCalories: burned,
      todaySession: { completed: true, type, durationMin: duration, caloriesBurned: burned },
      intensity,
    }
  }

  // GymSession fallback
  if (todayGymSession) {
    const type = todayGymSession.plannedSession?.type ?? 'FUERZA'
    const duration = todayGymSession.durationMin ?? null
    const burned = todayGymSession.caloriesBurned
      ?? (duration ? Math.round(duration * 5.0) : 0)
    return {
      exerciseCalories: burned,
      todaySession: { completed: true, type, durationMin: duration, caloriesBurned: burned },
      intensity: 'MODERATE',
    }
  }

  return { exerciseCalories: 0, todaySession: null, intensity: null }
}

// ── Weekly fetch ─────────────────────────────────────────────────────────────

export async function fetchWeeklyEnergyData(userId: string, timezone?: string | null) {
  const monday = getWeekMonday(0, timezone)
  const sunday = new Date(monday.getTime() + 7 * 86400000)

  const [
    nutritionPlan,
    weekFoodLogs,
    weekGymSessions,
    weekSessionLogs,
    recentCheckIns,
    userProfile,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: monday, lt: sunday } },
      select: {
        date: true,
        grams: true,
        kcalLogged: true,
        proteinLogged: true,
        carbsLogged: true,
        fatLogged: true,
        food: { select: { kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, date: { gte: monday, lt: sunday }, completed: true },
      select: {
        date: true,
        durationMin: true,
        caloriesBurned: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.sessionLog.findMany({
      where: {
        userId,
        completedAt: { gte: monday, lt: sunday },
      },
      select: {
        completedAt: true,
        durationMin: true,
        caloriesBurned: true,
        freeSessionType: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: { weightKg: true, recordedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { weightKg: true } } },
    }),
  ])

  return {
    monday,
    nutritionPlan,
    weekFoodLogs,
    weekGymSessions,
    weekSessionLogs,
    recentCheckIns,
    userProfile,
  }
}

export type WeeklyEnergyData = Awaited<ReturnType<typeof fetchWeeklyEnergyData>>
