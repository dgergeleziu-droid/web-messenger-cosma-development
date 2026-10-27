'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChatView({ chat, currentUser, onBack }: any) {
  const [input, setInput] = useState("");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* ЭТА КРАСНАЯ ПОЛОСА ДОЛЖНА БЫТЬ САМОЙ ПЕРВОЙ СВЕРХУ */}
      <div style={{ backgroundColor: 'red', color: 'white', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
        ТЕСТ ВЕРХА - ЕСЛИ ТЫ ЭТО ВИДИШЬ, КОД ОБНОВИЛСЯ
      </div>

      {/* ШАПКА С ИМЕНЕМ */}
      <div style={{ backgroundColor: 'blue', color: 'white', padding: '20px' }}>
        <h2>Шапка: {chat?.name || "Имя не загрузилось"}</h2>
        <button onClick={onBack}>Назад</button>
      </div>

      {/* ПУСТОЕ МЕСТО ДЛЯ СООБЩЕНИЙ */}
      <div style={{ flex: 1, backgroundColor: 'gray', minHeight: 0 }}>
        Тут будут сообщения
      </div>

      {/* ПАНЕЛЬ ВВОДА - ОНА ДОЛЖНА БЫТЬ В САМОМ НИЗУ */}
      <div style={{ backgroundColor: 'green', padding: '10px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Поле ввода (оно должно быть снизу)" style={{ width: '100%', padding: '10px' }} />
      </div>

    </div>
  );
}
