'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Успех! Теперь вы можете войти.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#e6ebee] dark:bg-[#0e1621] p-4">
      <form onSubmit={handleSignUp} className="p-8 bg-white dark:bg-[#17212b] rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">Регистрация в Cosma</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-3 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-black dark:text-white outline-none"
          required
        />
        <input
          type="password"
          placeholder="Пароль (минимум 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-black dark:text-white outline-none"
          required
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-500 text-sm mb-3">{message}</p>}
        <button type="submit" className="w-full p-3 bg-[#2aabee] text-white rounded-xl font-semibold hover:opacity-90 transition">
          Зарегистрироваться
        </button>
        <p className="text-sm text-center mt-4 text-gray-500">
          Уже есть аккаунт? <Link href="/auth/login" className="text-[#2aabee] hover:underline">Войти</Link>
        </p>
      </form>
    </div>
  )
}
