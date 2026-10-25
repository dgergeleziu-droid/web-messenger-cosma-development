import { redirect } from 'next/navigation'
import { Messenger } from '@/components/cosma/messenger'
import { getMe } from '@/lib/queries'
import { getSessionUser } from '@/lib/session'

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  const me = await getMe(user.id)
  if (!me) redirect('/sign-in')
  return <Messenger initialMe={me} />
}
