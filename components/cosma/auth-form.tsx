'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

function Field({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        className="peer h-14 w-full rounded-xl border border-input bg-transparent px-4 pt-3 text-base outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-background px-1 text-muted-foreground transition-all peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs"
      >
        {label}
      </label>
    </div>
  )
}

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = isSignUp
      ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      : await authClient.signIn.email({ email: email.trim(), password })
    setLoading(false)
    if (res.error) {
      setError(
        isSignUp
          ? 'Не удалось создать аккаунт. Проверьте данные или используйте другой email.'
          : 'Неверный email или пароль.',
      )
      return
    }
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
    router.replace(target)
    router.refresh()
  }

  const query = next ? `?next=${encodeURIComponent(next)}` : ''

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 pt-safe pb-safe">
      <div className="flex w-full max-w-sm flex-col items-center">
        <Image
          src="/icon-512.png"
          alt="Логотип Cosma"
          width={140}
          height={140}
          priority
          className="mb-8 size-32 rounded-full shadow-lg"
        />
        <h1 className="text-balance text-3xl font-semibold">{isSignUp ? 'Регистрация в Cosma' : 'Вход в Cosma'}</h1>
        <p className="mb-8 mt-3 text-pretty text-center text-muted-foreground">
          {isSignUp
            ? 'Укажите имя, email и придумайте пароль.'
            : 'Войдите, чтобы продолжить общение.'}
        </p>
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
          {isSignUp && (
            <Field
              id="name"
              label="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
              autoComplete="name"
            />
          )}
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
          />
          <div className="relative">
            <Field
              id="password"
              label="Пароль"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex h-14 items-center justify-center rounded-xl bg-primary text-base font-medium uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : isSignUp ? 'Создать аккаунт' : 'Далее'}
          </button>
        </form>
        <p className="mt-8 text-sm text-muted-foreground">
          {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
          <Link href={(isSignUp ? '/sign-in' : '/sign-up') + query} className="font-medium text-primary">
            {isSignUp ? 'Войти' : 'Зарегистрироваться'}
          </Link>
        </p>
      </div>
    </main>
  )
}
