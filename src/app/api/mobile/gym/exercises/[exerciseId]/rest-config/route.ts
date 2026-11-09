import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-rest-config`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { defaultRestSeconds } = body
  if (
    typeof defaultRestSeconds !== 'number' ||
    !Number.isInteger(defaultRestSeconds) ||
    defaultRestSeconds < 15 ||
    defaultRestSeconds > 600
  ) {
    return NextResponse.json({ error: 'defaultRestSeconds debe ser un entero entre 15 y 600' }, { status: 400 })
  }

  const { exerciseId } = await params
  const userId = mobile.id

  const record = await prisma.exerciseRestConfig.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    update: { defaultRestSeconds },
    create: { userId, exerciseId, defaultRestSeconds },
  })

  return NextResponse.json({ ok: true, defaultRestSeconds: record.defaultRestSeconds })
}
