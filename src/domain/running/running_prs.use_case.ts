import { prisma } from '@/lib/db/prisma'

type RunLog = {
  distanceKm: number | null
  avgPaceSecPerKm: number | null
  durationMin: number | null
  completedAt: Date
  dataSource: string | null
}

type DistanceBucket = '1K' | '5K' | '10K' | '21K' | '42K'

const BUCKETS: { label: DistanceBucket; min: number; max: number; center: number }[] = [
  { label: '1K',  min: 0.9,  max: 1.1,  center: 1    },
  { label: '5K',  min: 4.5,  max: 5.5,  center: 5    },
  { label: '10K', min: 9.5,  max: 10.5, center: 10   },
  { label: '21K', min: 20.5, max: 21.5, center: 21.1 },
  { label: '42K', min: 41.5, max: 42.5, center: 42.2 },
]

function formatPace(secPerKm: number): string {
  const mins = Math.floor(secPerKm / 60)
  const secs = secPerKm % 60
  return `${mins}:${secs.toString().padStart(2, '0')} min/km`
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds < 3600) {
    const mm = Math.floor(totalSeconds / 60)
    const ss = totalSeconds % 60
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
  }
  const h = Math.floor(totalSeconds / 3600)
  const remaining = totalSeconds % 3600
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  return `${h}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}

export type PrEntry = {
  distance: DistanceBucket
  bestPaceSecPerKm: number | null
  bestPaceFormatted: string | null
  bestTimeSeconds: number | null
  bestTimeFormatted: string | null
  achievedAt: string | null
  source: 'MANUAL' | 'STRAVA' | 'HEALTHKIT' | null
}

export async function getRunningPrs(userId: string): Promise<PrEntry[]> {
  const logs = await prisma.sessionLog.findMany({
    where: {
      userId,
      discipline: 'RUNNING',
      distanceKm: { not: null },
    },
    select: {
      distanceKm: true,
      avgPaceSecPerKm: true,
      durationMin: true,
      completedAt: true,
      dataSource: true,
    },
  }) as RunLog[]

  // For each bucket, find the log with the lowest avgPaceSecPerKm
  const bestByBucket = new Map<DistanceBucket, RunLog & { bucket: typeof BUCKETS[number] }>()

  for (const log of logs) {
    if (log.distanceKm === null || log.avgPaceSecPerKm === null) continue

    for (const bucket of BUCKETS) {
      if (log.distanceKm >= bucket.min && log.distanceKm <= bucket.max) {
        const existing = bestByBucket.get(bucket.label)
        if (!existing || log.avgPaceSecPerKm < existing.avgPaceSecPerKm!) {
          bestByBucket.set(bucket.label, { ...log, bucket })
        }
        break // a log can only belong to one bucket
      }
    }
  }

  return BUCKETS.map((bucket) => {
    const best = bestByBucket.get(bucket.label)

    if (!best || best.avgPaceSecPerKm === null) {
      return {
        distance: bucket.label,
        bestPaceSecPerKm: null,
        bestPaceFormatted: null,
        bestTimeSeconds: null,
        bestTimeFormatted: null,
        achievedAt: null,
        source: null,
      }
    }

    const bestTimeSeconds = Math.round(best.avgPaceSecPerKm * bucket.center)

    return {
      distance: bucket.label,
      bestPaceSecPerKm: best.avgPaceSecPerKm,
      bestPaceFormatted: formatPace(best.avgPaceSecPerKm),
      bestTimeSeconds,
      bestTimeFormatted: formatTime(bestTimeSeconds),
      achievedAt: best.completedAt.toISOString(),
      source: (best.dataSource as 'MANUAL' | 'STRAVA' | 'HEALTHKIT' | null) ?? 'MANUAL',
    }
  })
}
