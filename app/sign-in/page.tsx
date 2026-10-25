import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/cosma/auth-form'
import { getSessionUser } from '@/lib/session'

export default async function SignInPage() {
  if (await getSessionUser()) redirect('/')
  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  )
}
