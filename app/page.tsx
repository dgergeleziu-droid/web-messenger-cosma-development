"use client";
import { useState, useEffect, useRef } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";
import Profile from "../components/Profile";
import NewChatModal from "../components/NewChatModal";
import SettingsModal from "../components/SettingsModal";
import CreateChatModal from "../components/CreateChatModal";
import AdminPanel from "../components/AdminPanel";
import NotificationToast from "../components/NotificationToast"; // <-- Импортируем шторку
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Состояние для уведомления
  const [notification, setNotification] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const supabase = createClient();

  // ... (fetchUser и fetchChats оставляем без изменений)
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: user.id, name: user.email?.split('@')[0] || 'Пользователь', avatar_color: '#2aabee', stars: 100
        }).select().single();
        profile = newProfile;
      }
      setCurrentUser(profile || { id: user.id, name: 'Пользователь', avatar_color: '#2aabee', stars: 100 });
    }
  };

  const fetchChats = async () => {
    if (!currentUser) return;
    const { data: participants } = await supabase.from('chat_participants').select('chat_id, chats(*)').eq('user_id', currentUser.id);
    if (participants) setChats(participants.map((p: any) => p.chats).filter(Boolean));
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if(currentUser) fetchChats(); }, [currentUser]);

  // ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ УВЕДОМЛЕНИЙ
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('global_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;

        // Если сообщение от нас, или мы сейчас в этом чате — не показываем уведомление
        if (newMsg.sender_id === currentUser.id || activeChat?.id === newMsg.chat_id) return;

        // Получаем данные отправителя
        const { data: sender } = await supabase.from('profiles').select('name, avatar_color').eq('id', newMsg.sender_id).single();
        
        if (sender) {
          // 1. Играем звук
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Браузер заблокировал звук до первого клика'));
          }

          // 2. Показываем шторку
          setNotification({
            chatId: newMsg.chat_id,
            name: sender.name,
            avatar_color: sender.avatar_color,
            text: newMsg.gift ? `Подарок: ${newMsg.gift}` : newMsg.text,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeChat, supabase]);

  // ... (handleSelectUser и handleChatCreated без изменений)
  const handleSelectUser = async (otherUser: any) => {
    setShowNewChat(false);
    const existingChat = chats.find(c => c.type === 'private' && c.name === otherUser.name);
    if (existingChat) { setActiveChat(existingChat); return; }
    const newChatId = crypto.randomUUID();
    await supabase.from('chats').insert({ id: newChatId, type: 'private', name: otherUser.name, avatar_color: otherUser.avatar_color || '#2aabee' });
    await supabase.from('chat_participants').insert([
      { chat_id: newChatId, user_id: currentUser.id },
      { chat_id: newChatId, user_id: otherUser.id }
    ]);
    const newChatForState = { id: newChatId, type: 'private', name: otherUser.name, avatar_color: otherUser.avatar_color || '#2aabee', status_emoji: otherUser.status_emoji };
    setChats(prev => [newChatForState, ...prev]);
    setActiveChat(newChatForState);
  };

  const handleChatCreated = (newChat: any) => { fetchChats(); setActiveChat(newChat); };

  if (!currentUser) return <div className="h-screen flex items-center justify-center text-black dark:text-white text-xl font-semibold">Загрузка Cosma...</div>;

  return (
    <main className="flex h-screen w-full overflow-hidden relative" onClick={() => audioRef.current?.load()}>
      {/* Звук уведомления (используем базовый URL) */}
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />

      {/* Шторка */}
      <NotificationToast 
        data={notification} 
        onClose={() => setNotification(null)} 
        onClick={() => {
          const chatToOpen = chats.find(c => c.id === notification.chatId);
          if (chatToOpen) setActiveChat(chatToOpen);
          setNotification(null);
        }} 
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#0f172a] dark:to-[#1e1b4b]" />
      
      <div className="flex h-full w-full max-w-[1600px] mx-auto z-10 p-0 md:p-4 gap-4">
        
        <div className={`w-full md:w-[380px] shrink-0 h-full rounded-none md:rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/60 dark:bg-[#17212b]/60 ${activeChat ? "hidden md:block" : "block"}`}>
          <ChatList 
            chats={chats} activeId={activeChat?.id || null} onSelect={setActiveChat} 
            user={currentUser} onOpenProfile={() => setShowProfile(true)} onOpenNewChat={() => setShowNewChat(true)}
          />
        </div>

        <div className={`flex-1 h-full rounded-none md:rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/40 dark:bg-black/20 ${activeChat ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
          {activeChat ? (
            <ChatView chat={activeChat} currentUser={currentUser} onBack={() => setActiveChat(null)} />
          ) : (
            <div className="text-center text-gray-700 dark:text-gray-300">
              <h2 className="text-4xl font-bold mb-2 tracking-tight">Cosma</h2>
              <p>Выберите чат или создайте новый</p>
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <Profile user={currentUser} onClose={() => setShowProfile(false)} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} onOpenCreateChat={() => setShowCreateChat(true)} onOpenAdmin={() => setShowAdmin(true)} />
      )}
      {showNewChat && <NewChatModal currentUser={currentUser} onClose={() => setShowNewChat(false)} onSelectUser={handleSelectUser} />}
      {showSettings && <SettingsModal currentUser={currentUser} onClose={() => setShowSettings(false)} onUpdate={fetchUser} />}
      {showCreateChat && <CreateChatModal currentUser={currentUser} onClose={() => setShowCreateChat(false)} onCreated={handleChatCreated} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </main>
  );
}
