"use client";
import { useState, useEffect } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";
import Profile from "../components/Profile";
import NewChatModal from "../components/NewChatModal";
import SettingsModal from "../components/SettingsModal";
import CreateChatModal from "../components/CreateChatModal";
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  
  const supabase = createClient();

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile || { id: user.id, name: user.email?.split('@')[0], avatar_color: '#2aabee' });
    }
  };

  const fetchChats = async () => {
    if (!currentUser) return;
    // Получаем чаты, где состоит текущий пользователь
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('chat_id, chats(*)')
      .eq('user_id', currentUser.id);
      
    if (participants) {
      const userChats = participants.map((p: any) => p.chats);
      setChats(userChats);
    }
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if(currentUser) fetchChats(); }, [currentUser]);

  // Создание или открытие личного чата
  const handleSelectUser = async (otherUser: any) => {
    setShowNewChat(false);
    
    // 1. Ищем, есть ли уже чат с этим человеком
    const existingChat = chats.find(c => c.type === 'private' && c.name === otherUser.name);
    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    // 2. Если нет — создаем новый чат в базе
    const { data: newChat, error } = await supabase.from('chats').insert({
      type: 'private',
      name: otherUser.name,
      avatar_color: otherUser.avatar_color || '#2aabee'
    }).select().single();

    if (newChat && !error) {
      // 3. Добавляем участников
      await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: currentUser.id },
        { chat_id: newChat.id, user_id: otherUser.id }
      ]);
      fetchChats(); // Обновляем список
      setActiveChat(newChat);
    }
  };

  const handleChatCreated = async (newChat: any) => {
    fetchChats();
    setActiveChat(newChat);
  };

  if (!currentUser) return <div className="h-screen flex items-center justify-center text-black dark:text-white text-xl font-semibold">Загрузка Cosma...</div>;

  return (
    <main className="flex h-screen w-full overflow-hidden relative">
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
        <Profile 
          user={currentUser} onClose={() => setShowProfile(false)} 
          onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} onOpenCreateChat={() => setShowCreateChat(true)}
        />
      )}
      {showNewChat && <NewChatModal currentUser={currentUser} onClose={() => setShowNewChat(false)} onSelectUser={handleSelectUser} />}
      {showSettings && <SettingsModal currentUser={currentUser} onClose={() => setShowSettings(false)} onUpdate={fetchUser} />}
      {showCreateChat && <CreateChatModal currentUser={currentUser} onClose={() => setShowCreateChat(false)} onCreated={handleChatCreated} />}
    </main>
  );
}
