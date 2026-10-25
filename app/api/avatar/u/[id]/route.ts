import { eq } from 'drizzle-orm'
import { dataUrlToResponse } from '@/lib/api'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { getSessionUser } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const [row] = await db.select({ image: user.image }).from(user).where(eq(user.id, id)).limit(1)
  return dataUrlToResponse(row?.image)
}
