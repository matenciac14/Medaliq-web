import { getRunningPrs } from './running_prs.use_case'
import { prisma } from '@/lib/db/prisma'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sessionLog: {
      findMany: vi.fn(),
    },
  },
}))

const mockFindMany = prisma.sessionLog.findMany as ReturnType<typeof vi.fn>

function makeLog(overrides: {
  distanceKm?: number | null
  avgPaceSecPerKm?: number | null
  durationMin?: number | null
  completedAt?: Date
  dataSource?: string | null
}) {
  return {
    distanceKm: 'distanceKm' in overrides ? overrides.distanceKm : 5,
    avgPaceSecPerKm: 'avgPaceSecPerKm' in overrides ? overrides.avgPaceSecPerKm : 300,
    durationMin: overrides.durationMin ?? 25,
    completedAt: overrides.completedAt ?? new Date('2024-01-01T10:00:00Z'),
    dataSource: overrides.dataSource !== undefined ? overrides.dataSource : null,
  }
}

describe('getRunningPrs', () => {
  beforeEach(() => {
    mockFindMany.mockResolvedValue([])
  })

  describe('bucket structure', () => {
    it('always returns all 5 buckets', async () => {
      const result = await getRunningPrs('user-1')
      expect(result).toHaveLength(5)
      expect(result.map((r) => r.distance)).toEqual(['1K', '5K', '10K', '21K', '42K'])
    })

    it('returns null values for all buckets when no logs', async () => {
      const result = await getRunningPrs('user-1')
      for (const entry of result) {
        expect(entry.bestPaceSecPerKm).toBeNull()
        expect(entry.bestPaceFormatted).toBeNull()
        expect(entry.bestTimeSeconds).toBeNull()
        expect(entry.bestTimeFormatted).toBeNull()
        expect(entry.achievedAt).toBeNull()
        expect(entry.source).toBeNull()
      }
    })
  })

  describe('bucket assignment by distance', () => {
    it.each([
      { label: '1K', distance: 1.0 },
      { label: '1K', distance: 0.9 },
      { label: '1K', distance: 1.1 },
      { label: '5K', distance: 5.0 },
      { label: '5K', distance: 4.5 },
      { label: '5K', distance: 5.5 },
      { label: '10K', distance: 10.0 },
      { label: '10K', distance: 9.5 },
      { label: '10K', distance: 10.5 },
      { label: '21K', distance: 21.0 },
      { label: '21K', distance: 20.5 },
      { label: '21K', distance: 21.5 },
      { label: '42K', distance: 42.0 },
      { label: '42K', distance: 41.5 },
      { label: '42K', distance: 42.5 },
    ])('distance $distance km goes into $label bucket', async ({ label, distance }) => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: distance, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      const entry = result.find((r) => r.distance === label)!
      expect(entry.bestPaceSecPerKm).toBe(300)
    })

    it('ignores logs outside all bucket ranges', async () => {
      mockFindMany.mockResolvedValue([
        makeLog({ distanceKm: 2.0, avgPaceSecPerKm: 250 }), // between 1K and 5K — no bucket
        makeLog({ distanceKm: 15.0, avgPaceSecPerKm: 280 }), // between 10K and 21K — no bucket
      ])
      const result = await getRunningPrs('user-1')
      for (const entry of result) {
        expect(entry.bestPaceSecPerKm).toBeNull()
      }
    })

    it('ignores logs with null distanceKm', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: null, avgPaceSecPerKm: 250 })])
      const result = await getRunningPrs('user-1')
      for (const entry of result) {
        expect(entry.bestPaceSecPerKm).toBeNull()
      }
    })

    it('ignores logs with null avgPaceSecPerKm', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: null })])
      const result = await getRunningPrs('user-1')
      const fiveK = result.find((r) => r.distance === '5K')!
      expect(fiveK.bestPaceSecPerKm).toBeNull()
    })
  })

  describe('best log selection', () => {
    it('picks the log with the lowest avgPaceSecPerKm per bucket', async () => {
      mockFindMany.mockResolvedValue([
        makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 320 }),
        makeLog({ distanceKm: 5.1, avgPaceSecPerKm: 280 }), // faster — this one wins
        makeLog({ distanceKm: 4.8, avgPaceSecPerKm: 310 }),
      ])
      const result = await getRunningPrs('user-1')
      const fiveK = result.find((r) => r.distance === '5K')!
      expect(fiveK.bestPaceSecPerKm).toBe(280)
    })

    it('independent bests per bucket', async () => {
      mockFindMany.mockResolvedValue([
        makeLog({ distanceKm: 1.0, avgPaceSecPerKm: 200 }),
        makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 270 }),
      ])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '1K')!.bestPaceSecPerKm).toBe(200)
      expect(result.find((r) => r.distance === '5K')!.bestPaceSecPerKm).toBe(270)
    })
  })

  describe('formatPace', () => {
    it('converts sec/km to M:SS min/km format', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.bestPaceFormatted).toBe('5:00 min/km')
    })

    it('pads seconds with leading zero', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 305 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.bestPaceFormatted).toBe('5:05 min/km')
    })

    it('handles sub-minute pace correctly', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 1.0, avgPaceSecPerKm: 55 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '1K')!.bestPaceFormatted).toBe('0:55 min/km')
    })
  })

  describe('formatTime and bestTimeSeconds', () => {
    it('bestTimeSeconds = avgPaceSecPerKm * bucket.center (rounded)', async () => {
      // 5K center = 5, pace = 300 → 300 * 5 = 1500
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.bestTimeSeconds).toBe(1500)
    })

    it('bestTimeSeconds uses 42K center 42.2 (rounded)', async () => {
      // 42K center = 42.2, pace = 300 → 300 * 42.2 = 12660
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 42.0, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '42K')!.bestTimeSeconds).toBe(12660)
    })

    it('formats time < 3600 as MM:SS', async () => {
      // pace 300 * 5 = 1500s = 25:00
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.bestTimeFormatted).toBe('25:00')
    })

    it('pads MM and SS with leading zeros for sub-hour', async () => {
      // pace 182 * 5 = 910s = 15:10
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 182 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.bestTimeFormatted).toBe('15:10')
    })

    it('formats time >= 3600 as H:MM:SS', async () => {
      // 42K center = 42.2, pace = 300 → 12660s = 3h 31m 0s = 3:31:00
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 42.0, avgPaceSecPerKm: 300 })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '42K')!.bestTimeFormatted).toBe('3:31:00')
    })

    it('formats hours with no leading zero but MM:SS padded', async () => {
      // 21K center = 21.1, pace = 341 → 341 * 21.1 = 7195.1 → 7195s = 1h 59m 55s = 1:59:55
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 21.0, avgPaceSecPerKm: 341 })])
      const result = await getRunningPrs('user-1')
      const halfMarathon = result.find((r) => r.distance === '21K')!
      expect(halfMarathon.bestTimeSeconds).toBe(Math.round(341 * 21.1))
      expect(halfMarathon.bestTimeFormatted).toMatch(/^\d:\d{2}:\d{2}$/)
    })
  })

  describe('source field', () => {
    it('defaults to MANUAL when dataSource is null', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300, dataSource: null })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.source).toBe('MANUAL')
    })

    it('uses dataSource value when present (STRAVA)', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300, dataSource: 'STRAVA' })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.source).toBe('STRAVA')
    })

    it('uses dataSource value when present (HEALTHKIT)', async () => {
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300, dataSource: 'HEALTHKIT' })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.source).toBe('HEALTHKIT')
    })

    it('source is null for empty bucket', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.source).toBeNull()
    })
  })

  describe('achievedAt', () => {
    it('returns completedAt as ISO string', async () => {
      const date = new Date('2024-06-15T08:30:00Z')
      mockFindMany.mockResolvedValue([makeLog({ distanceKm: 5.0, avgPaceSecPerKm: 300, completedAt: date })])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.achievedAt).toBe('2024-06-15T08:30:00.000Z')
    })

    it('achievedAt is null for empty bucket', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await getRunningPrs('user-1')
      expect(result.find((r) => r.distance === '5K')!.achievedAt).toBeNull()
    })
  })
})
