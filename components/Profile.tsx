'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Profile({ user, onClose, onOpenNewChat, onOpenSettings, onOpenCreateChat, onOpenAdmin, onOpenTheme, onOpenPrivacy }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const [userGifts, setUserGifts] = useState<any[]>([])
  const [selectedGift, setSelectedGift] = useState<any>(null)
  const [showCraft, setShowCraft] = useState(false)
  const [craftSelection, setCraftSelection] = useState<string[]>([])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    const fetchGifts = async () => {
      const { data } = await supabase
        .from('user_gifts')
        .select('*, gift_catalog(*)')
        .eq('user_id', user.id)
        .order('acquired_at', { ascending: false })
      if (data) setUserGifts(data)
    }
    fetchGifts()
  }, [user.id, supabase])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const wearGift = async (gift: any) => {
    const isWorn = gift.is_worn
    await supabase.from('user_gifts').update({ is_worn: false }).eq('user_id', user.id)
    if (!isWorn) {
      await supabase.from('user_gifts').update({ is_worn: true }).eq('id', gift.id)
      await supabase.from('profiles').update({ worn_gift_id: gift.id }).eq('id', user.id)
    } else {
      await supabase.from('profiles').update({ worn_gift_id: null }).eq('id', user.id)
    }
    setUserGifts(prev => prev.map(g => ({ ...g, is_worn: g.id === gift.id ? !isWorn : false })))
    setSelectedGift(null)
  }

  const upgradeGift = async (gift: any) => {
    if (gift.upgraded_at) return
    if ((user.stars || 0) < 25) {
      alert('Недостаточно звёзд')
      return
    }
    await supabase.from('profiles').update({ stars: user.stars - 25 }).eq('id', user.id)
    const attrs = {
      model: ['gold', 'silver', 'bronze', 'platinum'][Math.floor(Math.random() * 4)],
      backdrop: ['stars', 'gradient', 'solid'][Math.floor(Math.random() * 3)],
      symbol: ['sparkle', 'crown', 'heart'][Math.floor(Math.random() * 3)],
      serial_number: Math.floor(Math.random() * 10000) + 1,
      rarity_score: Math.floor(Math.random() * 1000) + 1,
      rarity_tier: 'uncommon',
      upgraded_at: new Date().toISOString(),
    }
    await supabase.from('user_gifts').update(attrs).eq('id', gift.id)
    setUserGifts(prev => prev.map(g => g.id === gift.id ? { ...g, ...attrs } : g))
    setSelectedGift(null)
  }

  const craftGifts = async () => {
    if (craftSelection.length < 2) {
      alert('Выберите хотя бы 2 подарка')
      return
    }
    const tiers = ['uncommon', 'rare', 'epic', 'legendary']
    const nextTier = tiers[Math.min(1, tiers.length - 1)]
    await supabase.from('user_gifts').delete().in('id', craftSelection)
    const newGift = {
      user_id: user.id,
      gift_id: 'crafted',
      model: 'crafted',
      backdrop: 'crafted',
      symbol: 'crafted',
      serial_number: Math.floor(Math.random() * 10000) + 1,
      rarity_score: Math.floor(Math.random() * 100) + 1,
      rarity_tier: nextTier,
      upgraded_at: new Date().toISOString(),
    }
    await supabase.from('user_gifts').insert(newGift)
    const { data } = await supabase.from('user_gifts').select('*, gift_catalog(*)').eq('user_id', user.id).order('acquired_at', { ascending: false })
    if (data) setUserGifts(data)
    setCraftSelection([])
    setShowCraft(false)
  }

  const gifts = user?.gifts_inventory || []

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed top-0 left-0 z-[90] w-[320px] h-full bg-white dark:bg-[#17212b] flex flex-col shadow-2xl border-r border-black/10 dark:border-white/10 overflow-y-auto">
        <div className={`p-5 cursor-pointer hover:opacity-90 transition ${user?.is_premium ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-gradient-to-b from-blue-500/20 to-transparent dark:from-blue-900/30'}`} onClick={onOpenSettings}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-md text-white overflow-hidden border-2 border-white/30" style={{ backgroundColor: user?.avatar_color }}>
            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <div className={`font-bold text-lg flex items-center gap-1 ${user?.is_premium ? 'text-white' : 'text-black dark:text-white'}`}>
            {user?.name} {user?.is_premium ? (user?.status_emoji || '💎') : ''}
          </div>
          <div className={`text-sm ${user?.is_premium ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>{user?.username ? `@${user.username}` : 'Настроить'}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-black/20 dark:bg-black/40 text-white px-2 py-0.5 rounded-full font-bold">⭐ {user?.stars || 0}</span>
            {user?.is_premium && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Premium</span>}
          </div>
        </div>

        <div className="flex-1 py-2">
          {gifts.length > 0 && (
            <div className="px-5 mb-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Коллекция подарков</h3>
              <div className="flex flex-wrap gap-2">
                {gifts.map((gift: any, idx: number) => (
                  <div key={idx} className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center text-xl shadow-sm" title={gift.name}>{gift.emoji}</div>
                ))}
              </div>
            </div>
          )}
          <div className="h-px bg-black/5 dark:bg-white/10 mx-4 my-2" />
          
          <div className="flex items-center justify-between px-5 py-3 hover:bg-black/5 cursor-pointer" onClick={toggleTheme}>
            <div className="flex items-center gap-4"><span className="text-xl">{isDark ? '🌙' : '☀️'}</span><span className="text-[15px] font-medium">Тема</span></div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} /></div>
          </div>
          
          <button onClick={() => { onClose(); onOpenTheme(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">🎨</span><span className="text-[15px] font-medium">Оформление</span></button>
          <button onClick={() => { onClose(); onOpenPrivacy(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">🔒</span><span className="text-[15px] font-medium">Конфиденциальность</span></button>
          {user?.is_admin && <button onClick={() => { onClose(); onOpenAdmin(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-red-500/10 text-left"><span className="text-xl">👑</span><span className="text-[15px] font-bold text-red-500">Админ-панель</span></button>}
          <button onClick={() => { onClose(); onOpenCreateChat(); }} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">👥</span><span className="text-[15px] font-medium">Создать группу / канал</span></button>
          <button onClick={onOpenSettings} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-black/5 text-left"><span className="text-xl">⚙️</span><span className="text-[15px] font-medium">Настройки</span></button>
        </div>

        <div className="mt-auto border-t border-black/5 dark:border-white/10 shrink-0">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-500/10 transition text-left"><span className="text-xl">🚪</span><span className="text-[15px] font-medium">Выйти</span></button>
        </div>
      </div>

      {/* Модалка для выбранного подарка */}
      {selectedGift && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedGift(null)}>
          <div className="bg-white dark:bg-[#17212b] rounded-3xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">{selectedGift.gift_catalog?.emoji}</div>
              <h3 className="font-bold text-lg">{selectedGift.gift_catalog?.name}</h3>
              {selectedGift.upgraded_at && (
                <div className="text-xs text-purple-500 mt-1">
                  Модель: {selectedGift.model} · Фон: {selectedGift.backdrop} · Символ: {selectedGift.symbol} · #{selectedGift.serial_number}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => wearGift(selectedGift)} className="w-full py-2 bg-blue-500 text-white rounded-xl">
                {selectedGift.is_worn ? 'Снять' : 'Надеть как статус'}
              </button>
              {!selectedGift.upgraded_at && (
                <button onClick={() => upgradeGift(selectedGift)} className="w-full py-2 bg-purple-500 text-white rounded-xl">
                  Улучшить за 25 ⭐
                </button>
              )}
              <button onClick={() => setSelectedGift(null)} className="w-full py-2 bg-gray-200 dark:bg-white/10 rounded-xl">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка крафта */}
      {showCraft && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCraft(false)}>
          <div className="bg-white dark:bg-[#17212b] rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Крафт подарков</h3>
            <p className="text-sm text-gray-500 mb-4">Выберите до 4 коллекционных подарков, чтобы получить более редкий.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {userGifts.filter(g => g.upgraded_at).map(gift => (
                <button key={gift.id} onClick={() => {
                  setCraftSelection(prev => prev.includes(gift.id) ? prev.filter(id => id !== gift.id) : [...prev, gift.id])
                }} className={`p-2 rounded-xl border ${craftSelection.includes(gift.id) ? 'border-blue-500 bg-blue-500/20' : 'border-transparent bg-black/5'}`}>
                  <span className="text-3xl">{gift.gift_catalog?.emoji}</span>
                </button>
              ))}
            </div>
            <button onClick={craftGifts} disabled={craftSelection.length < 2} className="w-full py-2 bg-green-500 text-white rounded-xl disabled:opacity-50">
              Скрафтить ({craftSelection.length})
            </button>
          </div>
        </div>
      )}
    </>
  )
}
