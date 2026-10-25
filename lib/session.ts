import 'server-only'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatMembers } from '@/lib/db/schema'

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function getUserId() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

export async function getMembership(chatId: number, userId: string) {
  const [row] = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function requireMembership(chatId: number, userId: string) {
  const m = await getMembership(chatId, userId)
  if (!m) throw new Error('Forbidden')
  return m
}
