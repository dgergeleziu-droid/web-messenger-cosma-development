'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChatView({ chat, currentUser, onBack }: { chat: any, currentUser: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Загружаем историю сообщений при открытии чата
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(name, avatar_color)')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };
    fetchMessages();

    // Подписываемся на новые сообщения в реальном времени (Realtime)
    const channel = supabase.channel(`chat_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, async (payload) => {
        // Когда приходит новое сообщение, подгружаем данные отправителя
        const { data: profile } = await supabase.from('profiles').select('name, avatar_color').eq('id', payload.new.sender_id).single();
        setMessages(prev => [...prev, { ...payload.new, profiles: profile }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat.id, supabase]);

  // Автоскролл вниз
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput(""); // Очищаем поле сразу, чтобы было быстро

    await supabase.from('messages').insert({
      chat_id: chat.id,
      sender_id: currentUser.id,
      text: text
    });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Шапка чата */}
      <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-black/30 border-b border-white/20 dark:border-white/10 shrink-0 backdrop-blur-md">
        <button onClick={onBack} className="md:hidden p-1 text-2xl text-gray-700 dark:text-white">←</button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: chat.avatar_color || '#2aabee' }}>
          {chat.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-black dark:text-white">{chat.name}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">в сети</div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[60%] px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md border border-white/20 dark:border-white/10 ${isMe ? 'bg-blue-500/80 text-white rounded-br-sm' : 'bg-white/70 dark:bg-[#182533]/80 text-black dark:text-white rounded-bl-sm'}`}>
                {/* Имя отправителя (если это группа или канал) */}
                {!isMe && chat.type !== 'private' && (
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">{m.profiles?.name}</div>
                )}
                <div className="text-[15px] leading-snug break-words pb-1">{m.text}</div>
                <div className={`flex items-center justify-end gap-1 text-[11px] select-none ${isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {time}
                  {isMe && <span>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-3 bg-white/40 dark:bg-black/30 border-t border-white/20 dark:border-white/10 backdrop-blur-md flex items-end gap-2 shrink-0">
        <textarea 
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Сообщение" rows={1}
          className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 text-[15px] text-black dark:text-white placeholder-gray-500 backdrop-blur-sm"
        />
        <button onClick={sendMessage} className="p-3 rounded-full bg-blue-500 text-white shrink-0 hover:bg-blue-600 transition shadow-lg">
          ➤
        </button>
      </div>
    </div>
  );
}
