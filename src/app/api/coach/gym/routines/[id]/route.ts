import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { updateRoutineUseCase } from '@/domain/gym/update_routine.use_case'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'

async function requireCoach() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') return null
  return session
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-routine-detail`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params

  const template = await prisma.workoutTemplate.findFirst({
    where: { id, coachId: session.user.id },
    include: {
      days: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!template) {
    return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params
  const raw = await req.json().catch(() => null)
  const RoutinePatchSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    goal: z.string().optional(),
    level: z.string().optional(),
    daysPerWeek: z.number().int().min(1).max(7),
    days: z.array(z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      label: z.string(),
      muscleGroups: z.array(z.string()),
      isRestDay: z.boolean(),
      warmupNotes: z.string().optional(),
      cardioNotes: z.string().optional(),
      exercises: z.array(z.object({
        exerciseId: z.string(),
        sets: z.number().int().min(1),
        repsScheme: z.string(),
        restSeconds: z.number().int().nullable().optional(),
        setType: z.string().optional(),
        notes: z.string().optional(),
        order: z.number().int(),
        supersetWithOrder: z.number().int().nullable().optional(),
      })),
    })),
  })
  const parsed = parseBody(RoutinePatchSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const result = await updateRoutineUseCase(
      { routineId: id, coachId: session.user.id, ...parsed.data },
      prisma,
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCoach()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-delete`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params

  const template = await prisma.workoutTemplate.findFirst({
    where: { id, coachId: session.user.id },
    select: { id: true },
  })
  if (!template) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })

  // Check if assigned to any athlete
  const assigned = await prisma.assignedWorkout.count({ where: { templateId: id, isActive: true } })
  if (assigned > 0) {
    return NextResponse.json(
      { error: 'Esta rutina está asignada a atletas. Desasígnala primero.' },
      { status: 409 },
    )
  }

  await prisma.$transaction(async (tx) => {
    // Delete exercises, days, then template
    const days = await tx.workoutDay.findMany({ where: { templateId: id }, select: { id: true } })
    const dayIds = days.map(d => d.id)
    if (dayIds.length > 0) {
      await tx.workoutExercise.deleteMany({ where: { dayId: { in: dayIds } } })
      await tx.workoutDay.deleteMany({ where: { templateId: id } })
    }
    await tx.workoutTemplate.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
