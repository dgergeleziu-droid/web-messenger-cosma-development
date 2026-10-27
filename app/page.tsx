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
import ThemeSettings from "../components/ThemeSettings";
import PrivacySettings from "../components/PrivacySettings";
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
  const [showTheme, setShowTheme] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Уведомления
  const [notification, setNotification] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const supabase = createClient();

  // 1. Загрузка профиля
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

  // 2. Загрузка чатов (с последними сообщениями и локальными именами)
  const fetchChats = async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        chat_id, 
        chats(*, chat_participants(user_id, profiles(name, avatar_url, avatar_color, status_emoji, is_premium)))
      `)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error("Ошибка загрузки чатов:", error);
      return;
    }

    // Загружаем локальные контакты текущего пользователя
    const { data: contacts } = await supabase
      .from('local_contacts')
      .select('contact_id, custom_name')
      .eq('owner_id', currentUser.id);

    if (data) {
      const formattedChats = await Promise.all(data.map(async (item: any) => {
        const chat = item.chats;
        
        // Последнее сообщение
        const { data: lastMsgData } = await supabase
          .from('messages')
          .select('text, file_type, gift, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMsgData) {
          chat.lastMsg = lastMsgData.gift ? `Подарок: ${lastMsgData.gift}` : (lastMsgData.file_type === 'image' ? '📷 Фотография' : lastMsgData.text);
          chat.time = new Date(lastMsgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          chat.lastMsg = 'Нет сообщений';
          chat.time = '';
        }

        // Данные собеседника и кастомное имя
        if (chat.type === 'private' || chat.type === 'secret') {
          const otherParticipant = chat.chat_participants.find((p: any) => p.user_id !== currentUser.id);
          if (otherParticipant && otherParticipant.profiles) {
            const localContact = contacts?.find((c: any) => c.contact_id === otherParticipant.user_id);
            
            chat.name = localContact ? localContact.custom_name : otherParticipant.profiles.name;
            chat.avatar_url = otherParticipant.profiles.avatar_url;
            chat.avatar_color = otherParticipant.profiles.avatar_color;
            chat.status_emoji = otherParticipant.profiles.status_emoji;
            chat.is_premium = otherParticipant.profiles.is_premium;
            chat.real_id = otherParticipant.user_id;
            chat.real_name = otherParticipant.profiles.name;
          }
        }
        return chat;
      }));
      setChats(formattedChats);
    }
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if(currentUser) fetchChats(); }, [currentUser]);

  // 3. Глобальные уведомления (звук + шторка)
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('global_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender_id === currentUser.id || activeChat?.id === newMsg.chat_id) return;

        const { data: sender } = await supabase.from('profiles').select('name, avatar_color').eq('id', newMsg.sender_id).single();
        
        if (sender) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => console.log('Звук заблокирован до первого клика'));
          }
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

  // 4. Догрузка при возврате на вкладку
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchChats();
        if (currentUser) supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id).then();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentUser]);

  // 5. Создание личного чата
  const handleSelectUser = async (otherUser: any) => {
    setShowNewChat(false);
    const existingChat = chats.find(c => c.type === 'private' && c.chat_participants?.some((p: any) => p.user_id === otherUser.id));
    if (existingChat) { setActiveChat(existingChat); return; }

    const newChatId = crypto.randomUUID();
    const { error: chatError } = await supabase.from('chats').insert({ id: newChatId, type: 'private', avatar_color: otherUser.avatar_color || '#2aabee' });
    if (chatError) { alert("Ошибка: " + chatError.message); return; }

    await supabase.from('chat_participants').insert([
      { chat_id: newChatId, user_id: currentUser.id },
      { chat_id: newChatId, user_id: otherUser.id }
    ]);
    fetchChats();
  };

  // 6. Обработка создания группы/канала
  const handleChatCreated = () => {
    fetchChats();
    setShowCreateChat(false);
  };

  if (!currentUser) return <div className="h-[100dvh] flex items-center justify-center text-black dark:text-white text-xl font-semibold">Загрузка Cosma...</div>;

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden relative" onClick={() => audioRef.current?.load()}>
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />
      
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
        
        {/* Левая панель */}
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

        {/* Правая панель (Чат) */}
        <div className={`flex-1 h-full rounded-none md:rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/40 dark:bg-black/20 ${activeChat ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
          {activeChat ? (
            <ChatView 
              chat={activeChat} 
              currentUser={currentUser} 
              onBack={() => setActiveChat(null)} 
              allChats={chats} 
              onUpdateUser={fetchUser} 
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
          onOpenTheme={() => setShowTheme(true)} 
          onOpenPrivacy={() => setShowPrivacy(true)} 
        />
      )}
      {showNewChat && <NewChatModal currentUser={currentUser} onClose={() => setShowNewChat(false)} onSelectUser={handleSelectUser} />}
      {showSettings && <SettingsModal currentUser={currentUser} onClose={() => setShowSettings(false)} onUpdate={fetchUser} onOpenPrivacy={() => setShowPrivacy(true)} />}
      {showCreateChat && <CreateChatModal currentUser={currentUser} onClose={() => setShowCreateChat(false)} onCreated={handleChatCreated} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showTheme && <ThemeSettings onClose={() => setShowTheme(false)} />}
      {showPrivacy && <PrivacySettings onClose={() => setShowPrivacy(false)} />}
    </main>
  );
}
