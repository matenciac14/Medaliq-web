import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getRunningPrs } from '@/domain/running/running_prs.use_case'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${session.user.id}:running-prs`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const prs = await getRunningPrs(session.user.id)
  return NextResponse.json({ prs })
}
