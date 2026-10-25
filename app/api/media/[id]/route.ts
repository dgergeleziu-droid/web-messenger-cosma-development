import { eq } from 'drizzle-orm'
import { dataUrlToResponse } from '@/lib/api'
import { db } from '@/lib/db'
import { messages } from '@/lib/db/schema'
import { getMembership, getSessionUser } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser()
  if (!me) return new Response('Unauthorized', { status: 401 })
  const id = Number((await params).id)
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 })
  const [row] = await db
    .select({ chatId: messages.chatId, mediaData: messages.mediaData, mediaMeta: messages.mediaMeta })
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1)
  if (!row || !(await getMembership(row.chatId, me.id))) return new Response('Not found', { status: 404 })
  return dataUrlToResponse(row.mediaData, row.mediaMeta?.name)
}
