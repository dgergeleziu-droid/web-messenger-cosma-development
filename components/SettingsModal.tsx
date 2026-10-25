'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsModal({ currentUser, onClose, onUpdate }: { currentUser: any, onClose: () => void, onUpdate: () => void }) {
  const [username, setUsername] = useState(currentUser.username || '')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSave = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.replace('@', ''), phone })
      .eq('id', currentUser.id)

    if (error) {
      setError(error.message)
    } else {
      onUpdate()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-2xl rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Настройки профиля</h2>
        
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Имя пользователя</label>
        <input 
          type="text" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          placeholder="@username"
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" 
        />

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Номер телефона</label>
        <input 
          type="tel" 
          value={phone} 
          onChange={e => setPhone(e.target.value)}
          placeholder="+7 999 000-00-00"
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" 
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button onClick={handleSave} disabled={loading} className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition">
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
