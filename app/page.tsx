"use client";
import { useState, useEffect } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";
import Profile from "../components/Profile";
import NewChatModal from "../components/NewChatModal";
import { createClient } from '@/lib/supabase/client'

export type Message = { id: string; text: string; senderId: string; time: string; status: "sent"|"read" };
export type Chat = { id: string; name: string; avatar: string; lastMsg: string; time: string; unread: number; online: boolean; messages: Message[] };

export default function Home() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile || { id: user.id, name: user.email?.split('@')[0], avatar_color: '#2aabee' });
      }
    };
    getUser();
  }, [supabase]);

  const handleSelectUser = async (otherUser: any) => {
    setShowNewChat(false);
    
    const existingChat = chats.find(c => c.name === otherUser.name);
    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    const newChat: Chat = {
      id: Date.now().toString(),
      name: otherUser.name,
      avatar: otherUser.avatar_color || '#2aabee',
      lastMsg: '',
      time: '',
      unread: 0,
      online: true,
      messages: []
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
  };

  if (!currentUser) return <div className="h-screen flex items-center justify-center bg-[#0e1621] text-white">Загрузка...</div>;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0e1621] text-black dark:text-white relative">
      
      <div className={`w-full md:w-[350px] shrink-0 h-full border-r border-gray-200 dark:border-[#242f3d] ${activeChat ? "hidden md:block" : "block"}`}>
        <ChatList 
          chats={chats} 
          activeId={activeChat?.id || null} 
          onSelect={setActiveChat} 
          user={currentUser}
          onOpenProfile={() => setShowProfile(true)}
          onOpenNewChat={() => setShowNewChat(true)}
        />
      </div>

      <div className={`flex-1 h-full ${activeChat ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
        {activeChat ? (
          <ChatView chat={activeChat} onBack={() => setActiveChat(null)} />
        ) : (
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">Cosma</h2>
            <p>Выберите чат или найдите нового собеседника</p>
          </div>
        )}
      </div>

      {showProfile && <Profile user={currentUser} onClose={() => setShowProfile(false)} />}
      {showNewChat && <NewChatModal currentUser={currentUser} onClose={() => setShowNewChat(false)} onSelectUser={handleSelectUser} />}
    </main>
  );
}
