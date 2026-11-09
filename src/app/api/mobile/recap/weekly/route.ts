import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getWeekMonday } from '@/lib/core/date_utils'

// GET /api/mobile/recap/weekly
// Query: week=current|previous (default: previous), tz=IANA timezone

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:recap-weekly`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const weekParam = req.nextUrl.searchParams.get('week') === 'current' ? 'current' : 'previous'

  try {
    const { weekStart, weekEnd } = getWeekRange(weekParam, tz)
    const { weekStart: prevWeekStart, weekEnd: prevWeekEnd } = getWeekRange('previous', tz, weekParam === 'current' ? 0 : 1)

    const [data, prevData, streak] = await Promise.all([
      fetchWeekData(userId, weekStart, weekEnd),
      fetchWeekData(userId, prevWeekStart, prevWeekEnd),
      computeStreak(userId),
    ])

    const comparison = prevData.sessionsCompleted > 0 || data.sessionsCompleted > 0
      ? {
          sessionsChange: data.sessionsCompleted - prevData.sessionsCompleted,
          avgKcalChange: data.avgKcal !== null && prevData.avgKcal !== null
            ? data.avgKcal - prevData.avgKcal
            : null,
          volumeChange: data.totalVolume !== null && prevData.totalVolume !== null
            ? data.totalVolume - prevData.totalVolume
            : null,
        }
      : null

    return NextResponse.json({
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      sessionsCompleted: data.sessionsCompleted,
      totalDurationMin: data.totalDurationMin,
      totalVolume: data.totalVolume,
      newPRs: data.newPRs,
      avgKcal: data.avgKcal,
      daysLogged: data.daysLogged,
      avgProteinG: data.avgProteinG,
      weightStart: data.weightStart,
      weightEnd: data.weightEnd,
      weightChange: data.weightChange,
      comparison,
      currentStreak: streak,
    })
  } catch (err) {
    console.error('[mobile/recap/weekly]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekRange(
  which: 'current' | 'previous',
  tz?: string,
  extraOffset = 0,
): { weekStart: Date; weekEnd: Date } {
  // 'current' = offset 0, 'previous' = offset -1
  const offset = which === 'current' ? 0 : -1
  const weekStart = getWeekMonday(offset - extraOffset, tz)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}

type WeekData = {
  sessionsCompleted: number
  totalDurationMin: number
  totalVolume: number | null
  newPRs: Array<{ exerciseName: string; type: 'weight'; value: number; unit: 'kg' }>
  avgKcal: number | null
  daysLogged: number
  avgProteinG: number | null
  weightStart: number | null
  weightEnd: number | null
  weightChange: number | null
}

async function fetchWeekData(userId: string, weekStart: Date, weekEnd: Date): Promise<WeekData> {
  const [gymSessions, sessionLogs, foodLogs, checkIns] = await Promise.all([
    prisma.gymSession.findMany({
      where: {
        athleteId: userId,
        completed: true,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: {
        id: true,
        date: true,
        durationMin: true,
        setLogs: {
          where: { completed: true, isPR: true },
          select: { exerciseName: true, weightKg: true },
        },
      },
    }),
    prisma.sessionLog.findMany({
      where: {
        userId,
        completedAt: { gte: weekStart, lte: weekEnd },
      },
      select: { completedAt: true, durationMin: true },
    }),
    prisma.foodLog.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: { date: true, kcalLogged: true, proteinLogged: true },
    }),
    prisma.weeklyCheckIn.findMany({
      where: {
        userId,
        recordedAt: { gte: weekStart, lte: weekEnd },
        weightKg: { not: null },
      },
      select: { weightKg: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
    }),
  ])

  // Unique activity days
  const activityDays = new Set<string>()
  for (const g of gymSessions) activityDays.add(g.date.toISOString().slice(0, 10))
  for (const s of sessionLogs) activityDays.add(s.completedAt.toISOString().slice(0, 10))

  const sessionsCompleted = activityDays.size

  // Total duration
  const gymDuration = gymSessions.reduce((sum, g) => sum + (g.durationMin ?? 0), 0)
  const runDuration = sessionLogs.reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
  const totalDurationMin = gymDuration + runDuration

  // Total volume: sum(weightKg * repsCompleted) from gym set logs
  const gymSessionIds = gymSessions.map((g) => g.id)
  let totalVolume: number | null = null
  if (gymSessionIds.length > 0) {
    // Can't aggregate weightKg*reps directly in Prisma — load completed sets and compute
    const workSets = await prisma.setLog.findMany({
      where: {
        sessionId: { in: gymSessionIds },
        completed: true,
        setLogType: 'WORK',
        weightKg: { not: null },
        repsCompleted: { not: null },
      },
      select: { weightKg: true, repsCompleted: true },
    })
    if (workSets.length > 0) {
      totalVolume = Math.round(
        workSets.reduce((sum, s) => sum + (s.weightKg! * s.repsCompleted!), 0),
      )
    }
  }

  // New PRs (from gym sessions — deduplicated by exercise)
  const prMap = new Map<string, number>()
  for (const session of gymSessions) {
    for (const sl of session.setLogs) {
      if (sl.exerciseName && sl.weightKg) {
        const existing = prMap.get(sl.exerciseName)
        if (!existing || sl.weightKg > existing) {
          prMap.set(sl.exerciseName, sl.weightKg)
        }
      }
    }
  }
  const newPRs = Array.from(prMap.entries()).map(([exerciseName, value]) => ({
    exerciseName,
    type: 'weight' as const,
    value,
    unit: 'kg' as const,
  }))

  // Food logs: avg kcal and protein by day
  let avgKcal: number | null = null
  let avgProteinG: number | null = null
  const kcalByDay = new Map<string, number>()
  const proteinByDay = new Map<string, number>()
  for (const f of foodLogs) {
    const day = f.date instanceof Date
      ? f.date.toISOString().slice(0, 10)
      : String(f.date).slice(0, 10)
    kcalByDay.set(day, (kcalByDay.get(day) ?? 0) + (f.kcalLogged ?? 0))
    proteinByDay.set(day, (proteinByDay.get(day) ?? 0) + (f.proteinLogged ?? 0))
  }
  const daysLogged = kcalByDay.size
  if (daysLogged > 0) {
    const totalKcal = Array.from(kcalByDay.values()).reduce((a, b) => a + b, 0)
    const totalProtein = Array.from(proteinByDay.values()).reduce((a, b) => a + b, 0)
    avgKcal = Math.round(totalKcal / daysLogged)
    avgProteinG = Math.round((totalProtein / daysLogged) * 10) / 10
  }

  // Weight
  const weightStart = checkIns.length > 0 ? checkIns[0].weightKg! : null
  const weightEnd = checkIns.length > 1 ? checkIns[checkIns.length - 1].weightKg! : null
  const weightChange =
    weightStart !== null && weightEnd !== null
      ? Math.round((weightEnd - weightStart) * 10) / 10
      : null

  return {
    sessionsCompleted,
    totalDurationMin,
    totalVolume,
    newPRs,
    avgKcal,
    daysLogged,
    avgProteinG,
    weightStart,
    weightEnd,
    weightChange,
  }
}

async function computeStreak(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [sessionLogs, gymSessions] = await Promise.all([
    prisma.sessionLog.findMany({
      where: { userId, completedAt: { gte: thirtyDaysAgo } },
      select: { completedAt: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: thirtyDaysAgo } },
      select: { date: true },
    }),
  ])

  const activitySet = new Set<string>()
  for (const s of sessionLogs) activitySet.add(utcDayKey(s.completedAt))
  for (const g of gymSessions) activitySet.add(utcDayKey(g.date))

  let streak = 0
  let cursor = startOfDayUTC(new Date())

  while (true) {
    const key = utcDayKey(cursor)
    if (!activitySet.has(key)) {
      // Allow today to be missing (streak can still be active)
      if (streak === 0) {
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
        if (!activitySet.has(utcDayKey(cursor))) break
        streak++
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
        continue
      }
      break
    }
    streak++
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
  }

  return streak
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function utcDayKey(date: Date): string {
  const d = startOfDayUTC(date)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}
