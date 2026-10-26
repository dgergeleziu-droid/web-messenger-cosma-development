'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewChatModal({ currentUser, onClose, onSelectUser }: { currentUser: any, onClose: () => void, onSelectUser: (user: any) => void }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const searchUsers = async () => {
      // Очищаем строку от @ и пробелов
      const cleanQuery = query.replace('@', '').trim()
      
      if (!cleanQuery) {
        setUsers([])
        return
      }

      setLoading(true)
      
      // Ищем ТОЧНОЕ совпадение по username (eq) или точное совпадение по имени
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .or(`username.eq.${cleanQuery},name.eq.${cleanQuery}`) // Строгое совпадение
        .limit(5)
      
      if (data) {
        setUsers(data)
      }
      setLoading(false)
    }

    // Задержка, чтобы не спамить базу при каждом нажатии клавиши
    const timer = setTimeout(searchUsers, 400)
    return () => clearTimeout(timer)
  }, [query, currentUser.id, supabase])

  return (
    <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/80 dark:bg-[#17212b]/90 border border-white/20 dark:border-white/10 backdrop-blur-2xl rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/20 dark:border-white/10">
          <h2 className="font-bold text-lg text-black dark:text-white mb-3">Новое сообщение</h2>
          <input
            autoFocus
            type="text"
            placeholder="Введите точный @username..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 text-black dark:text-white rounded-xl px-4 py-3 outline-none backdrop-blur-md"
          />
          <p className="text-xs text-gray-500 mt-2">
            Поиск работает только по полному совпадению юзернейма или имени.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="p-4 text-center text-gray-500 animate-pulse">Поиск...</p>}
          
          {!loading && users.length === 0 && query && (
            <p className="p-4 text-center text-gray-500">Пользователь не найден. Введите точный @username.</p>
          )}

          {users.map(user => (
            <button key={user.id} onClick={() => onSelectUser(user)} className="w-full flex items-center gap-3 p-3 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl text-left transition">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden" style={{ backgroundColor: user.avatar_color || '#2aabee' }}>
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-black dark:text-white">{user.name}</div>
                {user.username && <div className="text-xs text-gray-500">@{user.username}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
