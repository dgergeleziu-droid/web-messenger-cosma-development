'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Profile({ user, onClose, onOpenNewChat }: { user: any, onClose: () => void, onOpenNewChat: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  // Проверяем текущую тему при загрузке
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Переключатель темы
  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Само меню (Стекло) */}
      <div className="w-[320px] h-full bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl flex flex-col shadow-2xl border-r border-white/20 dark:border-white/10 relative">
        
        {/* Шапка с профилем */}
        <div className="p-5 bg-gradient-to-b from-blue-500/20 to-transparent dark:from-blue-900/30 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition" onClick={onClose}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-md border border-white/30 text-white" style={{ backgroundColor: user?.avatar_color || '#2aabee' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="font-bold text-lg text-black dark:text-white">{user?.name || 'Пользователь'}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">@{user?.name?.toLowerCase().replace(/\s/g, '_') || 'user'}</div>
        </div>

        {/* Пункты меню */}
        <div className="flex-1 overflow-y-auto py-2">
          
          {/* Ночной режим */}
          <div className="flex items-center justify-between px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" onClick={toggleTheme}>
            <div className="flex items-center gap-4">
              <span className="text-xl">{isDark ? '🌙' : '☀️'}</span>
              <span className="text-[15px] font-medium text-black dark:text-white">{isDark ? 'Тёмная тема' : 'Светлая тема'}</span>
            </div>
            {/* Красивый переключатель */}
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/10 mx-4 my-1" />

          {/* Новая группа */}
          <button className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-left">
            <span className="text-xl">👥</span>
            <span className="text-[15px] font-medium text-black dark:text-white">Новая группа</span>
          </button>

          {/* Контакты (открывает поиск) */}
          <button onClick={() => { onClose(); onOpenNewChat(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-left">
            <span className="text-xl">📞</span>
            <span className="text-[15px] font-medium text-black dark:text-white">Контакты</span>
          </button>

          {/* Сохраненные */}
          <button className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-left">
            <span className="text-xl">📁</span>
            <span className="text-[15px] font-medium text-black dark:text-white">Сохранённые</span>
          </button>

          {/* Настройки */}
          <button className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-left">
            <span className="text-xl">⚙️</span>
            <span className="text-[15px] font-medium text-black dark:text-white">Настройки</span>
          </button>

        </div>

        {/* Подвал */}
        <div className="mt-auto border-t border-black/5 dark:border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-500/10 transition text-left">
            <span className="text-xl">🚪</span>
            <span className="text-[15px] font-medium">Выйти</span>
          </button>
          <div className="text-center text-xs text-gray-400 pb-3">
            Cosma v1.0.0
          </div>
        </div>
      </div>

      {/* Затемнение фона (клик по нему закрывает меню) */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    </div>
  )
}
