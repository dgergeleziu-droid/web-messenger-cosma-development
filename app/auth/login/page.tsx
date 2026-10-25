'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#0f172a] dark:to-[#1e1b4b] p-4">
      <form onSubmit={handleLogin} className="p-8 bg-white/60 dark:bg-[#17212b]/60 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
        <h1 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">Вход в Cosma</h1>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-3 rounded-xl bg-white/50 dark:bg-black/30 text-black dark:text-white outline-none border border-white/30 dark:border-white/10"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-2 rounded-xl bg-white/50 dark:bg-black/30 text-black dark:text-white outline-none border border-white/30 dark:border-white/10"
          required
        />

        {/* Ссылка на восстановление */}
        <div className="flex justify-end mb-4">
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Забыли пароль?
          </Link>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        
        <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-lg">
          Войти
        </button>
        
        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Нет аккаунта? <Link href="/auth/sign-up" className="text-blue-600 dark:text-blue-400 hover:underline">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  )
}
