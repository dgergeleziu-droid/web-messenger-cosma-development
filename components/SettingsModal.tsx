'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FREE_EMOJIS = ['', '😎', '🔥']
const PREMIUM_EMOJIS = ['', '😎', '🔥', '🍕', '🎧', '💻', '🎮', '🚀', '🌙', '☕', '💎', '🦄']

export default function SettingsModal({ currentUser, onClose, onUpdate, onOpenPrivacy }: any) {
  const [name, setName] = useState(currentUser.name || '')
  const [username, setUsername] = useState(currentUser.username || '')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '')
  const [statusEmoji, setStatusEmoji] = useState(currentUser.status_emoji || '')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return
      const file = event.target.files[0]
      const filePath = `${currentUser.id}-${Math.random()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data } = await supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    } catch (error: any) { alert('Ошибка загрузки фото: ' + error.message); } 
    finally { setUploading(false) }
  }

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({ 
      id: currentUser.id, name, username: username.replace('@', ''), phone, avatar_url: avatarUrl, status_emoji: statusEmoji 
    })
    if (error) alert(error.message)
    else { onUpdate(); onClose() }
    setLoading(false)
  }

  const buyPremium = async () => {
    await supabase.from('profiles').update({ is_premium: true, stars: (currentUser.stars || 0) + 500 }).eq('id', currentUser.id)
    alert('Вы купили Cosma Premium! Вам начислено 500 звезд ⭐')
    onUpdate()
  }

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Блок Премиума */}
        <div className={`rounded-2xl p-4 mb-6 border ${currentUser.is_premium ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/50' : 'bg-black/5 dark:bg-white/5 border-transparent'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
              <span className="text-xl">💎</span> Cosma Premium
            </h3>
            {currentUser.is_premium && <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">Активен</span>}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Уникальные эмодзи, NFT-подарки, безлимитные стикеры и золотой значок.</p>
          {!currentUser.is_premium && (
            <button onClick={buyPremium} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl py-2 font-semibold hover:opacity-90 transition shadow-lg">
              Купить за 299 ₽
            </button>
          )}
        </div>

        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Настройки профиля</h2>
        
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-lg relative overflow-hidden group cursor-pointer border-2 border-white/50" 
            style={{ backgroundColor: currentUser.avatar_color || '#2aabee' }} onClick={() => document.getElementById('avatar-upload')?.click()}>
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-white">{name?.[0]?.toUpperCase()}</span>}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-sm">Изменить</span></div>
          </div>
          <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
        </div>

        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Имя" className="w-full bg-white/50 dark:bg-black/30 border border-white/30 rounded-xl px-4 py-2 mb-3 outline-none text-black dark:text-white" />
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" className="w-full bg-white/50 dark:bg-black/30 border border-white/30 rounded-xl px-4 py-2 mb-3 outline-none text-black dark:text-white" />
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 999 000-00-00" className="w-full bg-white/50 dark:bg-black/30 border border-white/30 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" />

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2 flex justify-between">
          <span>Эмодзи-статус</span>
          {!currentUser.is_premium && <span className="text-purple-500 text-xs">💎 Premium</span>}
        </label>
        <div className="flex flex-wrap gap-2 mb-6">
          {(currentUser.is_premium ? PREMIUM_EMOJIS : FREE_EMOJIS).map(e => (
            <button key={e} onClick={() => setStatusEmoji(e)} className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${statusEmoji === e ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'}`}>
              {e || '❌'}
            </button>
          ))}
          {!currentUser.is_premium && (
            <button onClick={buyPremium} className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-purple-500/20 text-purple-500 border border-purple-500/50">
              🔒
            </button>
          )}
        </div>

        <button onClick={handleSave} disabled={loading || uploading} className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-50 shadow-lg mb-4">
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>

        {/* НОВАЯ КНОПКА КОНФИДЕНЦИАЛЬНОСТИ */}
        <button 
          onClick={() => { onClose(); onOpenPrivacy(); }} 
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <span className="text-[15px] font-medium text-black dark:text-white">Конфиденциальность</span>
          </div>
          <span className="text-gray-400">›</span>
        </button>

      </div>
    </div>
  )
}
