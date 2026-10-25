'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Profile({ user, onClose }: { user: any, onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="w-[300px] h-full bg-white dark:bg-[#17212b] flex flex-col shadow-2xl">
        <div className="p-4 bg-[#2aabee] text-white">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3" style={{ backgroundColor: user?.avatar_color || '#555' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="font-semibold text-lg">{user?.name || 'Пользователь'}</div>
          <div className="text-sm opacity-80">@{user?.name?.toLowerCase().replace(/\s/g, '_') || 'user'}</div>
        </div>
        <div className="flex-1 p-2">
          <button onClick={onClose} className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-lg text-black dark:text-white">
            Закрыть меню
          </button>
        </div>
        <button onClick={handleLogout} className="p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-left font-medium">
          Выйти из аккаунта
        </button>
      </div>
      <div className="flex-1 bg-black/50" onClick={onClose} />
    </div>
  )
}
