import { withUser } from '@/lib/api'
import { getChatList, touchLastSeen } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export function GET() {
  return withUser(async (userId) => {
    await touchLastSeen(userId)
    return getChatList(userId)
  })
}
