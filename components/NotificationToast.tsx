'use client'
import { useEffect, useState } from 'react'

export default function NotificationToast({ data, onClose, onClick }: { data: any, onClose: () => void, onClick: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (data) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Ждем окончания анимации
      }, 4000) // Плашка висит 4 секунды
      return () => clearTimeout(timer)
    }
  }, [data, onClose])

  if (!data) return null

  return (
    <div 
      onClick={onClick}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm cursor-pointer transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}
    >
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: data.avatar_color || '#2aabee' }}>
          {data.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-black dark:text-white text-sm">{data.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{data.text}</div>
        </div>
        <div className="text-xs text-blue-500 font-medium">Открыть</div>
      </div>
    </div>
  )
}
