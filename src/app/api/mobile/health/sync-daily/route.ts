import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

const syncDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepHours: z.number().min(0).max(24).optional(),
  restingHR: z.number().int().min(30).max(220).optional(),
  source: z.enum(['HEALTHKIT', 'HEALTH_CONNECT', 'GARMIN', 'STRAVA']),
})

// POST /api/mobile/health/sync-daily
export async function POST(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${user.id}:health-sync`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = syncDailySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { date, sleepHours, restingHR } = parsed.data

  try {
    // Build update payload — only fields present in body
    const update: Record<string, unknown> = {}
    if (sleepHours !== undefined) update.sleepHours = sleepHours
    if (restingHR !== undefined) update.hrResting = restingHR

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    await prisma.dailyLog.upsert({
      where: { userId_date: { userId: user.id, date: new Date(date) } },
      create: { userId: user.id, date: new Date(date), ...update },
      update,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/health/sync-daily]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
