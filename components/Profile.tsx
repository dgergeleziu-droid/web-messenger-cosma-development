'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Profile({ user, onClose, onOpenNewChat, onOpenSettings, onOpenCreateChat, onOpenAdmin, onOpenTheme, onOpenPrivacy }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }

  const gifts = user?.gifts_inventory || []

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="w-[320px] h-full bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl flex flex-col shadow-2xl border-r border-white/20 dark:border-white/10 overflow-y-auto">
        <div className={`p-5 cursor-pointer hover:opacity-90 transition ${user?.is_premium ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-gradient-to-b from-blue-500/20 to-transparent dark:from-blue-900/30'}`} onClick={onOpenSettings}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-md text-white overflow-hidden border-2 border-white/30" style={{ backgroundColor: user?.avatar_color }}>
            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <div className={`font-bold text-lg flex items-center gap-1 ${user?.is_premium ? 'text-white' : 'text-black dark:text-white'}`}>{user?.name} {user?.status_emoji} {user?.is_premium && '💎'}</div>
          <div className={`text-sm ${user?.is_premium ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>{user?.username ? `@${user.username}` : 'Настроить'}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-black/20 dark:bg-black/40 text-white px-2 py-0.5 rounded-full font-bold">⭐ {user?.stars || 0}</span>
            {user?.is_premium && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Premium</span>}
          </div>
        </div>

        <div className="flex-1 py-2">
          {gifts.length > 0 && (
            <div className="px-5 mb-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Коллекция подарков</h3>
              <div className="flex flex-wrap gap-2">
                {gifts.map((gift: any, idx: number) => (
                  <div key={idx} className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center text-xl shadow-sm" title={gift.name}>{gift.emoji}</div>
                ))}
              </div>
            </div>
          )}
          <div className="h-px bg-black/5 dark:bg-white/10 mx-4 my-2" />
          
          <div className="flex items-center justify-between px-5 py-3 hover:bg-black/5 cursor-pointer" onClick={toggleTheme}>
            <div className="flex items-center gap-4"><span className="text-xl">{isDark ? '🌙' : '☀️'}</span><span className="text-[15px] font-medium">Тема</span></div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} /></div>
          </div>
          
          <button onClick={() => { onClose(); onOpenTheme(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">🎨</span><span className="text-[15px] font-medium">Оформление</span></button>
          
          {/* КНОПКА КОНФИДЕНЦИАЛЬНОСТИ В ЛЕВОЙ ПАНЕЛИ */}
          <button onClick={() => { onClose(); onOpenPrivacy(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">🔒</span><span className="text-[15px] font-medium text-black dark:text-white">Конфиденциальность</span></button>

          {user?.is_admin && <button onClick={() => { onClose(); onOpenAdmin(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-red-500/10 text-left"><span className="text-xl">👑</span><span className="text-[15px] font-bold text-red-500">Админ-панель</span></button>}
          <button onClick={() => { onClose(); onOpenCreateChat(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">👥</span><span className="text-[15px] font-medium">Создать группу / канал</span></button>
          <button onClick={onOpenSettings} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">⚙️</span><span className="text-[15px] font-medium">Настройки</span></button>
        </div>

        <div className="mt-auto border-t border-black/5 dark:border-white/10 shrink-0">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-500/10 transition text-left"><span className="text-xl">🚪</span><span className="text-[15px] font-medium">Выйти</span></button>
        </div>
      </div>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    </div>
  )
}
