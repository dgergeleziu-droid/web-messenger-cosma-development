'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Отправляем письмо. window.location.origin автоматически подставит твой домен
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Письмо отправлено! Проверьте вашу почту (и папку "Спам").')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#0f172a] dark:to-[#1e1b4b] p-4">
      <form onSubmit={handleReset} className="p-8 bg-white/60 dark:bg-[#17212b]/60 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
        <h1 className="text-xl font-bold mb-2 text-center text-black dark:text-white">Восстановление пароля</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">Введите почту, указанную при регистрации.</p>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl bg-white/50 dark:bg-black/30 text-black dark:text-white outline-none border border-white/30 dark:border-white/10"
          required
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-600 dark:text-green-400 text-sm mb-3">{message}</p>}

        <button type="submit" disabled={loading} className="w-full p-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 shadow-lg">
          {loading ? 'Отправка...' : 'Отправить ссылку'}
        </button>

        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">Вернуться ко входу</Link>
        </p>
      </form>
    </div>
  )
}
