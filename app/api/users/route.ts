import { withUser } from '@/lib/api'
import { getContacts, searchUsers } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return withUser((userId) => (q.trim() ? searchUsers(q.slice(0, 64), userId) : getContacts(userId)))
}
