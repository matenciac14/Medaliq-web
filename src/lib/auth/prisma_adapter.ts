/**
 * Custom Auth.js Prisma Adapter — compatible with Prisma 7.
 * Based on @auth/prisma-adapter but fixes compound unique key syntax.
 * @auth/prisma-adapter@2.11.3 only supports up to Prisma 6.
 */
import type { Adapter } from 'next-auth/adapters'
import type { PrismaClient } from '@/generated/prisma/client'

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value
  }
  return result
}

export function PrismaAdapter(p: PrismaClient): Adapter {
  return {
    createUser: ({ id: _id, ...data }) =>
      // OAuth users (Google) need role selection — Credentials provider never calls createUser
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.user.create({ data: { ...stripUndefined(data), needsRoleSelection: true } as any }),

    getUser: (id) => p.user.findUnique({ where: { id } }),

    getUserByEmail: (email) => p.user.findUnique({ where: { email } }),

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await p.account.findFirst({
        where: { provider, providerAccountId },
        include: { user: true },
      })
      return account?.user ?? null
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateUser: ({ id, ...data }) =>
      p.user.update({ where: { id }, data: stripUndefined(data) as any }),

    deleteUser: (id) => p.user.delete({ where: { id } }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkAccount: (data) => p.account.create({ data: data as any }) as any,

    unlinkAccount: async ({ provider, providerAccountId }) => {
      await p.account.deleteMany({ where: { provider, providerAccountId } })
    },

    async getSessionAndUser(sessionToken) {
      const userAndSession = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!userAndSession) return null
      const { user, ...session } = userAndSession
      return { user, session }
    },

    createSession: (data) => p.session.create({ data: stripUndefined(data) }),

    updateSession: ({ sessionToken, ...data }) =>
      p.session.update({ where: { sessionToken }, data: stripUndefined(data) }),

    deleteSession: (sessionToken) =>
      p.session.delete({ where: { sessionToken } }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createVerificationToken(data) {
      const verificationToken = await p.verificationToken.create({ data: data as any })
      if ('id' in verificationToken) {
        const { id: _, ...rest } = verificationToken as typeof verificationToken & { id: string }
        return rest
      }
      return verificationToken
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await p.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        })
        if ('id' in verificationToken) {
          const { id: _, ...rest } = verificationToken as typeof verificationToken & { id: string }
          return rest
        }
        return verificationToken
      } catch {
        // Token already used or expired
        return null
      }
    },
  }
}
