'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GiftModal from "./GiftModal";

export default function ChatView({ chat, currentUser, onBack }: { chat: any, currentUser: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar_color)')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase.channel(`chat_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, async (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    const newMsgId = crypto.randomUUID();
    setInput("");

    const newMessage = {
      id: newMsgId, chat_id: chat.id, sender_id: currentUser.id,
      text: text, created_at: new Date().toISOString(),
      profiles: { name: currentUser.name, avatar_color: currentUser.avatar_color }
    };
    setMessages(prev => [...prev, newMessage]);

    const { error } = await supabase.from('messages').insert({
      id: newMsgId, chat_id: chat.id, sender_id: currentUser.id, text: text
    });
    if (error) {
      alert("Ошибка отправки");
      setMessages(prev => prev.filter(m => m.id !== newMsgId));
    }
  };

  return (
    <div className="flex flex-col h-full w-full absolute inset-0">
      {/* Шапка (фиксированная) */}
      <div className="flex items-center gap-3 p-3 pt-[max(12px,env(safe-area-inset-top))] bg-white/60 dark:bg-[#17212b]/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shrink-0 z-10">
        <button onClick={onBack} className="md:hidden p-1 text-2xl text-gray-700 dark:text-white">←</button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: chat.avatar_color || '#2aabee' }}>
          {chat.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-black dark:text-white">{chat.name}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">в сети</div>
        </div>
      </div>

      {/* Сообщения (скроллятся) */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Если это подарок
          if (m.gift) {
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-md ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                  <div className="text-5xl mb-2 animate-bounce">{m.gift}</div>
                  <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{m.text}</div>
                  <div className="text-[10px] text-gray-500 mt-2">{time}</div>
                </div>
              </div>
            );
          }

          // Обычное сообщение
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[60%] px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md border border-white/20 dark:border-white/10 ${isMe ? 'bg-blue-500/90 text-white rounded-br-sm' : 'bg-white/80 dark:bg-[#182533]/90 text-black dark:text-white rounded-bl-sm'}`}>
                {!isMe && chat.type !== 'private' && <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">{m.profiles?.name}</div>}
                <div className="text-[15px] leading-snug break-words pb-1">{m.text}</div>
                <div className={`flex items-center justify-end gap-1 text-[11px] select-none ${isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {time} {isMe && <span>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Поле ввода (прилипает к низу, учитывает клавиатуру) */}
      <div className="p-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-white/60 dark:bg-[#17212b]/80 backdrop-blur-xl border-t border-white/20 dark:border-white/10 flex items-end gap-2 shrink-0">
        <button onClick={() => setShowGifts(true)} className="p-3 rounded-full bg-black/5 dark:bg-white/10 text-yellow-600 dark:text-yellow-400 hover:bg-black/10 transition shrink-0 text-xl">
          🎁
        </button>
        <textarea 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Сообщение..." 
          rows={1}
          className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 text-[16px] text-black dark:text-white placeholder-gray-500 backdrop-blur-sm"
        />
        <button onClick={sendMessage} className="p-3 rounded-full bg-blue-500 text-white shrink-0 hover:bg-blue-600 transition shadow-lg">
          ➤
        </button>
      </div>

      {showGifts && <GiftModal currentUser={currentUser} chatId={chat.id} onClose={() => setShowGifts(false)} onGiftSent={fetchMessages} />}
    </div>
  );
}
