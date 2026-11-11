import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/mobile/health/status
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${user.id}:health-status`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  try {
    // WearableConnection exists in schema — query it directly
    const connections = await prisma.wearableConnection.findMany({
      where: { userId: user.id },
      select: { provider: true, updatedAt: true },
    })

    // Also check SessionLog dataSource for passive providers (HealthKit / Health Connect)
    const passiveSources = await prisma.sessionLog.findMany({
      where: {
        userId: user.id,
        dataSource: { in: ['HEALTHKIT', 'HEALTH_CONNECT'] },
      },
      select: { dataSource: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
      distinct: ['dataSource'],
    })

    const providers: Array<{ provider: string; lastSyncAt: string; source: string }> = connections.map((c) => ({
      provider: c.provider,
      lastSyncAt: c.updatedAt.toISOString(),
      source: 'wearable_connection',
    }))

    // Add passive sources not already covered by WearableConnection
    const connectedProviders = new Set(connections.map((c) => c.provider.toUpperCase()))
    for (const s of passiveSources) {
      if (s.dataSource && !connectedProviders.has(s.dataSource)) {
        providers.push({
          provider: s.dataSource,
          lastSyncAt: s.completedAt.toISOString(),
          source: 'session_log',
        })
      }
    }

    const lastSync = providers.length > 0
      ? providers.reduce((latest, p) => p.lastSyncAt > latest ? p.lastSyncAt : latest, providers[0].lastSyncAt)
      : null

    return NextResponse.json({
      providers,
      lastSync,
      hasHealthKit: providers.some((p) => p.provider.toUpperCase() === 'HEALTHKIT'),
      hasHealthConnect: providers.some((p) => p.provider.toUpperCase() === 'HEALTH_CONNECT'),
    })
  } catch (err) {
    console.error('[mobile/health/status]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
