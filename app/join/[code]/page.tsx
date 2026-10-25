import { redirect } from 'next/navigation'
import { joinByInvite } from '@/app/actions/messenger'
import { getSessionUser } from '@/lib/session'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!(await getSessionUser())) redirect(`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`)
  const res = await joinByInvite(code)
  if (res.ok) redirect(`/?chat=${res.data.chatId}`)
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Ссылка недействительна</h1>
      <p className="text-muted-foreground">Приглашение устарело или было отозвано.</p>
      <a href="/" className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground">
        Открыть Cosma
      </a>
    </main>
  )
}
