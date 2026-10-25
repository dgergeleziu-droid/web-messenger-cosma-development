"use client";
import { useState, useEffect, useRef } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";
import Profile from "../components/Profile";
import NewChatModal from "../components/NewChatModal";
import SettingsModal from "../components/SettingsModal";
import CreateChatModal from "../components/CreateChatModal";
import AdminPanel from "../components/AdminPanel";
import NotificationToast from "../components/NotificationToast";
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Состояния для модальных окон
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Состояния для уведомлений (шторка + звук)
  const [notification, setNotification] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const supabase = createClient();

  // 1. Загрузка профиля (создаем, если его нет)
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      // Если профиля нет (старый аккаунт), принудительно создаем
      if (!profile) {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: user.id,
          name: user.email?.split('@')[0] || 'Пользователь',
          avatar_color: '#2aabee',
          stars: 100
        }).select().single();
        profile = newProfile;
      }
      setCurrentUser(profile || { id: user.id, name: 'Пользователь', avatar_color: '#2aabee', stars: 100 });
    }
  };

  // 2. Загрузка списка чатов пользователя
  const fetchChats = async () => {
    if (!currentUser) return;
    const { data: participants, error } = await supabase
      .from('chat_participants')
      .select('chat_id, chats(*)')
      .eq('user_id', currentUser.id);
      
    if (error) {
      console.error("Ошибка загрузки чатов:", error);
      return;
    }

    if (participants) {
      const userChats = participants.map((p: any) => p.chats).filter(Boolean);
      setChats(userChats);
    }
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if(currentUser) fetchChats(); }, [currentUser]);

  // 3. ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ УВЕДОМЛЕНИЙ (Звук + Шторка)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('global_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;

        // Если сообщение от нас, или мы сейчас открыли этот чат — не отвлекаем
        if (newMsg.sender_id === currentUser.id || activeChat?.id === newMsg.chat_id) return;

        // Получаем данные отправителя
        const { data: sender } = await supabase.from('profiles').select('name, avatar_color').eq('id', newMsg.sender_id).single();
        
        if (sender) {
          // Включаем звук (браузеры разрешают звук только после первого клика по сайту)
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => console.log('Звук заблокирован браузером до первого клика'));
          }

          // Показываем выезжающую шторку
          setNotification({
            chatId: newMsg.chat_id,
            name: sender.name,
            avatar_color: sender.avatar_color,
            text: newMsg.gift ? `Подарок: ${newMsg.gift}` : (newMsg.file_type === 'image' ? '📷 Фотография' : newMsg.text),
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeChat, supabase]);

  // 4. Создание личного чата (Обход ошибки RLS)
  const handleSelectUser = async (otherUser: any) => {
    setShowNewChat(false);
    
    const existingChat = chats.find(c => c.type === 'private' && c.name === otherUser.name);
    if (existingChat) { 
      setActiveChat(existingChat); 
      return; 
    }

    const newChatId = crypto.randomUUID();

    const { error: chatError } = await supabase.from('chats').insert({
      id: newChatId,
      type: 'private', 
      name: otherUser.name, 
      avatar_color: otherUser.avatar_color || '#2aabee'
    });

    if (chatError) {
      alert("Ошибка при создании чата: " + chatError.message);
      return;
    }

    const { error: participantError } = await supabase.from('chat_participants').insert([
      { chat_id: newChatId, user_id: currentUser.id },
      { chat_id: newChatId, user_id: otherUser.id }
    ]);

    if (participantError) {
      alert("Ошибка при добавлении в чат: " + participantError.message);
      return;
    }

    const newChatForState = { 
      id: newChatId, 
      type: 'private', 
      name: otherUser.name, 
      avatar_color: otherUser.avatar_color || '#2aabee',
      status_emoji: otherUser.status_emoji 
    };
    setChats(prev => [newChatForState, ...prev]);
    setActiveChat(newChatForState);
  };

  // 5. Обработка создания группы/канала
  const handleChatCreated = (newChat: any) => {
    fetchChats();
    setActiveChat(newChat);
  };

  if (!currentUser) return <div className="h-[100dvh] flex items-center justify-center text-black dark:text-white text-xl font-semibold">Загрузка Cosma...</div>;

  return (
    // Используем h-[100dvh] для правильной высоты на телефонах
    <main className="flex h-[100dvh] w-full overflow-hidden relative" onClick={() => audioRef.current?.load()}>
      
      {/* Звук уведомления */}
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />

      {/* Выезжающая шторка при новом сообщении */}
      <NotificationToast 
        data={notification} 
        onClose={() => setNotification(null)} 
        onClick={() => {
          const chatToOpen = chats.find(c => c.id === notification.chatId);
          if (chatToOpen) setActiveChat(chatToOpen);
          setNotification(null);
        }} 
      />

      {/* Задний фон для эффекта стекла */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#0f172a] dark:to-[#1e1b4b]" />
      
      <div className="flex h-full w-full max-w-[1600px] mx-auto z-10 p-0 md:p-4 gap-4">
        
        {/* Левая панель (Стекло) */}
        <div className={`w-full md:w-[380px] shrink-0 h-full rounded-none md:rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/60 dark:bg-[#17212b]/60 ${activeChat ? "hidden md:block" : "block"}`}>
          <ChatList 
            chats={chats} 
            activeId={activeChat?.id || null} 
            onSelect={setActiveChat} 
            user={currentUser} 
            onOpenProfile={() => setShowProfile(true)} 
            onOpenNewChat={() => setShowNewChat(true)}
          />
        </div>

        {/* Правая панель - Чат (Стекло) */}
        <div className={`flex-1 h-full rounded-none md:rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/40 dark:bg-black/20 ${activeChat ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
          {activeChat ? (
            <ChatView 
              chat={activeChat} 
              currentUser={currentUser} 
              onBack={() => setActiveChat(null)} 
            />
          ) : (
            <div className="text-center text-gray-700 dark:text-gray-300">
              <h2 className="text-4xl font-bold mb-2 tracking-tight">Cosma</h2>
              <p>Выберите чат или создайте новый</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      {showProfile && (
        <Profile 
          user={currentUser} 
          onClose={() => setShowProfile(false)} 
          onOpenNewChat={() => setShowNewChat(true)} 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenCreateChat={() => setShowCreateChat(true)}
          onOpenAdmin={() => setShowAdmin(true)}
        />
      )}
      {showNewChat && (
        <NewChatModal 
          currentUser={currentUser} 
          onClose={() => setShowNewChat(false)} 
          onSelectUser={handleSelectUser} 
        />
      )}
      {showSettings && (
        <SettingsModal 
          currentUser={currentUser} 
          onClose={() => setShowSettings(false)} 
          onUpdate={fetchUser} 
        />
      )}
      {showCreateChat && (
        <CreateChatModal 
          currentUser={currentUser} 
          onClose={() => setShowCreateChat(false)} 
          onCreated={handleChatCreated} 
        />
      )}
      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </main>
  );
}
