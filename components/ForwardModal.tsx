'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForwardModal({ chats, currentUser, messageToForward, onClose, onForwarded }: any) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleForward = async (targetChatId: string) => {
    setLoading(true)
    const newMsgId = crypto.randomUUID()
    
    // Копируем сообщение в новый чат
    await supabase.from('messages').insert({
      id: newMsgId,
      chat_id: targetChatId,
      sender_id: currentUser.id,
      text: messageToForward.text,
      file_url: messageToForward.file_url,
      file_type: messageToForward.file_type,
      gift: messageToForward.gift
    })

    alert('Сообщение переслано!')
    onForwarded()
    onClose()
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Переслать в...</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map((chat: any) => (
            <button key={chat.id} onClick={() => handleForward(chat.id)} disabled={loading}
              className="w-full flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-left transition">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-blue-500 overflow-hidden">
                 {chat.avatar_url ? <img src={chat.avatar_url} className="w-full h-full object-cover" /> : chat.name?.[0]?.toUpperCase()}
              </div>
              <div className="font-medium text-black dark:text-white">{chat.name || 'Без имени'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
