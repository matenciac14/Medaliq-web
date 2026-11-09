import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createNotification } from '@/infrastructure/db/notification'
import { getWeekMonday } from '@/lib/core/date_utils'

// Cron: domingo 21:00 UTC
// Envía push con resumen semanal a atletas que tuvieron al menos 1 sesión en la semana
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getWeekMonday(0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const weekStartISO = weekStart.toISOString().slice(0, 10)
  const weekEndISO = weekEnd.toISOString().slice(0, 10)

  let sent = 0
  let skipped = 0
  let cursor: string | undefined

  while (true) {
    const users = await prisma.user.findMany({
      take: 100,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { role: 'ATHLETE' },
      select: { id: true },
    })

    if (users.length === 0) break
    cursor = users[users.length - 1].id

    for (const user of users) {
      const userId = user.id

      // Count completed gym sessions in week range
      const [gymSessions, sessionLogs] = await Promise.all([
        prisma.gymSession.findMany({
          where: {
            athleteId: userId,
            completed: true,
            date: { gte: weekStart, lte: weekEnd },
          },
          select: { id: true, date: true, caloriesBurned: true },
        }),
        prisma.sessionLog.findMany({
          where: {
            userId,
            completedAt: { gte: weekStart, lte: weekEnd },
          },
          select: { completedAt: true, caloriesBurned: true },
        }),
      ])

      // Count unique days with activity
      const activityDays = new Set<string>()
      for (const g of gymSessions) activityDays.add(g.date.toISOString().slice(0, 10))
      for (const s of sessionLogs) activityDays.add(s.completedAt.toISOString().slice(0, 10))

      const sessionsCompleted = activityDays.size

      if (sessionsCompleted === 0) {
        skipped++
        continue
      }

      // Count new PRs from gym sessions this week
      const gymSessionIds = gymSessions.map((g) => g.id)
      const newPRs = gymSessionIds.length > 0
        ? await prisma.setLog.count({
            where: { sessionId: { in: gymSessionIds }, isPR: true },
          })
        : 0

      // Average daily kcal from food logs (only days with logs)
      const foodLogs = await prisma.foodLog.findMany({
        where: {
          userId,
          date: { gte: weekStart, lte: weekEnd },
        },
        select: { date: true, kcalLogged: true },
      })

      let avgKcal: number | null = null
      if (foodLogs.length > 0) {
        const kcalByDay = new Map<string, number>()
        for (const f of foodLogs) {
          const day = f.date instanceof Date
            ? f.date.toISOString().slice(0, 10)
            : String(f.date).slice(0, 10)
          const prev = kcalByDay.get(day) ?? 0
          kcalByDay.set(day, prev + (f.kcalLogged ?? 0))
        }
        if (kcalByDay.size > 0) {
          const total = Array.from(kcalByDay.values()).reduce((a, b) => a + b, 0)
          avgKcal = Math.round(total / kcalByDay.size)
        }
      }

      // Weight change: last check-in of the week minus first
      const checkIns = await prisma.weeklyCheckIn.findMany({
        where: {
          userId,
          recordedAt: { gte: weekStart, lte: weekEnd },
          weightKg: { not: null },
        },
        select: { weightKg: true, recordedAt: true },
        orderBy: { recordedAt: 'asc' },
      })

      let weightChange: number | null = null
      if (checkIns.length >= 2) {
        const first = checkIns[0].weightKg!
        const last = checkIns[checkIns.length - 1].weightKg!
        weightChange = Math.round((last - first) * 10) / 10
      }

      const body = [
        `${sessionsCompleted} sesión${sessionsCompleted !== 1 ? 'es' : ''}`,
        newPRs > 0 ? `${newPRs} PR${newPRs !== 1 ? 's' : ''}` : null,
        avgKcal !== null ? `${avgKcal} kcal/día` : null,
        weightChange !== null
          ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg`
          : null,
      ]
        .filter(Boolean)
        .join(', ')

      await createNotification(userId, 'WEEKLY_RECAP', 'Tu semana en Medaliq', body, {
        metadata: { sessionsCompleted, newPRs, avgKcal, weightChange, weekStart: weekStartISO, weekEnd: weekEndISO },
      }).catch((err) => console.error('[cron/weekly-recap]', err))

      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
