'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const GIFTS = [
  { id: 'bear', emoji: '🧸', name: 'Мишка', price: 15 },
  { id: 'rose', emoji: '🌹', name: 'Роза', price: 25 },
  { id: 'rocket', emoji: '🚀', name: 'Ракета', price: 50 },
  { id: 'heart', emoji: '💖', name: 'Сердце', price: 10 },
  { id: 'cake', emoji: '🎂', name: 'Тортик', price: 30 },
  { id: 'ring', emoji: '💍', name: 'Кольцо', price: 100 },
]

export default function GiftModal({ currentUser, chatId, onClose, onGiftSent }: { currentUser: any, chatId: string, onClose: () => void, onGiftSent: () => void }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const sendGift = async (gift: any) => {
    if ((currentUser.stars || 0) < gift.price) {
      alert('Недостаточно звезд! Купите их в профиле.')
      return
    }

    setLoading(true)

    // 1. Списываем звезды у текущего пользователя
    await supabase.from('profiles').update({ stars: currentUser.stars - gift.price }).eq('id', currentUser.id)

    // 2. Отправляем подарок как специальное сообщение
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      text: `Подарил ${gift.name}`,
      gift: gift.emoji
    })

    setLoading(false)
    onGiftSent()
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-white/20 pb-8" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black dark:text-white">Подарки</h2>
          <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 px-3 py-1 rounded-full font-bold text-sm">
            <span>⭐</span> {currentUser.stars || 0}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {GIFTS.map(gift => (
            <button 
              key={gift.id} 
              onClick={() => sendGift(gift)} 
              disabled={loading}
              className="flex flex-col items-center justify-center p-4 bg-white/50 dark:bg-black/30 rounded-2xl border border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-black/50 transition cursor-pointer"
            >
              <span className="text-4xl mb-2">{gift.emoji}</span>
              <span className="text-xs font-semibold text-black dark:text-white mb-1">{gift.name}</span>
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 flex items-center gap-1">⭐ {gift.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
