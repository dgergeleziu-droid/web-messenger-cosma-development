'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([])
  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    if (data) setUsers(data)
  }
  useEffect(() => { fetchUsers() }, [])

  const updateUser = async (id: string, updates: any) => {
    await supabase.from('profiles').update(updates).eq('id', id)
    fetchUsers()
  }

  return (
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-white/20 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-bold text-red-500">👑 Админ-панель Cosma</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/90 dark:bg-[#17212b]/90 backdrop-blur-md">
              <tr><th className="pb-2">Пользователь</th><th className="pb-2">⭐</th><th className="pb-2">Статус</th><th className="pb-2 text-right">Действия</th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="py-3 font-medium max-w-[150px] truncate">{user.name} <br/><span className="text-xs text-gray-400">@{user.username || 'нет'}</span></td>
                  <td className="py-3 text-yellow-500 font-bold">{user.stars || 0}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1">
                      {user.is_admin && <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs w-max">Админ</span>}
                      {user.is_premium && <span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-xs w-max">Premium</span>}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1 justify-end">
                      <button onClick={() => updateUser(user.id, { stars: (user.stars || 0) + 100 })} className="bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs">+100⭐</button>
                      <button onClick={() => updateUser(user.id, { stars: 0 })} className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs">0⭐</button>
                      <button onClick={() => updateUser(user.id, { is_premium: !user.is_premium })} className="bg-purple-500/20 text-purple-600 px-2 py-1 rounded text-xs">Premium</button>
                      <button onClick={() => updateUser(user.id, { is_admin: !user.is_admin })} className="bg-gray-500/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">{user.is_admin ? 'Снять админа' : 'Дать админа'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
