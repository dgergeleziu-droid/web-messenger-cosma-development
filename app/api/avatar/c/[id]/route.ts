import { eq } from 'drizzle-orm'
import { dataUrlToResponse } from '@/lib/api'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { getMembership, getSessionUser } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser()
  if (!me) return new Response('Unauthorized', { status: 401 })
  const chatId = Number((await params).id)
  if (!Number.isInteger(chatId) || !(await getMembership(chatId, me.id))) {
    return new Response('Not found', { status: 404 })
  }
  const [row] = await db.select({ avatar: chats.avatar }).from(chats).where(eq(chats.id, chatId)).limit(1)
  return dataUrlToResponse(row?.avatar)
}
