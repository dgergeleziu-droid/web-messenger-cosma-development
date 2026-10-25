'use client'
import { Chat } from "../app/page"

export default function ChatList({ chats, activeId, onSelect, user, onOpenProfile, onOpenNewChat }: { 
  chats: Chat[], 
  activeId: string | null, 
  onSelect: (c: Chat) => void,
  user: any,
  onOpenProfile: () => void,
  onOpenNewChat: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#17212b]">
      {/* Шапка */}
      <div className="p-3 flex items-center gap-2 border-b border-gray-200 dark:border-[#242f3d]">
        <button onClick={onOpenProfile} className="p-2 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-full text-xl text-gray-600 dark:text-gray-300">
          ☰
        </button>
        
        <div className="flex-1 relative" onClick={onOpenNewChat}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input 
            type="text" 
            placeholder="Поиск" 
            readOnly
            className="w-full bg-gray-100 dark:bg-[#242f3d] rounded-full py-2 pl-9 pr-4 text-sm outline-none cursor-pointer text-black dark:text-white" 
          />
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>У вас пока нет чатов.</p>
            <button onClick={onOpenNewChat} className="mt-4 text-[#2aabee] hover:underline">
              Найти собеседника
            </button>
          </div>
        ) : (
          chats.map(chat => (
            <div key={chat.id} onClick={() => onSelect(chat)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${activeId === chat.id ? 'bg-[#2aabee]/10' : 'hover:bg-gray-100 dark:hover:bg-[#202b36]'}`}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative shrink-0" style={{ backgroundColor: chat.avatar || '#2aabee' }}>
                {chat.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-semibold truncate text-black dark:text-white">{chat.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 truncate">{chat.lastMsg || 'Нет сообщений'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
