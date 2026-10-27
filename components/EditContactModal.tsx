'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EditContactModal({ currentUser, targetUser, onClose, onSaved }: any) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)

    const { error } = await supabase.from('local_contacts').upsert({
      owner_id: currentUser.id,
      contact_id: targetUser.id,
      custom_name: name.trim()
    })

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white text-center">Имя контакта</h2>
        
        <p className="text-xs text-gray-500 text-center mb-4">
          Это имя будет видно только вам. Для собеседника ничего не изменится.
        </p>

        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="Введите имя..." 
          autoFocus
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-3 mb-4 outline-none text-black dark:text-white text-center text-lg font-medium" 
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-gray-200 dark:bg-white/10 text-black dark:text-white rounded-xl py-2 font-semibold hover:bg-gray-300 transition">
            Отмена
          </button>
          <button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1 bg-blue-500 text-white rounded-xl py-2 font-semibold hover:bg-blue-600 transition disabled:opacity-50">
            {loading ? '...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
