'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GiftModal from "./GiftModal";
import ForwardModal from "./ForwardModal";
import UserProfileModal from "./UserProfileModal";
import StickerEmojiPicker from "./StickerEmojiPicker";

export default function ChatView({ chat, currentUser, onBack, allChats, onUpdateUser }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null); 
  
  const [activeMenuMsg, setActiveMenuMsg] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editMsg, setEditMsg] = useState<any>(null);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [selectedMsgs, setSelectedMsgs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [otherWornGift, setOtherWornGift] = useState<any>(null);
  const [customBg, setCustomBg] = useState<string | null>(null)
  const [bubbleMe, setBubbleMe] = useState('bg-blue-500')
  const [bubbleOther, setBubbleOther] = useState('bg-white dark:bg-[#182533]')

  // --- ЗАПИСЬ ГОЛОСА/ВИДЕО ---
  const [recordingMode, setRecordingMode] = useState<'voice' | 'video_note' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          if (other) {
            setOtherUser(other.profiles);
            if (other.profiles.worn_gift_id) {
              const { data: giftData } = await supabase.from('user_gifts').select('*, gift_catalog(emoji)').eq('id', other.profiles.worn_gift_id).single();
              if (giftData) setOtherWornGift(giftData);
            }
          }
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
    setShowPicker(false);
  };

  const sendSticker = async (url: string) => {
    await supabase.from('messages').insert({ 
      id: crypto.randomUUID(), chat_id: chat.id, sender_id: currentUser.id, 
      text: '', file_url: url, file_type: 'sticker' 
    });
    setShowPicker(false);
  };

  const startRecording = async (mode: 'voice' | 'video_note') => {
    try {
      setRecordingMode(mode);
      chunksRef.current = [];
      setRecordingTime(0);

      const constraints = mode === 'voice' 
        ? { audio: true } 
        : { audio: true, video: { facingMode: 'user', width: 480, height: 480 } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (mode === 'video_note') {
        setVideoStream(stream);
        setTimeout(() => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
        }, 100);
      }

      // ВЫБИРАЕМ ПРАВИЛЬНЫЙ ФОРМАТ (mp4 для iPhone, webm для остальных)
      const mimeType = mode === 'voice' 
        ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4')
        : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm');

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        setRecordingMode(null);
        setIsRecording(false);

        if (blob.size < 100) return;

        setUploading(true);
        // Сохраняем с правильным расширением
        const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filePath = `${chat.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error } = await supabase.storage.from('chat_media').upload(filePath, blob);
        if (!error) {
          const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);
          await supabase.from('messages').insert({
            id: crypto.randomUUID(), chat_id: chat.id, sender_id: currentUser.id,
            text: mode === 'voice' ? 'Голосовое сообщение' : 'Видеосообщение',
            file_url: data.publicUrl, file_type: mode
          });
          fetchMessages();
        }
        setUploading(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15 && mode === 'video_note') {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      alert('Ошибка доступа к камере/микрофону. Разрешите доступ в браузере.');
      setRecordingMode(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    clearInterval(timerRef.current);
    setRecordingMode(null);
    setIsRecording(false);
    setVideoStream(null);
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${chat.id}/${crypto.randomUUID()}.${fileExt}`;
      const isImage = file.type.startsWith('image/');

      const { error: uploadError } = await supabase.storage.from('chat_media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

      await supabase.from('messages').insert({
        id: crypto.randomUUID(), chat_id: chat.id, sender_id: currentUser.id,
        text: isImage ? '📷 Фотография' : `📎 ${file.name}`,
        file_url: data.publicUrl, file_type: isImage ? 'image' : 'file'
      });
      
      fetchMessages();
    } catch (error: any) {
      alert('Ошибка при загрузке файла: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  const isOnline = otherUser?.last_seen ? (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < 120000 : false;
  const pinnedMsg = messages.find(m => m.is_pinned);

  const openProfile = async (userId: string) => {
    if (userId === currentUser.id) { setProfileUser(currentUser); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfileUser(data);
  };

  const getStatusEmoji = (user: any) => {
    if (!user?.is_premium) return null;
    return user.status_emoji || '💎';
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#e6ebee] dark:bg-[#0e1621] relative bg-cover bg-center" style={customBg ? { backgroundImage: `url(${customBg})` } : {}}>
      
      {/* ШАПКА */}
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
            <div className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-xl transition -ml-1" onClick={() => openProfile(otherUser?.id || chat.id)}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold relative shrink-0 overflow-hidden" style={{ backgroundColor: otherUser?.avatar_color || chat.avatar_color }}>
                {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.name || chat.name)?.[0]?.toUpperCase()}
                {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="font-semibold text-black dark:text-white flex items-center gap-1 truncate">
                  {otherUser?.name || chat.name} 
                  {otherWornGift && <span className="text-sm">{otherWornGift.gift_catalog?.emoji}</span>}
                  {getStatusEmoji(otherUser) && <span>{getStatusEmoji(otherUser)}</span>}
                </div>
                <div className={`text-xs truncate ${isOnline ? 'text-blue-600' : 'text-gray-500'}`}>{isOnline ? 'в сети' : 'был(а) недавно'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ОКНО ЗАПИСИ КРУЖОЧКА */}
      {recordingMode === 'video_note' && (
        <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
            <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold text-xl drop-shadow-md">
              {formatTime(recordingTime)} / 0:15
            </div>
          </div>
          <div className="flex gap-6 mt-10">
            <button onClick={cancelRecording} className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">✕</button>
            <button onClick={stopRecording} className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">✓</button>
          </div>
        </div>
      )}

      {/* СПИСОК СООБЩЕНИЙ */}
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
                  <div className={`text-[15px] font-bold mb-1 text-center ${isNFT ? 'text-purple-300' : 'text-yellow-500'}`}>{m.text}</div>
                  <div className={`flex items-center justify-end gap-1 text-[11px] w-full ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>{time} {isMe && <span>✓✓</span>}</div>
                </div>
              </div>
            );
          }

          if (m.file_type === 'sticker') {
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}
                  className={`relative max-w-[150px] cursor-pointer ${isSelected ? 'ring-4 ring-red-500 rounded-xl' : ''}`}>
                  <img src={m.file_url} className="w-full h-auto drop-shadow-md" />
                  <div className={`flex items-center justify-end gap-1 text-[10px] px-1 ${isMe ? 'text-gray-500' : 'text-gray-500'}`}>{time} {isMe && <span>✓✓</span>}</div>
                </div>
              </div>
            );
          }

          if (m.file_type === 'voice') {
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}
                  className={`flex items-center gap-3 p-2 px-3 rounded-2xl shadow-sm border cursor-pointer transition-all ${isMe ? `${bubbleMe} text-white rounded-br-sm border-transparent` : `${bubbleOther} text-black dark:text-white rounded-bl-sm border-white/20`}`}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">▶️</div>
                  <div className="flex flex-col gap-1 w-32">
                    <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-1/3"></div>
                    </div>
                    <div className="flex justify-between text-[10px] opacity-70">
                      <span>0:00</span><span>0:12</span>
                    </div>
                  </div>
                  <div className={`flex items-center justify-end gap-1 text-[11px] select-none ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{time} {isMe && <span>✓✓</span>}</div>
                </div>
              </div>
            );
          }

          // РЕНДЕР КРУЖОЧКА (С КАСТОМНОЙ КНОПКОЙ PLAY)
          if (m.file_type === 'video_note') {
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative w-48 h-48 rounded-full overflow-hidden shadow-lg border-2 bg-black ${isMe ? 'border-blue-400' : 'border-gray-300'}`}>
                  <video 
                    src={m.file_url} 
                    className="w-full h-full object-cover" 
                    playsInline
                    loop 
                    style={{ transform: 'scaleX(-1)' }} // Переворачиваем для нормального вида
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                        if (video?.paused) video.play(); else video?.pause();
                      }}
                      className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white text-3xl hover:bg-black/60 transition"
                    >
                      ▶
                    </button>
                  </div>
                  <div className={`absolute bottom-2 left-0 right-0 text-center text-[10px] text-white font-bold drop-shadow-md`}>{time}</div>
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
                  <div className="text-xs font-bold text-blue-500 mb-1 hover:underline cursor-pointer flex items-center gap-1" onClick={(e) => { e.stopPropagation(); openProfile(m.sender_id); }}>
                    {m.profiles?.name} {getStatusEmoji(m.profiles)}
                  </div>
                )}

                {m.file_type === 'image' && <img src={m.file_url} className="max-w-full rounded-xl mb-1 max-h-64 object-cover cursor-pointer" onClick={() => window.open(m.file_url, '_blank')} />}
                {m.file_type === 'file' && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl mb-1 ${isMe ? 'bg-blue-600/50' : 'bg-black/5 dark:bg-white/10'}`}>
                    <span className="text-2xl">📄</span><span className="text-sm underline truncate">{m.text.replace('📎 ', '')}</span>
                  </a>
                )}

                {!m.file_type && <div className="text-[15px] leading-snug break-words px-1 pb-1">{formatText(m.text)}</div>}
                
                <div className={`flex items-center justify-end gap-1 text-[11px] select-none px-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                  {m.is_pinned && '📌'}{m.is_edited && 'изм.'} {time} {isMe && <span>✓✓</span>}
                </div>
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
              {activeMenuMsg.sender_id === currentUser.id && !activeMenuMsg.gift && activeMenuMsg.file_type !== 'sticker' && activeMenuMsg.file_type !== 'video_note' && activeMenuMsg.file_type !== 'voice' && (
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

      {showPicker && (
        <StickerEmojiPicker 
          currentUser={currentUser} 
          onSelectEmoji={(emoji: string) => setInput(prev => prev + emoji)} 
          onSelectSticker={sendSticker}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ПАНЕЛЬ ВВОДА */}
      <div className="p-2 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-t border-white/20 flex flex-col gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))] relative">
        
        {recordingMode === 'voice' && isRecording ? (
           <div className="flex items-center justify-between w-full h-12 px-4 bg-red-500/10 rounded-2xl">
             <span className="text-red-500 font-bold animate-pulse">● Идет запись... {formatTime(recordingTime)}</span>
             <div className="flex gap-2">
               <button onClick={cancelRecording} className="px-3 py-1 bg-gray-200 dark:bg-white/10 rounded-lg text-sm">Отмена</button>
               <button onClick={stopRecording} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm">Отправить</button>
             </div>
           </div>
        ) : (
          <div className="flex items-end gap-1">
            <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" accept="image/*,application/pdf,.doc,.docx,.zip" />
            
            <button onClick={() => setShowPicker(!showPicker)} className={`p-2.5 rounded-full shrink-0 text-lg transition ${showPicker ? 'bg-blue-500/20 text-blue-500' : 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/10'}`}>😊</button>
            
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 shrink-0 text-lg hover:bg-black/10 transition">{uploading ? '⏳' : '📎'}</button>
            
            <button onClick={() => setShowGifts(true)} className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-yellow-600 dark:text-yellow-400 shrink-0 text-lg">🎁</button>
            
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Сообщение..." rows={1} className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-3xl px-4 py-3 min-h-[44px] outline-none resize-none max-h-32 text-[16px] text-black dark:text-white" />
            
            {!input.trim() ? (
              <div className="flex shrink-0">
                <button onClick={() => startRecording('voice')} className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-blue-500 text-lg mr-1">🎤</button>
                <button onClick={() => startRecording('video_note')} className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-blue-500 text-lg">📹</button>
              </div>
            ) : (
              <button onClick={sendMessage} className={`p-2.5 rounded-full text-white shrink-0 transition shadow-lg ${editMsg ? 'bg-green-500' : 'bg-blue-500'}`}>➤</button>
            )}
          </div>
        )}
      </div>

      {showGifts && <GiftModal currentUser={currentUser} chatId={chat.id} receiverId={otherUser?.id} onClose={() => setShowGifts(false)} onGiftSent={fetchMessages} onUpdateUser={onUpdateUser} />}
      {forwardMsg && <ForwardModal chats={allChats} currentUser={currentUser} messageToForward={forwardMsg} onClose={() => setForwardMsg(null)} onForwarded={fetchMessages} />}
      {profileUser && <UserProfileModal user={profileUser} currentUser={currentUser} onClose={() => setProfileUser(null)} onSendMessage={() => {}} />}
    </div>
  );
}
