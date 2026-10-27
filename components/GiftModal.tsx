'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GiftModal({ currentUser, chatId, receiverId, onClose, onGiftSent }: any) {
  const [gifts, setGifts] = useState<any[]>([])
  const [selectedGift, setSelectedGift] = useState<any>(null)
  const [upgrade, setUpgrade] = useState(false) // улучшить перед отправкой
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Загружаем каталог
  useEffect(() => {
    const fetchGifts = async () => {
      const { data } = await supabase.from('gift_catalog').select('*').order('base_price')
      if (data) setGifts(data)
    }
    fetchGifts()
  }, [])

  const sendGift = async () => {
    if (!selectedGift) return
    setLoading(true)

    // Стоимость: базовая цена + стоимость улучшения (25 звёзд, если выбрано)
    const upgradeCost = upgrade ? 25 : 0
    const totalCost = selectedGift.base_price + upgradeCost

    if ((currentUser.stars || 0) < totalCost) {
      alert('Недостаточно звёзд!')
      setLoading(false)
      return
    }

    // 1. Списываем звёзды
    await supabase.from('profiles').update({ stars: currentUser.stars - totalCost }).eq('id', currentUser.id)

    // 2. Если улучшение — генерируем случайные атрибуты (модель, фон, символ, номер)
    let attributes: any = {}
    if (upgrade) {
      attributes = {
        model: ['gold', 'silver', 'bronze', 'platinum'][Math.floor(Math.random() * 4)],
        backdrop: ['stars', 'gradient', 'solid'][Math.floor(Math.random() * 3)],
        symbol: ['sparkle', 'crown', 'heart'][Math.floor(Math.random() * 3)],
        serial_number: Math.floor(Math.random() * 10000) + 1,
        rarity_score: Math.floor(Math.random() * 1000) + 1, // 1-1000, чем меньше — тем реже
        rarity_tier: 'uncommon', // упрощённо
        upgraded_at: new Date().toISOString(),
      }
    }

    // 3. Создаём запись в инвентаре получателя
    const { data: newGift, error } = await supabase.from('user_gifts').insert({
      user_id: receiverId,
      gift_id: selectedGift.id,
      ...attributes,
    }).select().single()

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      // 4. Отправляем сообщение в чат (с gift_id или эмодзи)
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUser.id,
        text: `Подарил ${selectedGift.name}${upgrade ? ' (улучшенный)' : ''}`,
        gift: selectedGift.emoji,
        // можно добавить gift_id в сообщение, если нужно
      })
      onGiftSent()
      onClose()
    }
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

        <div className="grid grid-cols-3 gap-3 mb-4">
          {gifts.map(gift => (
            <button key={gift.id} onClick={() => setSelectedGift(gift)}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition ${selectedGift?.id === gift.id ? 'border-blue-500 bg-blue-500/20' : 'border-white/30 bg-white/50 dark:bg-black/30 hover:bg-white/80'}`}>
              {gift.is_limited && <span className="absolute top-1 right-1 text-xs">💎</span>}
              <span className="text-4xl mb-2">{gift.emoji}</span>
              <span className="text-xs font-semibold text-black dark:text-white mb-1">{gift.name}</span>
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 flex items-center gap-1">⭐ {gift.base_price}</span>
            </button>
          ))}
        </div>

        {selectedGift && (
          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={upgrade} onChange={e => setUpgrade(e.target.checked)} className="w-5 h-5 accent-blue-500" />
              <div>
                <span className="font-semibold text-black dark:text-white">Улучшить до коллекционного</span>
                <span className="text-xs text-gray-500 block">+25 ⭐ · случайные атрибуты</span>
              </div>
            </label>
          </div>
        )}

        <button onClick={sendGift} disabled={!selectedGift || loading} className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-50">
          {loading ? 'Отправка...' : `Отправить${upgrade ? ' (улучшенный)' : ''}`}
        </button>
      </div>
    </div>
  )
}
