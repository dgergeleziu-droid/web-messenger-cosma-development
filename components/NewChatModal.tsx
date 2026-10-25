'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewChatModal({ currentUser, onClose, onSelectUser }: { currentUser: any, onClose: () => void, onSelectUser: (user: any) => void }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setUsers([])
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .ilike('name', `%${query}%`)
        .limit(10)
      
      if (data) setUsers(data)
    }

    const timer = setTimeout(searchUsers, 300)
    return () => clearTimeout(timer)
  }, [query, currentUser.id, supabase])

  return (
    <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-[#242f3d]">
          <h2 className="font-semibold text-black dark:text-white mb-3">Новое сообщение</h2>
          <input
            autoFocus
            type="text"
            placeholder="Поиск по имени..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-[#242f3d] text-black dark:text-white rounded-xl px-4 py-2 outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 && query && (
            <p className="p-4 text-center text-gray-500">Никого не найдено</p>
          )}
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-[#242f3d] text-left"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.avatar_color || '#2aabee' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="font-medium text-black dark:text-white">{user.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
