'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GiftModal from "./GiftModal";
import ForwardModal from "./ForwardModal";
import UserProfileModal from "./UserProfileModal";

export default function ChatView({ chat, currentUser, onBack, allChats }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  
  const [activeMenuMsg, setActiveMenuMsg] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editMsg, setEditMsg] = useState<any>(null);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [selectedMsgs, setSelectedMsgs] = useState<string[]>([]);
  
  const [customBg, setCustomBg] = useState<string | null>(null)
  const [bubbleMe, setBubbleMe] = useState('bg-blue-500')
  const [bubbleOther, setBubbleOther] = useState('bg-white dark:bg-[#182533]')

  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setCustomBg(localStorage.getItem('cosma-chat-bg-image'))
    setBubbleMe(localStorage.getItem('cosma-bubble-me') || 'bg-blue-500')
    setBubbleOther(localStorage.getItem('cosma-bubble-other') || 'bg-white dark:bg-[#182533]')
  }, [])

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
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar_color, avatar_url, id, is_premium, username), reply_to:messages!reply_to_id(text, sender_id, profiles(name))')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data.filter(m => !m.expires_at || new Date(m.expires_at).getTime() > new Date().getTime()));
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`chat_${chat.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chat.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    
    if (editMsg) {
      await supabase.from('messages').update({ text, is_edited: true }).eq('id', editMsg.id);
      setEditMsg(null);
      return;
    }

    await supabase.from('messages').insert({ 
      id: crypto.randomUUID(), chat_id: chat.id, sender_id: currentUser.id, text,
      reply_to_id: replyTo ? replyTo.id : null 
    });
    setReplyTo(null);
  };

  const deleteMessage = async (msgId: string) => {
    setActiveMenuMsg(null);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from('messages').delete().eq('id', msgId);
  };

  const pinMessage = async (msg: any) => {
    await supabase.from('messages').update({ is_pinned: false }).eq('chat_id', chat.id);
    await supabase.from('messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id);
    setActiveMenuMsg(null);
    fetchMessages();
  };

  const massDelete = async () => {
    if (!confirm(`Удалить ${selectedMsgs.length} сообщений?`)) return;
    await supabase.from('messages').delete().in('id', selectedMsgs);
    setSelectedMsgs([]);
  };

  const formatText = (text: string) => {
    if (!text) return null;
    let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  let pressTimer: any;
  const handlePressStart = (msg: any) => { if (selectedMsgs.length === 0) pressTimer = setTimeout(() => setActiveMenuMsg(msg), 500); };
  const handlePressEnd = () => clearTimeout(pressTimer);

  const openProfile = async (userId: string) => {
    if (userId === currentUser.id) { setProfileUser(currentUser); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfileUser(data);
  };

  const canShowLastSeen = otherUser?.privacy_settings?.last_seen !== 'nobody';
  const isOnline = canShowLastSeen && otherUser?.last_seen ? (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < 120000 : false;
  const pinnedMsg = messages.find(m => m.is_pinned);

  return (
    <div 
      className="flex flex-col h-full w-full bg-[#e6ebee] dark:bg-[#0e1621] relative bg-cover bg-center"
      style={customBg ? { backgroundImage: `url(${customBg})` } : {}}
    >
      
      <div className="sticky top-0 flex items-center gap-3 p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shrink-0 z-40">
        {selectedMsgs.length > 0 ? (
          <div className="flex-1 flex justify-between items-center px-2">
            <span className="font-bold text-black dark:text-white">Выбрано: {selectedMsgs.length}</span>
            <div className="flex gap-2">
              <button onClick={massDelete} className="text-red-500 p-2">🗑 Удалить</button>
              <button onClick={() => setSelectedMsgs([])} className="text-gray-500 p-2">Отмена</button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={onBack} className="md:hidden p-1 text-2xl text-gray-700 dark:text-white">←</button>
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-xl transition -ml-1"
              onClick={() => openProfile(otherUser?.id || chat.id)}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold relative shrink-0 overflow-hidden" style={{ backgroundColor: otherUser?.avatar_color || chat.avatar_color }}>
                {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.name || chat.name)?.[0]?.toUpperCase()}
                {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="font-semibold text-black dark:text-white flex items-center gap-1 truncate">
                  {otherUser?.name || chat.name} {otherUser?.is_premium && '💎'}
                </div>
                <div className={`text-xs truncate ${isOnline ? 'text-blue-600' : 'text-gray-500'}`}>
                  {!canShowLastSeen ? 'был(а) недавно' : (isOnline ? 'в сети' : 'был(а) недавно')}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {pinnedMsg && (
        <div className="bg-white/90 dark:bg-[#17212b]/95 px-3 py-2 border-b flex items-center gap-3 shrink-0 z-30">
          <div className="w-1 h-8 bg-blue-500 rounded-full" />
          <div className="flex-1 min-w-0"><div className="text-xs text-blue-500 font-bold">Закреплено</div><div className="text-sm text-black dark:text-white truncate">{pinnedMsg.text}</div></div>
          <button onClick={() => pinMessage(pinnedMsg)} className="text-gray-400 p-2">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const isSelected = selectedMsgs.includes(m.id);
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (m.gift) {
            const isNFT = ['🦄', '🛸', '🏆', '💎', '🐉'].includes(m.gift);
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}
                  className={`relative flex flex-col items-center justify-center p-4 min-w-[160px] rounded-3xl shadow-xl border cursor-pointer select-none transition-all ${
                    isSelected ? 'border-red-500 bg-red-500/20' : 
                    isNFT ? 'bg-gradient-to-br from-purple-900 to-black border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : (isMe ? 'rounded-br-sm bg-gradient-to-br from-[#2b3c4f] to-[#1a2530] border-yellow-500/30' : 'rounded-bl-sm bg-gradient-to-br from-white/90 to-gray-100 dark:from-[#182533]/90 dark:to-[#111a24] border-white/20 dark:border-yellow-500/20')
                  }`}>
                  <div className={`absolute top-2 left-3 text-[10px] uppercase font-bold tracking-widest ${isNFT ? 'text-purple-400' : 'text-yellow-500/70'}`}>{isNFT ? '💎 Уникальный NFT' : 'Подарок'}</div>
                  <div className={`text-6xl my-3 drop-shadow-2xl ${isNFT ? 'animate-pulse' : 'animate-bounce'}`}>{m.gift}</div>
                  <div className={`text-[15px] font-bold mb-1 ${isNFT ? 'text-purple-300' : 'text-yellow-500'}`}>{m.text.replace('Подарил ', '')}</div>
                  <div className={`flex items-center justify-end gap-1 text-[11px] w-full ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>{time} {isMe && <span>✓✓</span>}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div onClick={() => selectedMsgs.length > 0 && setSelectedMsgs(p => p.includes(m.id) ? p.filter(i => i !== m.id) : [...p, m.id])}
                onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}
                className={`relative max-w-[85%] md:max-w-[60%] p-2 rounded-2xl shadow-sm border backdrop-blur-md transition-all cursor-pointer ${
                  isSelected ? 'border-red-500 bg-red-500/20' : 
                  (isMe ? `${bubbleMe} text-white rounded-br-sm border-transparent` : `${bubbleOther} text-black dark:text-white rounded-bl-sm border-white/20 dark:border-white/10`)
                }`}>
                
                {!isMe && (
                  <div 
                    className="text-xs font-bold text-blue-500 mb-1 hover:underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); openProfile(m.sender_id); }}
                  >
                    {m.profiles?.name} {m.profiles?.is_premium && '💎'}
                  </div>
                )}

                {m.reply_to && (
                  <div className={`border-l-4 border-blue-400 pl-2 mb-2 py-1 rounded-r-md text-sm ${isMe ? 'bg-black/20' : 'bg-black/5'}`}>
                    <div className="font-bold text-[11px] opacity-80">{m.reply_to.sender_id === currentUser.id ? 'Вы' : m.reply_to.profiles?.name}</div>
                    <div className="truncate opacity-80">{m.reply_to.text}</div>
                  </div>
                )}
                {m.file_type === 'image' && <img src={m.file_url} className="max-w-full rounded-xl mb-1 max-h-64 object-cover" />}
                {!m.file_type && <div className="text-[15px] leading-snug break-words px-1 pb-1">{formatText(m.text)}</div>}
                <div className={`flex items-center justify-end gap-1 text-[11px] select-none px-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{m.is_pinned && '📌'}{m.is_edited && 'изм.'} {time} {isMe && <span>✓✓</span>}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {activeMenuMsg && (
        <div className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setActiveMenuMsg(null)}>
          <div className="bg-white dark:bg-[#17212b] w-full max-w-md rounded-t-3xl p-4 shadow-2xl pop" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button onClick={() => { setReplyTo(activeMenuMsg); setActiveMenuMsg(null); }} className="flex flex-col items-center p-2 hover:bg-black/5 rounded-xl"><span className="text-2xl mb-1">↩️</span><span className="text-xs text-black dark:text-white">Ответить</span></button>
              <button onClick={() => { setForwardMsg(activeMenuMsg); setActiveMenuMsg(null); }} className="flex flex-col items-center p-2 hover:bg-black/5 rounded-xl"><span className="text-2xl mb-1">➡️</span><span className="text-xs text-black dark:text-white">Переслать</span></button>
              {activeMenuMsg.sender_id === currentUser.id && !activeMenuMsg.gift && (
                <button onClick={() => { setEditMsg(activeMenuMsg); setInput(activeMenuMsg.text); setActiveMenuMsg(null); }} className="flex flex-col items-center p-2 hover:bg-black/5 rounded-xl"><span className="text-2xl mb-1">✏️</span><span className="text-xs text-black dark:text-white">Изменить</span></button>
              )}
              <button onClick={() => { navigator.clipboard.writeText(activeMenuMsg.text); setActiveMenuMsg(null); }} className="flex flex-col items-center p-2 hover:bg-black/5 rounded-xl"><span className="text-2xl mb-1">📋</span><span className="text-xs text-black dark:text-white">Копировать</span></button>
              <button onClick={() => pinMessage(activeMenuMsg)} className="flex flex-col items-center p-2 hover:bg-black/5 rounded-xl"><span className="text-2xl mb-1">📌</span><span className="text-xs text-black dark:text-white">{activeMenuMsg.is_pinned ? 'Открепить' : 'Закрепить'}</span></button>
              <button onClick={() => deleteMessage(activeMenuMsg.id)} className="flex flex-col items-center p-2 hover:bg-red-50 rounded-xl text-red-500"><span className="text-2xl mb-1">🗑</span><span className="text-xs">Удалить</span></button>
            </div>
            <button onClick={() => setActiveMenuMsg(null)} className="w-full py-3 bg-gray-100 dark:bg-white/5 rounded-xl font-medium text-black dark:text-white">Отмена</button>
          </div>
        </div>
      )}

      <div className="p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-t border-white/20 flex flex-col gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        {replyTo && !editMsg && (
          <div className="flex items-center gap-2 bg-black/5 p-2 rounded-xl border-l-4 border-blue-500">
            <div className="flex-1 min-w-0"><div className="text-xs font-bold text-blue-500">Ответ: {replyTo.profiles?.name}</div><div className="text-sm truncate text-black dark:text-white">{replyTo.text}</div></div>
            <button onClick={() => setReplyTo(null)} className="text-gray-500 px-2">✕</button>
          </div>
        )}
        {editMsg && (
          <div className="flex items-center gap-2 bg-black/5 p-2 rounded-xl border-l-4 border-green-500">
            <div className="flex-1 min-w-0"><div className="text-xs font-bold text-green-500">Редактирование</div><div className="text-sm truncate text-black dark:text-white">{editMsg.text}</div></div>
            <button onClick={() => { setEditMsg(null); setInput(''); }} className="text-gray-500 px-2">✕</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => setShowGifts(true)} className="p-3 rounded-full bg-black/5 dark:bg-white/10 text-yellow-600 dark:text-yellow-400 shrink-0 text-xl">🎁</button>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Сообщение..." rows={1} className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 text-[16px] text-black dark:text-white" />
          <button onClick={sendMessage} className={`p-3 rounded-full text-white shrink-0 transition shadow-lg ${editMsg ? 'bg-green-500' : 'bg-blue-500'}`}>{editMsg ? '✓' : '➤'}</button>
        </div>
      </div>

      {showGifts && <GiftModal currentUser={currentUser} chatId={chat.id} receiverId={otherUser?.id} onClose={() => setShowGifts(false)} onGiftSent={fetchMessages} />}
      {forwardMsg && <ForwardModal chats={allChats} currentUser={currentUser} messageToForward={forwardMsg} onClose={() => setForwardMsg(null)} onForwarded={fetchMessages} />}
      {profileUser && <UserProfileModal user={profileUser} currentUser={currentUser} onClose={() => setProfileUser(null)} onSendMessage={() => {}} />}
    </div>
  );
}
