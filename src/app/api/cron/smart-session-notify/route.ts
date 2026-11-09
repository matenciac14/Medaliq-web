import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { todayDowInTz } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'

// Cron: cada hora de 6:00 a 20:00 UTC
// Envía push a atletas cuya hora local es 8:00-9:00 AM y tienen sesión hoy
// EFÍMERO — no crea registro en DB (sendPushNotification directo)

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje',
  FARTLEK: 'Fartlek',
  TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA: 'Fuerza',
  TEST: 'Test',
  SIMULACRO: 'Simulacro',
  OTRO: 'Entrenamiento',
}

function isInNotificationWindow(timezone: string | null): boolean {
  const tz = timezone || 'America/Bogota'
  const localHour = parseInt(
    new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }),
  )
  return localHour >= 8 && localHour < 9
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sent = 0
  let skipped = 0
  let cursor: string | undefined

  while (true) {
    const users = await prisma.user.findMany({
      take: 100,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: { role: 'ATHLETE', pushToken: { not: null } },
      select: { id: true, pushToken: true, timezone: true },
    })

    if (users.length === 0) break
    cursor = users[users.length - 1].id

    for (const user of users) {
      if (!user.pushToken) { skipped++; continue }

      // Check local time window
      if (!isInNotificationWindow(user.timezone)) { skipped++; continue }

      const todayDow = todayDowInTz(user.timezone)

      // Check active TrainingPlan → PlannedSession for today
      let sessionType: string | null = null
      let sessionLabel: string | null = null

      const activePlan = await prisma.trainingPlan.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { id: true, startDate: true, totalWeeks: true },
      })

      if (activePlan) {
        const weekNum = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
        const plannedSession = await prisma.plannedSession.findFirst({
          where: {
            dayOfWeek: todayDow,
            week: { planId: activePlan.id, weekNumber: weekNum },
          },
          select: { type: true },
        })
        if (plannedSession && plannedSession.type !== 'DESCANSO') {
          sessionType = plannedSession.type
        }
      }

      // If no plan session, check AssignedWorkout
      if (!sessionType) {
        const assignedWorkout = await prisma.assignedWorkout.findFirst({
          where: { athleteId: user.id, isActive: true },
          select: { template: { select: { days: { where: { dayOfWeek: todayDow }, select: { isRestDay: true } } } } },
        })
        if (assignedWorkout?.template.days[0] && !assignedWorkout.template.days[0].isRestDay) {
          sessionType = 'FUERZA'
        }
      }

      if (!sessionType) { skipped++; continue }

      sessionLabel = SESSION_LABELS[sessionType] ?? 'Entrenamiento'

      // Build contextual message
      let body: string

      if (sessionType === 'FUERZA') {
        // Find last completed gym session with set logs
        const lastGymSession = await prisma.gymSession.findFirst({
          where: { athleteId: user.id, completed: true },
          orderBy: { date: 'desc' },
          select: { setLogs: { orderBy: { weightKg: 'desc' }, take: 1, select: { exerciseName: true, weightKg: true, repsCompleted: true } } },
        })
        const bestSet = lastGymSession?.setLogs[0]
        if (bestSet?.exerciseName && bestSet.weightKg) {
          body = `Hoy toca ${sessionLabel} — tu último ${bestSet.exerciseName} fue ${bestSet.weightKg}kg x ${bestSet.repsCompleted ?? '?'}. ¡Listo?`
        } else {
          body = `Hoy toca ${sessionLabel}. ¡A darle!`
        }
      } else {
        // Running types: find last session log with RUNNING discipline
        const lastRun = await prisma.sessionLog.findFirst({
          where: { userId: user.id, discipline: 'RUNNING' },
          orderBy: { completedAt: 'desc' },
          select: { distanceKm: true, durationMin: true },
        })
        if (lastRun?.distanceKm && lastRun.durationMin) {
          const paceSecPerKm = (lastRun.durationMin * 60) / lastRun.distanceKm
          const paceMin = Math.floor(paceSecPerKm / 60)
          const paceSec = Math.round(paceSecPerKm % 60)
          body = `Hoy toca ${sessionLabel} — tu último rodaje fue ${lastRun.distanceKm.toFixed(1)}km a ${paceMin}:${String(paceSec).padStart(2, '0')}/km. ¡Listo?`
        } else {
          body = `Hoy toca ${sessionLabel}. ¡A darle!`
        }
      }

      sendPushNotification(user.pushToken, 'Sesión de hoy', body, { screen: 'session' }).catch(() => {})
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
