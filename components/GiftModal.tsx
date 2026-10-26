'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const GIFTS = [
  { id: 'heart', emoji: '💖', name: 'Сердце', price: 10, premium: false },
  { id: 'bear', emoji: '🧸', name: 'Мишка', price: 15, premium: false },
  { id: 'rose', emoji: '🌹', name: 'Роза', price: 25, premium: false },
  { id: 'cake', emoji: '🎂', name: 'Тортик', price: 30, premium: false },
  { id: 'rocket', emoji: '🚀', name: 'Ракета', price: 50, premium: false },
  { id: 'ring', emoji: '💍', name: 'Кольцо', price: 100, premium: false },
  // Премиум подарки (NFT)
  { id: 'unicorn', emoji: '🦄', name: 'Единорог', price: 150, premium: true },
  { id: 'ufo', emoji: '🛸', name: 'НЛО', price: 200, premium: true },
  { id: 'trophy', emoji: '🏆', name: 'Кубок', price: 250, premium: true },
  { id: 'diamond', emoji: '💎', name: 'Алмаз', price: 500, premium: true },
  { id: 'dragon', emoji: '🐉', name: 'Дракон', price: 1000, premium: true },
]

export default function GiftModal({ currentUser, chatId, receiverId, onClose, onGiftSent }: any) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const sendGift = async (gift: any) => {
    if (gift.premium && !currentUser.is_premium) {
      alert('Этот подарок доступен только с Telegram Premium!')
      return
    }

    setLoading(true)
    const { error } = await supabase.rpc('send_gift', {
      p_chat_id: chatId,
      p_gift: gift.emoji,
      p_price: gift.price,
      p_text: `Подарил ${gift.name}`,
      p_receiver_id: receiverId || null
    })

    if (error) alert('Ошибка: ' + error.message)
    else { onGiftSent(); onClose(); }
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-white/20 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            Подарки <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">NFT</span>
          </h2>
          <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 px-3 py-1 rounded-full font-bold text-sm">
            <span>⭐</span> {currentUser.stars || 0}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {GIFTS.map(gift => (
            <button key={gift.id} onClick={() => sendGift(gift)} disabled={loading}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition ${gift.premium ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50 hover:bg-purple-500/30' : 'bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-black/50'}`}>
              {gift.premium && <span className="absolute top-1 right-1 text-xs">💎</span>}
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
