import { Chat } from "../app/page";

export default function ChatList({ chats, activeId, onSelect }: { chats: Chat[], activeId: string | null, onSelect: (c: Chat) => void }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#17212b]">
      {/* Шапка с поиском */}
      <div className="p-3 flex items-center gap-3 border-b border-gray-200 dark:border-[#242f3d]">
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-full text-xl">☰</button>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input type="text" placeholder="Поиск" className="w-full bg-gray-100 dark:bg-[#242f3d] rounded-full py-2 pl-9 pr-4 text-sm outline-none" />
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <div key={chat.id} onClick={() => onSelect(chat)}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${activeId === chat.id ? 'bg-[#2aabee]/10' : 'hover:bg-gray-100 dark:hover:bg-[#202b36]'}`}>
            {/* Аватарка */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative shrink-0" style={{ backgroundColor: chat.avatar }}>
              {chat.name[0]}
              {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />}
            </div>
            {/* Текст */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-semibold truncate">{chat.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 truncate">{chat.lastMsg}</span>
                {chat.unread > 0 && <span className="bg-[#2aabee] text-white text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-2">{chat.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
