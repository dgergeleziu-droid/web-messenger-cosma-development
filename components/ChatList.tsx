'use client'
import { useState } from 'react'
import { Chat } from "../app/page"

export default function ChatList({ chats, activeId, onSelect, user, onOpenProfile, onOpenNewChat }: { 
  chats: Chat[], 
  activeId: string | null, 
  onSelect: (c: Chat) => void,
  user: any,
  onOpenProfile: () => void,
  onOpenNewChat: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  // Фильтрация чатов (поиск + вкладки)
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && chat.unread > 0)
    return matchesSearch && matchesTab
  })

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-black/20">
      {/* Шапка с меню и поиском */}
      <div className="p-3 flex items-center gap-2 border-b border-white/20 dark:border-white/10">
        <button onClick={onOpenProfile} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-xl text-gray-800 dark:text-white transition-colors">
          ☰
        </button>
        
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">🔍</span>
          <input 
            type="text" 
            placeholder="Поиск" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-black/30 rounded-full py-2 pl-9 pr-4 text-sm outline-none text-black dark:text-white border border-white/30 dark:border-white/10 backdrop-blur-md focus:border-blue-400/50 transition-colors" 
          />
        </div>

        <button onClick={onOpenNewChat} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-xl text-gray-800 dark:text-white transition-colors" title="Новое сообщение">
          ✏️
        </button>
      </div>

      {/* Вкладки (Папки) как в Telegram */}
      <div className="flex px-3 pt-2 gap-4 border-b border-white/20 dark:border-white/10">
        <button 
          onClick={() => setActiveTab('all')}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'all' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Все чаты
        </button>
        <button 
          onClick={() => setActiveTab('unread')}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'unread' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Непрочитанные
        </button>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <p>{searchQuery ? 'Ничего не найдено' : 'У вас пока нет чатов.'}</p>
            {!searchQuery && (
              <button onClick={onOpenNewChat} className="mt-4 px-4 py-2 bg-blue-500/80 text-white rounded-lg hover:bg-blue-600/80 backdrop-blur-md transition shadow-lg">
                Найти собеседника
              </button>
            )}
          </div>
        ) : (
          filteredChats.map(chat => (
            <div key={chat.id} onClick={() => onSelect(chat)}
              className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all ${activeId === chat.id ? 'bg-blue-500/20 shadow-sm border border-blue-500/30' : 'hover:bg-white/40 dark:hover:bg-white/10 border border-transparent'}`}>
              
              {/* Аватарка */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative shrink-0 shadow-sm" style={{ backgroundColor: chat.avatar || '#2aabee' }}>
                {chat.name?.[0]?.toUpperCase()}
                {chat.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />}
              </div>

              {/* Информация о чате */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-semibold truncate text-black dark:text-white text-[15px]">{chat.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{chat.lastMsg || 'Нет сообщений'}</span>
                  {chat.unread > 0 && (
                    <span className="bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
