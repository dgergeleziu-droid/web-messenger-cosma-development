'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PrivacySettings({ currentUser, onClose, onUpdate }: any) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // Загружаем настройки (если нет, ставим дефолтные)
  const defaultSettings = {
    phone: 'everybody',
    last_seen: 'everybody',
    profile_photo: 'everybody',
    calls: 'everybody',
    forwarded_messages: 'everybody'
  }
  const [settings, setSettings] = useState<any>(currentUser.privacy_settings || defaultSettings)
  
  // Состояние для выпадающего меню выбора (какой пункт сейчас настраиваем)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const handleSave = async (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setActiveMenu(null) // Закрываем меню
    
    await supabase.from('profiles').update({ privacy_settings: newSettings }).eq('id', currentUser.id)
    onUpdate() // Обновляем данные пользователя на главной
  }

  const options = [
    { id: 'everybody', label: 'Все' },
    { id: 'contacts', label: 'Мои контакты' },
    { id: 'nobody', label: 'Никто' },
  ]

  const getLabel = (id: string) => options.find(o => o.id === id)?.label || 'Все'

  const menuItems = [
    { id: 'phone', title: 'Номер телефона', desc: 'Кто видит мой номер' },
    { id: 'last_seen', title: 'Время захода', desc: 'Кто видит время моего последнего визита' },
    { id: 'profile_photo', title: 'Фото профиля', desc: 'Кто видит мое фото' },
    { id: 'calls', title: 'Звонки', desc: 'Кто может мне звонить' },
    { id: 'forwarded_messages', title: 'Пересланные сообщения', desc: 'Кто видит ссылку на мой профиль' },
  ]

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#17212b] text-white w-full max-w-md h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>
        
        {/* Шапка */}
        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-[#17212b] shrink-0">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white">←</button>
          <h1 className="text-lg font-semibold">Конфиденциальность</h1>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <div className="p-4 space-y-1">
            {menuItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => setActiveMenu(item.id)}
                className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-white/5 rounded-xl transition text-left"
              >
                <div>
                  <div className="text-[15px] font-medium text-white">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm">{getLabel(settings[item.id])}</span>
                  <span>›</span>
                </div>
              </button>
            ))}
          </div>

          {/* Выпадающее меню (Overlay) */}
          {activeMenu && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10" onClick={() => setActiveMenu(null)}>
              <div className="bg-[#242f3d] rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 text-center font-semibold text-white">
                  Кто может видеть?
                </div>
                {options.map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => handleSave(activeMenu, opt.id)}
                    className="w-full text-left p-4 text-white hover:bg-white/10 transition flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    {settings[activeMenu] === opt.id && <span className="text-blue-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
