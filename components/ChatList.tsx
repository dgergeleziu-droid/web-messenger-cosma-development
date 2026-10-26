'use client'
import { useState } from 'react'

export default function ChatList({ chats, activeId, onSelect, user, onOpenProfile, onOpenNewChat }: any) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  const filteredChats = chats.filter((chat: any) => {
    const matchesSearch = chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && chat.unread > 0)
    return matchesSearch && matchesTab
  })

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-black/20">
      <div className="p-3 flex items-center gap-2 border-b border-white/20">
        <button onClick={onOpenProfile} className="p-2 hover:bg-black/5 rounded-full text-xl text-gray-800 dark:text-white">☰</button>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input type="text" placeholder="Поиск" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-black/30 rounded-full py-2 pl-9 pr-4 text-sm outline-none text-black dark:text-white border border-white/30" />
        </div>
        <button onClick={onOpenNewChat} className="p-2 hover:bg-black/5 rounded-full text-xl text-gray-800 dark:text-white">✏️</button>
      </div>

      <div className="flex px-3 pt-2 gap-4 border-b border-white/20">
        <button onClick={() => setActiveTab('all')} className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'all' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 dark:text-gray-400'}`}>Все чаты</button>
        <button onClick={() => setActiveTab('unread')} className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'unread' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 dark:text-gray-400'}`}>Непрочитанные</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat: any) => (
          <div key={chat.id} onClick={() => onSelect(chat)}
            className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all ${activeId === chat.id ? 'bg-blue-500/20 shadow-sm' : 'hover:bg-white/40 dark:hover:bg-white/10'}`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative shrink-0 overflow-hidden" style={{ backgroundColor: chat.avatar_color || '#2aabee' }}>
              {chat.avatar_url ? (
                <img src={chat.avatar_url} className="w-full h-full object-cover" />
              ) : (
                chat.type === 'channel' ? '📢' : chat.type === 'group' ? '👥' : chat.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-semibold truncate text-black dark:text-white text-[15px] flex items-center gap-1">
                  {chat.name || 'Без имени'} 
                  {chat.status_emoji && <span className="text-xs">{chat.status_emoji}</span>}
                </span>
                <span className="text-xs text-gray-500 shrink-0">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{chat.lastMsg || 'Нет сообщений'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
