import { NextResponse } from 'next/server'
import { withUser } from '@/lib/api'
import { getUserProfile } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withUser(async () => {
    const profile = await getUserProfile(id)
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return profile
  })
}
