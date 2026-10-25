import { withUser } from '@/lib/api'
import { getMe } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export function GET() {
  return withUser((userId) => getMe(userId))
}
