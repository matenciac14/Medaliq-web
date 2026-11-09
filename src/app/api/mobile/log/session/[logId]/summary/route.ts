import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

const MET_TABLE: Record<string, number> = {
  RODAJE_Z2: 8.0,
  TEMPO: 10.0,
  INTERVALOS: 12.0,
  FARTLEK: 10.0,
  TIRADA_LARGA: 8.5,
  OTRO: 5.0,
}

function formatPace(paceSecPerKm: number): string {
  const mins = Math.floor(paceSecPerKm / 60)
  const secs = (paceSecPerKm % 60).toString().padStart(2, '0')
  return `${mins}:${secs} min/km`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:session-summary`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { logId } = await params

  const log = await prisma.sessionLog.findFirst({
    where: { id: logId, userId: mobile.id },
    include: {
      plannedSession: {
        include: {
          week: {
            include: {
              plan: { select: { totalWeeks: true } },
            },
          },
        },
      },
    },
  })

  if (!log) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const type = log.discipline === 'RUNNING' ? 'running' : 'free'

  const avgPaceFormatted = log.avgPaceSecPerKm != null ? formatPace(log.avgPaceSecPerKm) : null

  const caloriesEstimated = log.caloriesBurned === null || log.caloriesBurned === undefined
  let caloriesBurned: number | null = log.caloriesBurned ?? null
  if (caloriesEstimated && log.durationMin != null) {
    const sessionTypeKey = log.freeSessionType ?? 'OTRO'
    const met = MET_TABLE[sessionTypeKey] ?? MET_TABLE['OTRO']
    caloriesBurned = Math.round(met * 70 * (log.durationMin / 60))
  }

  const sessionType = log.freeSessionType ?? (log.plannedSession?.type ?? 'OTRO')

  let planContext: string | null = null
  if (log.plannedSession?.week) {
    const { weekNumber, plan, phase } = log.plannedSession.week
    planContext = `Semana ${weekNumber} de ${plan.totalWeeks} — ${phase}`
  }

  return NextResponse.json({
    logId: log.id,
    type,
    completedAt: log.completedAt.toISOString(),
    durationMin: log.durationMin ?? null,
    distanceKm: log.distanceKm ?? null,
    avgPaceSecPerKm: log.avgPaceSecPerKm ?? null,
    avgPaceFormatted,
    caloriesBurned,
    caloriesEstimated,
    rpe: log.rpe ?? null,
    sessionType: String(sessionType),
    planContext,
  })
}
