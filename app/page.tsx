"use client";
import { useState, useEffect } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";
import Profile from "../components/Profile";
import NewChatModal from "../components/NewChatModal";
import SettingsModal from "../components/SettingsModal";
import CreateChatModal from "../components/CreateChatModal";
import { createClient } from '@/lib/supabase/client'

export type Message = { id: string; text: string; senderId: string; time: string; status: "sent"|"read" };
export type Chat = { id: string; name: string; avatar: string; lastMsg: string; time: string; unread: number; online: boolean; type: string; messages: Message[] };

export default function Home() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Состояния для модалок
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

  useEffect(() => {
    fetchUser();
    // Загружаем реальные чаты из базы (в будущем)
    // Пока для теста оставим пустой массив, если нет чатов
  }, []);

  const handleSelectUser = (otherUser: any) => {
    setShowNewChat(false);
    const newChat: Chat = {
      id: Date.now().toString(), name: otherUser.name, avatar: otherUser.avatar_color || '#2aabee',
      lastMsg: '', time: '', unread: 0, online: true, type: 'private', messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
  };

  const handleChatCreated = (newChat: any) => {
    const chatObj: Chat = {
      id: newChat.id, name: newChat.name, avatar: newChat.avatar_color,
      lastMsg: '', time: '', unread: 0, online: false, type: newChat.type, messages: []
    };
    setChats(prev => [chatObj, ...prev]);
    setActiveChat(chatObj);
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
            <ChatView chat={activeChat} onBack={() => setActiveChat(null)} />
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
          user={currentUser} 
          onClose={() => setShowProfile(false)} 
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCreateChat={() => setShowCreateChat(true)}
        />
      )}
      {showNewChat && <NewChatModal currentUser={currentUser} onClose={() => setShowNewChat(false)} onSelectUser={handleSelectUser} />}
      {showSettings && <SettingsModal currentUser={currentUser} onClose={() => setShowSettings(false)} onUpdate={fetchUser} />}
      {showCreateChat && <CreateChatModal currentUser={currentUser} onClose={() => setShowCreateChat(false)} onCreated={handleChatCreated} />}
    </main>
  );
}
