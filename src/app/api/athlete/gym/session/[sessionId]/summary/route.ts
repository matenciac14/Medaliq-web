import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  const athleteId = session?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`web-${athleteId}:gym-summary`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { sessionId } = await params

  const gymSession = await prisma.gymSession.findFirst({
    where: { id: sessionId, athleteId },
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

  if (!gymSession) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const completedWorkSets = gymSession.setLogs.filter(
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

  const newPRs = gymSession.setLogs
    .filter((sl) => sl.isPR && sl.completed)
    .map((sl) => ({
      exerciseName: sl.workoutExercise?.exercise?.name ?? sl.exerciseName ?? 'Ejercicio',
      type: 'weight' as const,
      value: sl.weightKg ?? 0,
      unit: 'kg' as const,
    }))

  const muscleMap = new Map<string, number>()
  for (const sl of completedWorkSets) {
    const muscle = sl.workoutExercise?.exercise?.target ?? 'other'
    muscleMap.set(muscle, (muscleMap.get(muscle) ?? 0) + 1)
  }
  const musclesWorked = Array.from(muscleMap.entries())
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets)

  const caloriesEstimated = gymSession.caloriesBurned === null || gymSession.caloriesBurned === undefined
  const caloriesBurned = caloriesEstimated
    ? Math.round((gymSession.durationMin ?? 0) * 5.0)
    : gymSession.caloriesBurned

  const workoutName = gymSession.assignedWorkout?.template?.name ?? null

  let planContext: string | null = null
  if (gymSession.plannedSession?.week) {
    const { weekNumber, plan, phase } = gymSession.plannedSession.week
    planContext = `Semana ${weekNumber} de ${plan.totalWeeks} — ${phase}`
  }

  return NextResponse.json({
    sessionId: gymSession.id,
    type: 'gym',
    completedAt: gymSession.date.toISOString(),
    durationMin: gymSession.durationMin ?? 0,
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
