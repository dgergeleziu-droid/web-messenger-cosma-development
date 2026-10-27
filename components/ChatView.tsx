'use client'
import { useState } from "react";

interface ChatViewProps {
  chat: any;
  currentUser: any;
  onBack: () => void;
}

export default function ChatView({ chat, currentUser, onBack }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [messages] = useState([
    { id: 1, text: "Привет! Это тест.", sender_id: "other" },
    { id: 2, text: "Проверка верстки.", sender_id: "me" }
  ]);

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#0e1621]">
      
      <div className="h-14 bg-blue-500 text-white flex items-center px-4 shrink-0">
        <button onClick={onBack} className="md:hidden mr-2 text-2xl">←</button>
        <h2 className="font-bold">{chat?.name || "Чат"}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-[#17212b] flex flex-col gap-2">
        {messages.map(m => (
          <div 
            key={m.id} 
            className={`p-2 rounded-lg max-w-[80%] ${
              m.sender_id === "me" ? 'bg-blue-500 text-white self-end' : 'bg-white dark:bg-[#182533] text-black dark:text-white self-start'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="p-2 bg-white dark:bg-[#17212b] border-t border-gray-200 dark:border-gray-700 shrink-0 flex gap-2">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Сообщение..." 
          className="flex-1 p-2 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-black dark:text-white outline-none" 
        />
        <button className="p-2 px-4 bg-blue-500 text-white rounded-xl">Send</button>
      </div>

    </div>
  );
}
