import { useState, useRef, useEffect } from "react";
import { Chat, Message } from "../app/page";

export default function ChatView({ chat, onBack }: { chat: Chat, onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text: input, senderId: "me", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), status: "sent" };
    setMessages([...messages, newMsg]);
    setInput("");

    // Имитация ответа собеседника
    setTimeout(() => {
      const reply: Message = { id: Date.now().toString(), text: "Ага, понял! 👍", senderId: chat.id, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), status: "read" };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#e6ebee] dark:bg-[#0e1621]">
      {/* Шапка чата */}
      <div className="flex items-center gap-3 p-2 px-3 bg-white dark:bg-[#17212b] border-b border-gray-200 dark:border-[#242f3d] shrink-0">
        <button onClick={onBack} className="md:hidden p-1 text-xl">←</button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: chat.avatar }}>
          {chat.name[0]}
        </div>
        <div>
          <div className="font-semibold">{chat.name}</div>
          <div className="text-xs text-[#2aabee]">{chat.online ? "онлайн" : "был(а) недавно"}</div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        {messages.map(m => {
          const isMe = m.senderId === "me";
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[60%] px-3 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-[#effdde] dark:bg-[#2b5278] rounded-br-sm' : 'bg-white dark:bg-[#182533] rounded-bl-sm'}`}>
                <div className="text-[15px] leading-snug break-words pb-1">{m.text}</div>
                <div className="flex items-center justify-end gap-1 text-[11px] text-gray-500 dark:text-gray-400 select-none">
                  {m.time}
                  {isMe && <span className={m.status === "read" ? "text-[#2aabee]" : ""}>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-2 bg-white dark:bg-[#17212b] flex items-end gap-2 shrink-0">
        <textarea 
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Сообщение" rows={1}
          className="flex-1 bg-gray-100 dark:bg-[#242f3d] rounded-2xl px-4 py-2.5 outline-none resize-none max-h-32 text-[15px]"
        />
        <button onClick={sendMessage} className="p-2.5 rounded-full bg-[#2aabee] text-white shrink-0 hover:opacity-90 transition text-xl">
          ➤
        </button>
      </div>
    </div>
  );
}
