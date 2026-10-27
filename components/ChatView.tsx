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
  const [bubbleMe, setBubbleMe] = useState('bg-blue-500')
  const [bubbleOther, setBubbleOther] = useState('bg-white dark:bg-[#182533]')

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
            const profile = other.profiles as any;
            setOtherUser(profile);
            if (profile?.worn_gift_id) {
              const { data: giftData } = await supabase.from('user_gifts').select('*, gift_catalog(emoji)').eq('id', profile.worn_gift_id).single();
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
        const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filePath = `${chat.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error } = await supabase.storage.from('chat_media').upload(filePath, blob);
        if (!error) {
          const { data } = await supabase.storage.from('chat_media').getPublicUrl(filePath);
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

      const { data } = await supabase.storage.from('chat_media').getPublicUrl(filePath);

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
    <div 
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}
      className="bg-[#e6ebee] dark:bg-[#0e1621]"
    >
      
      {/* 1. ШАПКА (Строго сверху) */}
      <div style={{ flexShrink: 0 }} className="flex items-center gap-3 p-3 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/10 z-40">
        <button onClick={onBack} className="md:hidden p-1 text-2xl text-gray-700 dark:text-white">←</button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: otherUser?.avatar_color || '#2aabee' }}>
            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" /> : (otherUser?.name || chat.name)?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-black dark:text-white">{otherUser?.name || chat.name || "Чат"}</span>
            <span className="text-xs text-blue-500">{isOnline ? 'в сети' : 'был(а) недавно'}</span>
          </div>
        </div>
      </div>

      {/* 2. СООБЩЕНИЯ (Строго по центру) */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="p-4 flex flex-col gap-2 bg-[#e6ebee] dark:bg-[#0e1621]">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">Нет сообщений. Напишите первое!</div>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === currentUser.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[85%] md:max-w-[60%] p-2 rounded-2xl shadow-sm ${isMe ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white dark:bg-[#182533] text-black dark:text-white rounded-bl-sm'}`}>
                {!isMe && <div className="text-xs font-bold text-blue-500 mb-1">{m.profiles?.name}</div>}
                <div className="text-[15px] leading-snug break-words px-1 pb-1">{formatText(m.text)}</div>
                <div className={`flex items-center justify-end gap-1 text-[11px] select-none px-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                  {time} {isMe && <span>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* 3. ПАНЕЛЬ ВВОДА (Строго снизу) */}
      <div style={{ flexShrink: 0 }} className="p-2 bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-xl border-t border-white/20 flex items-end gap-1">
        <button className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 text-lg">😊</button>
        <button className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 text-lg">📎</button>
        <textarea 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} 
          placeholder="Сообщение..." 
          rows={1} 
          className="flex-1 bg-white/50 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-3xl px-4 py-3 min-h-[44px] outline-none resize-none max-h-32 text-[16px] text-black dark:text-white" 
        />
        <button onClick={sendMessage} className="p-2.5 rounded-full bg-blue-500 text-white shrink-0">➤</button>
      </div>

    </div>
  );
}
