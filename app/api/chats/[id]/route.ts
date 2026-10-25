import { NextResponse } from 'next/server'
import { withUser } from '@/lib/api'
import { getChatDetails } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chatId = Number(id)
  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 100)
  return withUser(async (userId) => {
    if (!Number.isInteger(chatId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
    const details = await getChatDetails(chatId, userId, Number.isFinite(limit) ? limit : 100)
    if (!details) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return details
  })
}
