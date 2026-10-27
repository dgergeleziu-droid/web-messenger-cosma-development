'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChatViewProps {
  chat: any;
  currentUser: any;
  onBack: () => void;
}

export default function ChatView({ chat, currentUser, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // 1. Загружаем профиль собеседника
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (chat.type === 'private' || chat.type === 'secret') {
        const { data: participants } = await supabase.from('chat_participants').select('user_id, profiles(*)').eq('chat_id', chat.id);
        if (participants) {
          const other = participants.find((p: any) => p.user_id !== currentUser.id);
          if (other) setOtherUser(other.profiles);
        }
      }
    };
    fetchOtherUser();
  }, [chat.id, chat.type, currentUser.id, supabase]);

  // 2. Загружаем сообщения
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar_color)')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // 3. Подписка на новые сообщения (Realtime)
  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`chat_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chat.id]);

  // 4. Автоскролл вниз
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 5. Отправка сообщения
  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    
    await supabase.from('messages').insert({ 
      id: crypto.randomUUID(), 
      chat_id: chat.id, 
      sender_id: currentUser.id, 
      text 
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#e6ebee] dark:bg-[#0e1621]">
      
      {/* ШАПКА */}
      <div className="h-16 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shrink-0 flex items-center px-4 gap-3 z-10">
        <button onClick={onBack} className="md:hidden text-2xl text-gray-700 dark:text-white">←</button>
        
        {/* Аватарка и Имя */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => alert("Тут будет открываться профиль")}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden" style={{ backgroundColor: otherUser?.avatar_color || '#2aabee' }}>
            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.name || chat.name)?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-black dark:text-white">{otherUser?.name || chat.name || "Чат"}</span>
            <span className="text-xs text-blue-500">был(а) недавно</span>
          </div>
        </div>
      </div>

      {/* СООБЩЕНИЯ */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500 bg-black/10 dark:bg-black/30 rounded-xl backdrop-blur-sm">
            Нет сообщений. Напишите первое!
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[85%] md:max-w-[60%] px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md ${
                isMe ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white/90 dark:bg-[#182533]/90 text-black dark:text-white rounded-bl-sm'
              }`}>
                {!isMe && <div className="text-xs font-bold text-blue-500 mb-1">{m.profiles?.name}</div>}
                <div className="text-[15px] leading-snug break-words pb-4">{m.text}</div>
                <div className={`absolute bottom-1 right-2 flex items-center gap-1 text-[11px] ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                  {time} {isMe && <span>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* ПАНЕЛЬ ВВОДА */}
      <div className="p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-t border-white/20 flex items-end gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        {/* Иконки пока просто для красоты (без действий) */}
        <button className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 text-xl">😊</button>
        <button className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 text-xl">📎</button>
        
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }} 
          placeholder="Сообщение..." 
          className="flex-1 bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 outline-none text-[16px] text-black dark:text-white transition-colors" 
        />
        
        <button onClick={sendMessage} disabled={!input.trim()} className="p-3 px-5 rounded-full bg-blue-500 text-white shrink-0 hover:bg-blue-600 transition shadow-lg disabled:opacity-50">
          ➤
        </button>
      </div>

    </div>
  );
}
