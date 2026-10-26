'use client'
import { useState, useEffect } from 'react'

const THEMES = [
  { id: 'default', name: 'Классика', chatBg: 'bg-[#e6ebee] dark:bg-[#0e1621]', bubbleMe: 'bg-blue-500', bubbleOther: 'bg-white dark:bg-[#182533]' },
  { id: 'ocean', name: 'Океан', chatBg: 'bg-blue-50 dark:bg-[#0b1a2a]', bubbleMe: 'bg-teal-500', bubbleOther: 'bg-white dark:bg-[#132a3e]' },
  { id: 'sunset', name: 'Закат', chatBg: 'bg-orange-50 dark:bg-[#1a0f0b]', bubbleMe: 'bg-orange-500', bubbleOther: 'bg-white dark:bg-[#2e1a13]' },
  { id: 'night', name: 'Ночь', chatBg: 'bg-gray-900 dark:bg-[#000000]', bubbleMe: 'bg-purple-600', bubbleOther: 'bg-gray-800 dark:bg-[#111111]' },
]

export default function ThemeSettings({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState('default')
  const [isDark, setIsDark] = useState(false)
  const [fontSize, setFontSize] = useState('medium')
  const [corners, setCorners] = useState('rounded')

  // Загружаем сохраненные настройки при открытии
  useEffect(() => {
    setActiveTheme(localStorage.getItem('cosma-theme') || 'default')
    setIsDark(document.documentElement.classList.contains('dark'))
    setFontSize(localStorage.getItem('cosma-font') || 'medium')
    setCorners(localStorage.getItem('cosma-corners') || 'rounded')
  }, [])

  // Применяем настройки
  const applyTheme = (id: string) => {
    setActiveTheme(id)
    localStorage.setItem('cosma-theme', id)
    // Сохраняем классы для чата (они будут применяться в ChatView)
    const theme = THEMES.find(t => t.id === id)
    if (theme) {
      localStorage.setItem('cosma-chat-bg', theme.chatBg)
      localStorage.setItem('cosma-bubble-me', theme.bubbleMe)
      localStorage.setItem('cosma-bubble-other', theme.bubbleOther)
    }
    alert('Тема применена! Обновите чат, чтобы увидеть изменения.')
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

  const changeFontSize = (size: string) => {
    setFontSize(size)
    localStorage.setItem('cosma-font', size)
  }

  const changeCorners = (type: string) => {
    setCorners(type)
    localStorage.setItem('cosma-corners', type)
  }

  return (
    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8" onClick={onClose}>
      <div className="bg-[#17212b] text-white w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl overflow-y-auto border border-white/10" onClick={e => e.stopPropagation()}>
        
        {/* Шапка */}
        <div className="sticky top-0 bg-[#17212b] z-10 p-4 border-b border-white/10 flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">←</button>
          <h1 className="text-lg font-semibold">Оформление</h1>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Превью чата */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Цветовая тема — {isDark ? 'Ночной режим' : 'Дневной режим'}</p>
            <div className={`p-3 rounded-2xl ${THEMES.find(t => t.id === activeTheme)?.chatBg || 'bg-[#0e1621]'}`}>
              
              {/* Чужое сообщение */}
              <div className="flex items-end gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">Б</div>
                <div className={`${THEMES.find(t => t.id === activeTheme)?.bubbleOther || 'bg-[#182533]'} p-2 px-3 rounded-2xl rounded-bl-sm max-w-[70%]`}>
                  <div className="text-[#2aabee] text-xs mb-1">Боб Харрис</div>
                  <div className="text-sm">Доброе утро! 👋</div>
                </div>
              </div>

              {/* Мое сообщение */}
              <div className="flex justify-end mb-2">
                <div className={`${THEMES.find(t => t.id === activeTheme)?.bubbleMe || 'bg-blue-500'} p-2 px-3 rounded-2xl rounded-br-sm max-w-[70%] text-sm flex items-center gap-2`}>
                  Знаешь, который час? <span className="text-[10px] opacity-70">01:20</span>
                </div>
              </div>
              
              {/* Мое сообщение 2 */}
              <div className="flex justify-end">
                <div className={`${THEMES.find(t => t.id === activeTheme)?.bubbleMe || 'bg-blue-500'} p-2 px-3 rounded-2xl rounded-br-sm max-w-[70%] text-sm flex items-center gap-2`}>
                  В Токио утро 😎 <span className="text-[10px] opacity-70">01:20 ✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Выбор темы */}
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => applyTheme(theme.id)} className="flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-xl border-2 ${activeTheme === theme.id ? 'border-blue-500' : 'border-transparent'} ${theme.chatBg} p-1 relative overflow-hidden`}>
                  <div className={`w-full h-3 rounded-full ${theme.bubbleMe} mb-1`}></div>
                  <div className={`w-2/3 h-3 rounded-full ${theme.bubbleOther}`}></div>
                </div>
                <span className="text-xs text-gray-400">{theme.name}</span>
              </button>
            ))}
          </div>

          {/* Ночной режим */}
          <div className="bg-[#242f3d] rounded-2xl p-4 flex justify-between items-center">
            <span className="text-[15px]">Ночной режим</span>
            <button onClick={toggleDark} className={`w-12 h-6 rounded-full p-1 transition-colors ${isDark ? 'bg-green-500' : 'bg-gray-400'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Размер текста */}
          <div className="bg-[#242f3d] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px]">Размер текста</span>
              <span className="text-gray-400 text-sm">{fontSize === 'small' ? 'Мелкий' : fontSize === 'large' ? 'Крупный' : 'Средний'}</span>
            </div>
            <input 
              type="range" 
              min="1" max="3" 
              value={fontSize === 'small' ? 1 : fontSize === 'large' ? 3 : 2}
              onChange={(e) => changeFontSize(e.target.value === '1' ? 'small' : e.target.value === '3' ? 'large' : 'medium')}
              className="w-full accent-blue-500" 
            />
          </div>

          {/* Углы сообщений */}
          <div className="bg-[#242f3d] rounded-2xl p-4 flex justify-between items-center">
            <span className="text-[15px]">Углы блоков</span>
            <div className="flex gap-2">
              <button onClick={() => changeCorners('rounded')} className={`p-2 rounded-lg ${corners === 'rounded' ? 'bg-blue-500' : 'bg-[#17212b]'}`}>Округлые</button>
              <button onClick={() => changeCorners('square')} className={`p-2 rounded-lg ${corners === 'square' ? 'bg-blue-500' : 'bg-[#17212b]'}`}>Прямые</button>
            </div>
          </div>

          {/* Заглушка для иконок */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Иконка приложения</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-3xl shadow-lg">
                    {i === 1 ? '✈️' : i === 2 ? '💬' : i === 3 ? '🚀' : '⭐'}
                  </div>
                  <span className="text-[10px] text-gray-400">{i === 1 ? 'Основная' : i === 2 ? 'Океан' : i === 3 ? 'Закат' : 'Premium'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
