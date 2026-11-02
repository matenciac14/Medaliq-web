import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendCheckinReminderEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

// Cron: domingo 23:00 UTC
// Envia recordatorio a atletas con plan activo que no hicieron check-in esta semana
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lunes 00:00 UTC de esta semana
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Dom
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setUTCHours(0, 0, 0, 0)
  const weekStartUTC = monday

  // Atletas con plan activo
  const activePlanRows = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' },
    select: { userId: true, user: { select: { email: true, name: true, pushToken: true } } },
    distinct: ['userId'],
  })

  // Los que ya hicieron check-in esta semana
  const checkedIn = await prisma.weeklyCheckIn.findMany({
    where: { recordedAt: { gte: weekStartUTC } },
    select: { userId: true },
  })
  const checkedInIds = new Set(checkedIn.map(r => r.userId))

  // Enviar a los que no hicieron check-in
  let sent = 0
  let failed = 0
  for (const row of activePlanRows) {
    if (checkedInIds.has(row.userId)) continue
    try {
      await sendCheckinReminderEmail(row.user.email!, row.user.name ?? 'Atleta')
      sendPushNotification(row.user.pushToken, '¿Cómo fue tu semana? 💪', 'Completa tu check-in semanal en Medaliq.', { screen: 'checkin' }).catch((err) => console.error('[cron/checkin-reminder] sendPushNotification failed:', err))
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}
