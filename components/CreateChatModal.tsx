'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CreateChatModal({ currentUser, onClose, onCreated }: { currentUser: any, onClose: () => void, onCreated: (chat: any) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'group' | 'channel' | 'secret'>('group')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleCreate = async () => {
    if (!name.trim() && type !== 'secret') return
    setLoading(true)
    
    const newChatId = crypto.randomUUID()
    const finalName = type === 'secret' ? 'Секретный чат' : name

    const { error: chatError } = await supabase.from('chats').insert({
      id: newChatId,
      type: type,
      name: finalName,
      avatar_color: type === 'secret' ? '#8b5cf6' : '#2aabee'
    }).select().single()

    if (chatError) {
      alert('Ошибка: ' + chatError.message)
      setLoading(false)
      return
    }

    await supabase.from('chat_participants').insert({
      chat_id: newChatId,
      user_id: currentUser.id
    })

    onCreated({ id: newChatId, type, name: finalName, avatar_color: type === 'secret' ? '#8b5cf6' : '#2aabee' })
    onClose()
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-2xl rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Создать</h2>
        
        <div className="flex gap-2 mb-4">
          <button onClick={() => setType('group')} className={`flex-1 py-2 rounded-xl font-medium transition ${type === 'group' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'}`}>Группа</button>
          <button onClick={() => setType('channel')} className={`flex-1 py-2 rounded-xl font-medium transition ${type === 'channel' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'}`}>Канал</button>
          <button onClick={() => setType('secret')} className={`flex-1 py-2 rounded-xl font-medium transition ${type === 'secret' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'}`}>🔒 Секрет</button>
        </div>

        {type !== 'secret' && (
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={type === 'group' ? 'Название группы' : 'Название канала'} className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-3 mb-4 outline-none text-black dark:text-white" />
        )}
        {type === 'secret' && (
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">Сообщения будут автоматически удаляться через 1 минуту.</p>
        )}

        <button onClick={handleCreate} disabled={loading} className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-50">
          {loading ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </div>
  )
}
