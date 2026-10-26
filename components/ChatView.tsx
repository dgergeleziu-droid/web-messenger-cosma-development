'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GiftModal from "./GiftModal";
import ReactionModal from "./ReactionModal";

export default function ChatView({ chat, currentUser, onBack }: { chat: any, currentUser: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles(name, avatar_color)').eq('chat_id', chat.id).order('created_at', { ascending: true });
    if (data) {
      // Фильтруем истекшие сообщения
      const now = new Date().getTime();
      setMessages(data.filter(m => !m.expires_at || new Date(m.expires_at).getTime() > now));
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`chat_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, async (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, async (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
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
    
    const newMessage: any = { 
      id: newMsgId, chat_id: chat.id, sender_id: currentUser.id, text, 
      created_at: new Date().toISOString(), profiles: { name: currentUser.name } 
    };
    
    // Если секретный чат, ставим таймер (1 минута)
    if (chat.type === 'secret') {
      newMessage.expires_at = new Date(Date.now() + 60000).toISOString();
    }

    setMessages(prev => [...prev, newMessage]);
    
    await supabase.from('messages').insert({ 
      id: newMsgId, chat_id: chat.id, sender_id: currentUser.id, text,
      expires_at: chat.type === 'secret' ? new Date(Date.now() + 60000).toISOString() : null
    });
  };

  // ... (uploadFile без изменений)
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const filePath = `${chat.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const isImage = file.type.startsWith('image/');
      const { error: uploadError } = await supabase.storage.from('chat_media').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);
      const newMsgId = crypto.randomUUID();
      await supabase.from('messages').insert({
        id: newMsgId, chat_id: chat.id, sender_id: currentUser.id,
        text: isImage ? '📷 Фотография' : `📎 ${file.name}`,
        file_url: data.publicUrl, file_type: isImage ? 'image' : 'file'
      });
      fetchMessages();
    } catch (error: any) { alert('Ошибка: ' + error.message); } 
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const isOnline = otherUser?.last_seen ? (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < 120000 : false;

  // Обработка долгого нажатия
  let pressTimer: any;
  const handlePressStart = (id: string) => {
    pressTimer = setTimeout(() => setReactionMessageId(id), 500); // 0.5 сек
  };
  const handlePressEnd = () => clearTimeout(pressTimer);

  return (
    <div className="flex flex-col h-full w-full bg-[#e6ebee] dark:bg-[#0e1621]">
      
      {/* Шапка */}
      <div className="sticky top-0 flex items-center gap-3 p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shrink-0 z-50">
        <button onClick={onBack} className="md:hidden p-1 text-2xl text-gray-700 dark:text-white">←</button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold relative shrink-0 overflow-hidden" style={{ backgroundColor: otherUser?.avatar_color || chat.avatar_color || '#2aabee' }}>
          {otherUser?.avatar_url || chat.avatar_url ? <img src={otherUser?.avatar_url || chat.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.name || chat.name)?.[0]?.toUpperCase()}
          {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="font-semibold text-black dark:text-white flex items-center gap-1 truncate">
            {otherUser?.name || chat.name || 'Чат'}
            {chat.type === 'secret' && <span className="text-sm">🔒</span>}
            {otherUser?.status_emoji && <span className="text-sm">{otherUser.status_emoji}</span>}
          </div>
          <div className={`text-xs truncate ${isOnline ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {chat.type === 'secret' ? 'Сообщения исчезают через 1 мин.' : (isOnline ? 'в сети' : 'был(а) недавно')}
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (m.gift) { /* ... (блок подарка) ... */ }

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                onMouseDown={() => handlePressStart(m.id)} 
                onMouseUp={handlePressEnd} 
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(m.id)} 
                onTouchEnd={handlePressEnd}
                className={`relative max-w-[85%] md:max-w-[60%] p-1.5 rounded-2xl shadow-sm backdrop-blur-md border border-white/20 dark:border-white/10 cursor-pointer ${isMe ? 'bg-blue-500/90 text-white rounded-br-sm' : 'bg-white/80 dark:bg-[#182533]/90 text-black dark:text-white rounded-bl-sm'}`}>
                
                {m.file_type === 'image' && <img src={m.file_url} className="max-w-full rounded-xl mb-1 max-h-64 object-cover" />}
                {m.file_type === 'file' && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl mb-1 ${isMe ? 'bg-blue-600/50' : 'bg-gray-200/50 dark:bg-gray-800/50'}`}>
                    <span className="text-2xl">📄</span><span className="text-sm underline truncate">{m.text.replace('📎 ', '')}</span>
                  </a>
                )}
                {!m.file_type && <div className="text-[15px] leading-snug break-words px-2 pb-1">{m.text}</div>}
                
                {/* Реакции */}
                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(m.reactions).map(([emoji, users]: any) => (
                      <span key={emoji} className="bg-black/20 dark:bg-white/20 rounded-full px-1.5 py-0.5 text-xs">{emoji} {users.length}</span>
                    ))}
                  </div>
                )}

                <div className={`flex items-center justify-end gap-1 text-[11px] select-none px-2 pb-1 ${isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {time} {isMe && <span>✓✓</span>}
                  {chat.type === 'secret' && <span>🔥</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-t border-white/20 dark:border-white/10 flex items-end gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" accept="image/*,application/pdf,.doc,.docx,.zip" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-3 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 shrink-0 text-xl">{uploading ? '⏳' : '📎'}</button>
        <button onClick={() => setShowGifts(true)} className="p-3 rounded-full bg-black/5 dark:bg-white/10 text-yellow-600 dark:text-yellow-400 shrink-0 text-xl">🎁</button>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Сообщение..." rows={1} className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 text-[16px] text-black dark:text-white" />
        <button onClick={sendMessage} className="p-3 rounded-full bg-blue-500 text-white shrink-0 hover:bg-blue-600 transition shadow-lg">➤</button>
      </div>

      {showGifts && <GiftModal currentUser={currentUser} chatId={chat.id} onClose={() => setShowGifts(false)} onGiftSent={fetchMessages} />}
      {reactionMessageId && (
        <ReactionModal 
          messageId={reactionMessageId} 
          currentReactions={messages.find(m => m.id === reactionMessageId)?.reactions || {}} 
          onClose={() => setReactionMessageId(null)} 
          onReacted={fetchMessages} 
        />
      )}
    </div>
  );
}
