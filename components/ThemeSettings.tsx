'use client'
import { useState, useEffect } from 'react'

const THEMES = [
  { id: 'default', name: 'Классика', bubbleMe: 'bg-blue-500', bubbleOther: 'bg-white dark:bg-[#182533]' },
  { id: 'ocean', name: 'Океан', bubbleMe: 'bg-teal-500', bubbleOther: 'bg-white dark:bg-[#132a3e]' },
  { id: 'sunset', name: 'Закат', bubbleMe: 'bg-orange-500', bubbleOther: 'bg-white dark:bg-[#2e1a13]' },
  { id: 'night', name: 'Ночь', bubbleMe: 'bg-purple-600', bubbleOther: 'bg-gray-800 dark:bg-[#111111]' },
  { id: 'green', name: 'Лес', bubbleMe: 'bg-green-600', bubbleOther: 'bg-white dark:bg-[#1a2e1a]' },
]

const COLORS = [
  '#2aabee', '#e17076', '#7bc862', '#e5ca77', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774', '#ffffff', '#000000'
]

export default function ThemeSettings({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState('default')
  const [customBg, setCustomBg] = useState<string | null>(null)
  const [bubbleColorMe, setBubbleColorMe] = useState('bg-blue-500')
  const [bubbleColorOther, setBubbleColorOther] = useState('bg-white dark:bg-[#182533]')
  const [isDark, setIsDark] = useState(false)

  // Загружаем сохраненные настройки
  useEffect(() => {
    const savedTheme = localStorage.getItem('cosma-theme') || 'default'
    const savedBg = localStorage.getItem('cosma-chat-bg-image')
    const savedMe = localStorage.getItem('cosma-bubble-me')
    const savedOther = localStorage.getItem('cosma-bubble-other')

    setActiveTheme(savedTheme)
    if (savedBg) setCustomBg(savedBg)
    if (savedMe) setBubbleColorMe(savedMe)
    if (savedOther) setBubbleColorOther(savedOther)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const saveSettings = (key: string, value: string) => {
    localStorage.setItem(key, value)
  }

  // Обработка загрузки обоев
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setCustomBg(base64)
      saveSettings('cosma-chat-bg-image', base64)
    }
    reader.readAsDataURL(file)
  }

  const removeCustomBg = () => {
    setCustomBg(null)
    localStorage.removeItem('cosma-chat-bg-image')
  }

  const applyTheme = (theme: any) => {
    setActiveTheme(theme.id)
    setBubbleColorMe(theme.bubbleMe)
    setBubbleColorOther(theme.bubbleOther)
    
    saveSettings('cosma-theme', theme.id)
    saveSettings('cosma-bubble-me', theme.bubbleMe)
    saveSettings('cosma-bubble-other', theme.bubbleOther)
  }

  const handleColorChange = (type: 'me' | 'other', color: string) => {
    if (type === 'me') {
      setBubbleColorMe(color)
      saveSettings('cosma-bubble-me', color)
    } else {
      setBubbleColorOther(color)
      saveSettings('cosma-bubble-other', color)
    }
  }

  const toggleDark = () => {
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

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-[#17212b] text-white w-full max-w-lg h-full md:h-[85vh] md:rounded-3xl shadow-2xl overflow-y-auto border border-white/10" onClick={e => e.stopPropagation()}>
        
        {/* Шапка */}
        <div className="sticky top-0 bg-[#17212b]/95 backdrop-blur-md z-10 p-4 border-b border-white/10 flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">←</button>
          <h1 className="text-lg font-semibold">Оформление</h1>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Превью чата */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Предпросмотр чата</p>
            <div 
              className="p-3 rounded-2xl relative overflow-hidden bg-[#0e1621] bg-cover bg-center"
              style={customBg ? { backgroundImage: `url(${customBg})` } : {}}
            >
              {/* Чужое сообщение */}
              <div className="flex items-end gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">Б</div>
                <div className={`${bubbleColorOther} p-2 px-3 rounded-2xl rounded-bl-sm max-w-[70%] text-black`}>
                  <div className="text-[#2aabee] text-xs mb-1">Боб Харрис</div>
                  <div className="text-sm">Доброе утро! 👋</div>
                </div>
              </div>
              {/* Мое сообщение */}
              <div className="flex justify-end mb-2">
                <div className={`${bubbleColorMe} p-2 px-3 rounded-2xl rounded-br-sm max-w-[70%] text-sm flex items-center gap-2`}>
                  Знаешь, который час? <span className="text-[10px] opacity-70">01:20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Загрузка своих обоев */}
          <div className="bg-[#242f3d] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px]">Свои обои для чата</span>
              {customBg && <button onClick={removeCustomBg} className="text-red-400 text-xs">Удалить</button>}
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="bg-upload" />
            <label htmlFor="bg-upload" className="flex items-center justify-center w-full p-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition">
              <span className="text-sm">📷 Загрузить картинку</span>
            </label>
          </div>

          {/* Выбор готовых тем */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Цветовые темы</p>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map(theme => (
                <button key={theme.id} onClick={() => applyTheme(theme)} className="flex flex-col items-center gap-1">
                  <div className={`w-full aspect-square rounded-xl border-2 ${activeTheme === theme.id ? 'border-blue-500' : 'border-transparent'} bg-[#0e1621] p-1 relative overflow-hidden`}>
                    <div className={`w-full h-3 rounded-full ${theme.bubbleMe} mb-1`}></div>
                    <div className={`w-2/3 h-3 rounded-full ${theme.bubbleOther}`}></div>
                  </div>
                  <span className="text-[10px] text-gray-400 text-center">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ручной выбор цветов */}
          <div className="bg-[#242f3d] rounded-2xl p-4">
            <p className="text-[15px] mb-3">Цвет моих сообщений</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {COLORS.map(c => (
                <button key={c} onClick={() => handleColorChange('me', c)} className={`w-8 h-8 rounded-full border-2 ${bubbleColorMe === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>

            <p className="text-[15px] mb-3">Цвет сообщений собеседника</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => handleColorChange('other', c)} className={`w-8 h-8 rounded-full border-2 ${bubbleColorOther === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Ночной режим */}
          <div className="bg-[#242f3d] rounded-2xl p-4 flex justify-between items-center">
            <span className="text-[15px]">Ночной режим</span>
            <button onClick={toggleDark} className={`w-12 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-green-500' : 'bg-gray-400'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
