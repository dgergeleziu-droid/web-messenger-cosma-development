'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STANDARD_EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','👍','👏','🔥','❤️','🎉','😢','😡','🙏','💯','✨','🤝','💪','🤯']
const STANDARD_STICKERS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵'] // Заглушки для базовых стикеров

export default function StickerEmojiPicker({ currentUser, onSelectEmoji, onSelectSticker, onClose }: any) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji')
  const [customs, setCustoms] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchCustoms = async () => {
      const { data } = await supabase.from('custom_stickers').select('*')
      if (data) setCustoms(data)
    }
    fetchCustoms()
  }, [])

  const uploadCustom = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage.from('chat_media').upload(filePath, file)
    if (uploadError) { alert(uploadError.message); setUploading(false); return }

    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath)
    
    await supabase.from('custom_stickers').insert({
      creator_id: currentUser.id,
      url: data.publicUrl,
      type: activeTab
    })

    const { data: newList } = await supabase.from('custom_stickers').select('*')
    if (newList) setCustoms(newList)
    setUploading(false)
  }

  const filteredCustoms = customs.filter(c => c.type === activeTab)

  return (
    <div className="absolute bottom-full left-0 w-full md:w-[350px] h-72 bg-white dark:bg-[#17212b] border border-white/20 dark:border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden mb-2 ml-2">
      
      {/* Вкладки */}
      <div className="flex border-b border-black/10 dark:border-white/10">
        <button onClick={() => setActiveTab('emoji')} className={`flex-1 py-2 text-sm font-semibold transition ${activeTab === 'emoji' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Эмодзи</button>
        <button onClick={() => setActiveTab('sticker')} className={`flex-1 py-2 text-sm font-semibold transition ${activeTab === 'sticker' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Стикеры</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Стандартные (бесплатные) */}
        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 px-1">Стандартные</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {activeTab === 'emoji' ? (
            STANDARD_EMOJIS.map(e => (
              <button key={e} onClick={() => onSelectEmoji(e)} className="w-9 h-9 text-2xl hover:bg-black/5 rounded-lg">{e}</button>
            ))
          ) : (
            STANDARD_STICKERS.map(e => (
              <button key={e} onClick={() => onSelectSticker(e)} className="w-12 h-12 text-4xl hover:bg-black/5 rounded-lg">{e}</button>
            ))
          )}
        </div>

        {/* Кастомные (Премиум для эмодзи) */}
        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 px-1 flex items-center gap-1">
          Кастомные {activeTab === 'emoji' && <span className="text-purple-500">Premium 💎</span>}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {filteredCustoms.map(c => (
            <button 
              key={c.id} 
              onClick={() => {
                if (activeTab === 'emoji' && !currentUser.is_premium) {
                  alert('Кастомные эмодзи доступны только с Premium!')
                  return
                }
                if (activeTab === 'emoji') onSelectEmoji(`<img src="${c.url}" class="w-6 h-6 inline" />`)
                else onSelectSticker(c.url)
              }} 
              className="w-10 h-10 hover:bg-black/5 rounded-lg flex items-center justify-center"
            >
              <img src={c.url} className="w-full h-full object-contain" />
            </button>
          ))}
          
          {/* Кнопка загрузки */}
          <label className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer hover:border-blue-500">
            <input type="file" accept="image/*" onChange={uploadCustom} disabled={uploading} className="hidden" />
            <span className="text-xl text-gray-500">{uploading ? '⏳' : '+'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}
