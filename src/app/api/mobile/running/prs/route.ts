import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getRunningPrs } from '@/domain/running/running_prs.use_case'

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimitAsync(`mobile-${user.id}:running-prs`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const prs = await getRunningPrs(user.id)
  return NextResponse.json({ prs })
}
