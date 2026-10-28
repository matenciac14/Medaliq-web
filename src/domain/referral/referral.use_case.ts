import type { PrismaClient } from '@/generated/prisma/client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CoachReferralSummary {
  code: string
  expiresAt: Date
  redeemedCount: number
  pendingCount: number
}

// ── Generate referral code ────────────────────────────────────────────────────

export async function generateReferralCode(
  prisma: PrismaClient,
  coachId: string,
): Promise<CoachReferralSummary> {
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const code = `REF-${suffix}`
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 días

  await prisma.coachReferral.create({
    data: { referrerId: coachId, code, expiresAt },
  })

  return getReferralSummary(prisma, coachId)
}

// ── Get summary ───────────────────────────────────────────────────────────────

export async function getReferralSummary(
  prisma: PrismaClient,
  coachId: string,
): Promise<CoachReferralSummary> {
  const referrals = await prisma.coachReferral.findMany({
    where: { referrerId: coachId },
    orderBy: { createdAt: 'desc' },
  })

  const latest = referrals[0]
  const now = new Date()

  // Reutilizar el código activo más reciente si existe
  const active = referrals.find(r => !r.redeemedAt && r.expiresAt > now)

  const code = active?.code ?? latest?.code ?? ''
  const expiresAt = active?.expiresAt ?? latest?.expiresAt ?? new Date()
  const redeemedCount = referrals.filter(r => r.redeemedAt).length
  const pendingCount = referrals.filter(r => !r.redeemedAt && r.expiresAt > now).length

  return { code, expiresAt, redeemedCount, pendingCount }
}

// ── Redeem referral code ──────────────────────────────────────────────────────

export type RedeemResult =
  | { ok: true; creditDays: number }
  | { ok: false; error: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED' | 'SELF_REFERRAL' }

export async function redeemReferralCode(
  prisma: PrismaClient,
  code: string,
  newCoachId: string,
): Promise<RedeemResult> {
  const referral = await prisma.coachReferral.findUnique({ where: { code } })

  if (!referral) return { ok: false, error: 'NOT_FOUND' }
  if (referral.redeemedAt) return { ok: false, error: 'ALREADY_USED' }
  if (referral.expiresAt < new Date()) return { ok: false, error: 'EXPIRED' }
  if (referral.referrerId === newCoachId) return { ok: false, error: 'SELF_REFERRAL' }

  const creditDays = referral.creditDays

  // reads FUERA — writes DENTRO ($transaction)
  await prisma.$transaction([
    prisma.coachReferral.update({
      where: { id: referral.id },
      data: { newCoachId, redeemedAt: new Date() },
    }),
    // Extender suscripción del nuevo coach
    prisma.userSubscription.upsert({
      where: { userId: newCoachId },
      update: {
        trialEndsAt: { set: addDays(new Date(), creditDays) },
      },
      create: {
        userId: newCoachId,
        trialEndsAt: addDays(new Date(), creditDays),
      },
    }),
    // Extender suscripción del referidor
    prisma.userSubscription.upsert({
      where: { userId: referral.referrerId },
      update: {
        trialEndsAt: { set: addDays(new Date(), creditDays) },
      },
      create: {
        userId: referral.referrerId,
        trialEndsAt: addDays(new Date(), creditDays),
      },
    }),
  ])

  return { ok: true, creditDays }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
