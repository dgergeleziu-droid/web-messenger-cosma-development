"use client";
import { useState } from "react";
import ChatList from "../components/ChatList";
import ChatView from "../components/ChatView";

export type Message = { id: string; text: string; senderId: string; time: string; status: "sent"|"read" };
export type Chat = { id: string; name: string; avatar: string; lastMsg: string; time: string; unread: number; online: boolean; messages: Message[] };

const MOCK_CHATS: Chat[] = [
  { id: "1", name: "Алиса", avatar: "#E17076", lastMsg: "Привет! Как дела?", time: "12:30", unread: 2, online: true, 
    messages: [
      { id: "m1", text: "Привет! Это Cosma 🚀", senderId: "1", time: "12:20", status: "read" },
      { id: "m2", text: "Круто выглядит!", senderId: "me", time: "12:22", status: "read" },
      { id: "m3", text: "Привет! Как дела?", senderId: "1", time: "12:30", status: "read" }
    ] 
  },
  { id: "2", name: "Сохранённое", avatar: "#2aabee", lastMsg: "Заметки: купить молоко", time: "Вчера", unread: 0, online: false, 
    messages: [{ id: "m4", text: "Заметки: купить молоко", senderId: "me", time: "Вчера", status: "read" }] 
  }
];

export default function Home() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0e1621] text-black dark:text-white">
      {/* Список чатов: на телефоне скрывается, когда открыт чат */}
      <div className={`w-full md:w-[350px] shrink-0 h-full border-r border-gray-200 dark:border-[#242f3d] ${activeChat ? "hidden md:block" : "block"}`}>
        <ChatList chats={MOCK_CHATS} activeId={activeChat?.id || null} onSelect={setActiveChat} />
      </div>

      {/* Окно чата: на телефоне показывается только когда выбран чат */}
      <div className={`flex-1 h-full ${activeChat ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
        {activeChat ? (
          <ChatView chat={activeChat} onBack={() => setActiveChat(null)} />
        ) : (
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">Cosma</h2>
            <p>Выберите чат, чтобы начать общение</p>
          </div>
        )}
      </div>
    </main>
  );
}
