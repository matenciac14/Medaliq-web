import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

const DEFAULTS = {
  autoStart: true,
  soundEnabled: true,
  vibrationEnabled: true,
  defaultCompoundSeconds: 120,
  defaultIsolationSeconds: 60,
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-rest-defaults`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const record = await prisma.restTimerDefaults.findUnique({
    where: { userId: mobile.id },
  })

  return NextResponse.json(record ?? DEFAULTS)
}

export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-rest-defaults`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { autoStart, soundEnabled, vibrationEnabled, defaultCompoundSeconds, defaultIsolationSeconds } = body

  if (autoStart !== undefined && typeof autoStart !== 'boolean') {
    return NextResponse.json({ error: 'autoStart debe ser boolean' }, { status: 400 })
  }
  if (soundEnabled !== undefined && typeof soundEnabled !== 'boolean') {
    return NextResponse.json({ error: 'soundEnabled debe ser boolean' }, { status: 400 })
  }
  if (vibrationEnabled !== undefined && typeof vibrationEnabled !== 'boolean') {
    return NextResponse.json({ error: 'vibrationEnabled debe ser boolean' }, { status: 400 })
  }
  if (defaultCompoundSeconds !== undefined) {
    if (
      typeof defaultCompoundSeconds !== 'number' ||
      !Number.isInteger(defaultCompoundSeconds) ||
      defaultCompoundSeconds < 15 ||
      defaultCompoundSeconds > 600
    ) {
      return NextResponse.json({ error: 'defaultCompoundSeconds debe ser un entero entre 15 y 600' }, { status: 400 })
    }
  }
  if (defaultIsolationSeconds !== undefined) {
    if (
      typeof defaultIsolationSeconds !== 'number' ||
      !Number.isInteger(defaultIsolationSeconds) ||
      defaultIsolationSeconds < 15 ||
      defaultIsolationSeconds > 600
    ) {
      return NextResponse.json({ error: 'defaultIsolationSeconds debe ser un entero entre 15 y 600' }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}
  if (autoStart !== undefined) data.autoStart = autoStart
  if (soundEnabled !== undefined) data.soundEnabled = soundEnabled
  if (vibrationEnabled !== undefined) data.vibrationEnabled = vibrationEnabled
  if (defaultCompoundSeconds !== undefined) data.defaultCompoundSeconds = defaultCompoundSeconds
  if (defaultIsolationSeconds !== undefined) data.defaultIsolationSeconds = defaultIsolationSeconds

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No hay campos a actualizar' }, { status: 400 })
  }

  const userId = mobile.id

  const record = await prisma.restTimerDefaults.upsert({
    where: { userId },
    update: data,
    create: { userId, ...DEFAULTS, ...data },
  })

  return NextResponse.json(record)
}
