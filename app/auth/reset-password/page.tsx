'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Supabase автоматически логинит пользователя по ссылке из письма, 
  // поэтому нам просто нужно дать ему сменить пароль
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Ссылка недействительна или устарела. Запросите новую.')
      }
    }
    checkSession()
  }, [supabase])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      alert('Пароль успешно изменен! Теперь вы можете войти.')
      router.push('/auth/login')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#0f172a] dark:to-[#1e1b4b] p-4">
      <form onSubmit={handleUpdate} className="p-8 bg-white/60 dark:bg-[#17212b]/60 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
        <h1 className="text-xl font-bold mb-6 text-center text-black dark:text-white">Новый пароль</h1>
        
        <input
          type="password"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-3 rounded-xl bg-white/50 dark:bg-black/30 text-black dark:text-white outline-none border border-white/30 dark:border-white/10"
          required
        />
        <input
          type="password"
          placeholder="Повторите пароль"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl bg-white/50 dark:bg-black/30 text-black dark:text-white outline-none border border-white/30 dark:border-white/10"
          required
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button type="submit" disabled={loading} className="w-full p-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 shadow-lg">
          {loading ? 'Сохранение...' : 'Сохранить пароль'}
        </button>
      </form>
    </div>
  )
}
