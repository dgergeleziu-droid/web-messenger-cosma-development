'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users')
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ users: 0, messages: 0, chats: 0 })
  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    if (data) setUsers(data)
  }

  const fetchStats = async () => {
    const [u, m, c] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('chats').select('*', { count: 'exact', head: true })
    ])
    setStats({ users: u.count || 0, messages: m.count || 0, chats: c.count || 0 })
  }

  useEffect(() => { fetchUsers(); fetchStats() }, [])

  const updateUser = async (id: string, updates: any) => {
    await supabase.from('profiles').update(updates).eq('id', id)
    fetchUsers()
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 md:p-6" onClick={onClose}>
      <div className="bg-[#0f172a] w-full max-w-4xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Шапка админки */}
        <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-red-500/20 to-purple-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <h2 className="text-xl font-bold text-white">Панель управления</h2>
              <p className="text-xs text-gray-400">Cosma Administration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition">✕</button>
        </div>

        {/* Вкладки */}
        <div className="flex gap-2 p-3 bg-black/20 shrink-0">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
            👥 Пользователи
          </button>
          <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'stats' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
            📊 Статистика
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          
          {activeTab === 'users' && (
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Поиск по имени или @юзернейму..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
              
              <div className="grid gap-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0" style={{ backgroundColor: user.avatar_color || '#2aabee' }}>
                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {user.name} {user.is_premium && '💎'} {user.is_admin && '👑'} {user.is_banned && '🚫'}
                        </div>
                        <div className="text-xs text-gray-400">@{user.username || 'нет'} · ⭐ {user.stars || 0}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateUser(user.id, { stars: (user.stars || 0) + 100 })} className="px-3 py-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg text-xs hover:bg-yellow-500/30 transition">+100 ⭐</button>
                      <button onClick={() => updateUser(user.id, { stars: 0 })} className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs hover:bg-red-500/30 transition">0 ⭐</button>
                      <button onClick={() => updateUser(user.id, { is_premium: !user.is_premium })} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition">{user.is_premium ? 'Снять Premium' : 'Дать Premium'}</button>
                      <button onClick={() => updateUser(user.id, { is_admin: !user.is_admin })} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition">{user.is_admin ? 'Снять админа' : 'Дать админа'}</button>
                      <button onClick={() => updateUser(user.id, { is_banned: !user.is_banned })} className="px-3 py-1.5 bg-gray-500/20 text-gray-300 rounded-lg text-xs hover:bg-gray-500/30 transition">{user.is_banned ? 'Разбанить' : 'Забанить'}</button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && <p className="text-center text-gray-500 py-8">Пользователи не найдены</p>}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-3xl font-bold text-white">{stats.users}</div>
                <div className="text-sm text-blue-300">Пользователей</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl mb-2">💬</div>
                <div className="text-3xl font-bold text-white">{stats.messages}</div>
                <div className="text-sm text-green-300">Сообщений</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl mb-2">🗂️</div>
                <div className="text-3xl font-bold text-white">{stats.chats}</div>
                <div className="text-sm text-purple-300">Чатов</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
