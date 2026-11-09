import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import RestTimerSettingsClient from './_components/RestTimerSettingsClient'

export const metadata = { title: 'Configuración Gym — MedalIQ' }

const DEFAULTS = {
  autoStart: true,
  soundEnabled: true,
  vibrationEnabled: true,
  defaultCompoundSeconds: 120,
  defaultIsolationSeconds: 60,
}

export default async function GymSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/coach/dashboard')

  const record = await prisma.restTimerDefaults.findUnique({
    where: { userId: session.user.id },
    select: {
      autoStart: true,
      soundEnabled: true,
      vibrationEnabled: true,
      defaultCompoundSeconds: true,
      defaultIsolationSeconds: true,
    },
  })

  const defaults = record ?? DEFAULTS

  return <RestTimerSettingsClient defaults={defaults} />
}
