import { Hono } from 'hono'
import { authenticateAdmin } from '@/lib/auth-middleware'
import { getPostsCollection } from '@/lib/mongodb'

/**
 * Dashboard statistics API.
 * Single aggregation by sent date (createdAt): counts by status + period-based stats for trends.
 */

export interface StatsByStatus {
  total: number
  pending: number
  processing: number
  completed: number
  rejected: number
}

export interface StatsByPeriod {
  /** Reports created in the last 7 days (by createdAt) */
  last7Days: number
  /** Reports created between 8 and 14 days ago (for % change) */
  previous7Days: number
  /** Reports created in the last 30 days */
  last30Days: number
  /** Reports created between 31 and 60 days ago (for % change) */
  previous30Days: number
}

export interface DashboardStatsResponse {
  byStatus: StatsByStatus
  byPeriod: StatsByPeriod
  /** Percent change: (last7Days - previous7Days) / previous7Days. Null if no previous data. */
  trend7Days: number | null
  /** Percent change for last 30 days. Null if no previous data. */
  trend30Days: number | null
}

const stats = new Hono()

stats.get('/', authenticateAdmin, async (c) => {
  try {
    const collection = await getPostsCollection()

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const pipeline = [
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: 'value' }],
          last7Days: [
            { $match: { createdAt: { $gte: sevenDaysAgo, $lte: now } } },
            { $count: 'value' },
          ],
          previous7Days: [
            { $match: { createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } } },
            { $count: 'value' },
          ],
          last30Days: [
            { $match: { createdAt: { $gte: thirtyDaysAgo, $lte: now } } },
            { $count: 'value' },
          ],
          previous30Days: [
            { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
            { $count: 'value' },
          ],
        },
      },
    ]

    const result = await collection.aggregate(pipeline).toArray()
    const facet = result[0] ?? {}

    const statusRows = (facet.byStatus ?? []) as { _id: string; count: number }[]
    const byStatus: StatsByStatus = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
    }
    const statusKey = (s: string): keyof StatsByStatus | null =>
      s === 'total' || s === 'pending' || s === 'processing' || s === 'completed' || s === 'rejected' ? s : null
    for (const row of statusRows) {
      const key = statusKey(String(row._id ?? '').toLowerCase())
      if (key) byStatus[key] = row.count
    }
    const totalFromFacet = (facet.total?.[0] as { value: number } | undefined)?.value
    byStatus.total = totalFromFacet ?? (byStatus.pending + byStatus.processing + byStatus.completed + byStatus.rejected)

    const last7 = (facet.last7Days?.[0] as { value: number } | undefined)?.value ?? 0
    const prev7 = (facet.previous7Days?.[0] as { value: number } | undefined)?.value ?? 0
    const last30 = (facet.last30Days?.[0] as { value: number } | undefined)?.value ?? 0
    const prev30 = (facet.previous30Days?.[0] as { value: number } | undefined)?.value ?? 0

    const trend7Days = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null
    const trend30Days = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null

    const response: DashboardStatsResponse = {
      byStatus,
      byPeriod: {
        last7Days: last7,
        previous7Days: prev7,
        last30Days: last30,
        previous30Days: prev30,
      },
      trend7Days,
      trend30Days,
    }

    return c.json({
      result: response,
      result_message: null,
    })
  } catch (err) {
    console.error('Stats API error:', err)
    return c.json(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Failed to load statistics',
        },
      },
      500
    )
  }
})

/** Chart data: daily counts (last 30 days by sent date) and counts by category */
export interface ChartsResponse {
  daily: { date: string; count: number }[]
  byCategory: { category: string; count: number }[]
}

stats.get('/charts', authenticateAdmin, async (c) => {
  try {
    const collection = await getPostsCollection()
    const now = new Date()
    // 30 days including today: start at 00:00 UTC (30 days ago), end at 23:59 UTC today
    const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    const thirtyDaysAgoStart = new Date(startOfTodayUtc - 30 * 24 * 60 * 60 * 1000)
    const nowEnd = new Date(startOfTodayUtc + 24 * 60 * 60 * 1000 - 1)

    const [dailyResult, byCategoryResult] = await Promise.all([
      collection
        .aggregate([
          { $match: { createdAt: { $exists: true, $ne: null } } },
          { $addFields: { _createdAt: { $toDate: '$createdAt' } } },
          { $match: { _createdAt: { $gte: thirtyDaysAgoStart, $lte: nowEnd } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$_createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      collection
        .aggregate([
          { $match: { category: { $exists: true, $nin: [null, ''] } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
    ])

    const dailyMap = new Map<string, number>()
    const startMs = startOfTodayUtc - 30 * 24 * 60 * 60 * 1000
    for (let d = 0; d < 30; d++) {
      const dayMs = startMs + d * 24 * 60 * 60 * 1000
      const key = new Date(dayMs).toISOString().slice(0, 10)
      dailyMap.set(key, 0)
    }
    for (const row of dailyResult as { _id: string; count: number }[]) {
      if (row._id) dailyMap.set(row._id, row.count)
    }
    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }))

    const byCategory = (byCategoryResult as { _id: string; count: number }[]).map((row) => ({
      category: row._id || 'other',
      count: row.count,
    }))

    return c.json({
      result: { daily, byCategory } as ChartsResponse,
      result_message: null,
    })
  } catch (err) {
    console.error('Stats charts API error:', err)
    return c.json(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Failed to load chart data',
        },
      },
      500
    )
  }
})

export default stats
