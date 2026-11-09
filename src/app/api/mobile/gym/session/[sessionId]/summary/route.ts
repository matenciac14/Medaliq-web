import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-summary`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { sessionId } = await params

  const session = await prisma.gymSession.findFirst({
    where: { id: sessionId, athleteId: mobile.id },
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: {
              exercise: { select: { id: true, name: true, target: true } },
            },
          },
        },
      },
      assignedWorkout: {
        include: {
          template: { select: { name: true } },
        },
      },
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

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const completedWorkSets = session.setLogs.filter(
    (sl) => sl.completed && sl.setLogType === 'WORK'
  )

  const totalVolume = completedWorkSets.reduce((sum, sl) => {
    return sum + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0)
  }, 0)

  const totalSets = completedWorkSets.length

  const exerciseNames = new Set(
    completedWorkSets.map((sl) => sl.workoutExercise?.exercise?.name ?? sl.exerciseName ?? '').filter(Boolean)
  )
  const totalExercises = exerciseNames.size

  const newPRs = session.setLogs
    .filter((sl) => sl.isPR && sl.completed)
    .map((sl) => ({
      exerciseName: sl.workoutExercise?.exercise?.name ?? sl.exerciseName ?? 'Ejercicio',
      type: 'weight' as const,
      value: sl.weightKg ?? 0,
      unit: 'kg' as const,
    }))

  // Group completed sets by muscle target
  const muscleMap = new Map<string, number>()
  for (const sl of completedWorkSets) {
    const muscle = sl.workoutExercise?.exercise?.target ?? 'other'
    muscleMap.set(muscle, (muscleMap.get(muscle) ?? 0) + 1)
  }
  const musclesWorked = Array.from(muscleMap.entries())
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets)

  const caloriesEstimated = session.caloriesBurned === null || session.caloriesBurned === undefined
  const caloriesBurned = caloriesEstimated
    ? Math.round((session.durationMin ?? 0) * 5.0)
    : session.caloriesBurned

  const workoutName = session.assignedWorkout?.template?.name ?? null

  let planContext: string | null = null
  if (session.plannedSession?.week) {
    const { weekNumber, plan } = session.plannedSession.week
    const phase = session.plannedSession.week.phase
    planContext = `Semana ${weekNumber} de ${plan.totalWeeks} — ${phase}`
  }

  return NextResponse.json({
    sessionId: session.id,
    type: 'gym',
    completedAt: session.date.toISOString(),
    durationMin: session.durationMin ?? 0,
    totalVolume,
    totalSets,
    totalExercises,
    newPRs,
    musclesWorked,
    caloriesBurned,
    caloriesEstimated,
    workoutName,
    planContext,
  })
}
