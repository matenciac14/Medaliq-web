import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { generateReferralCode, getReferralSummary } from '@/domain/referral/referral.use_case'

// GET — obtener código activo + stats
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:referral-get`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const summary = await getReferralSummary(prisma, session.user.id)
  return NextResponse.json({ referral: summary })
}

// POST — generar nuevo código
export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:referral-post`, { limit: 5, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const summary = await generateReferralCode(prisma, session.user.id)
  return NextResponse.json({ referral: summary })
}
