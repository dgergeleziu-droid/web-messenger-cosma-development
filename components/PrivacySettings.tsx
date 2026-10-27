'use client'
import { useState } from 'react'

export default function PrivacySettings({ onClose }: { onClose: () => void }) {
  // Состояния для переключателей (в реальном приложении они должны сохраняться в базу)
  const [settings, setSettings] = useState({
    blacklist: '241',
    activeSites: '6',
    passcode: 'Нет',
    cloudPassword: 'Вкл',
    accessKeys: 'Вкл',
    autoDelete: 'Нет',
    phoneNumber: 'Никто (+14)',
    lastSeen: 'Контакты',
    profilePhotos: 'Все',
    bio: 'Все',
    gifts: 'Все',
    birthday: 'Контакты',
    savedMusic: 'Все',
    forwards: 'Все',
    calls: 'Все',
    voiceMessages: 'Все',
    messages: 'Все',
    invites: 'Все',
  })

  const handleSelect = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="absolute inset-0 z-[70] bg-[#0e1621] text-white flex flex-col" onClick={onClose}>
      <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Шапка */}
        <div className="sticky top-0 bg-[#0e1621] z-10 p-4 border-b border-white/10 flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">←</button>
          <h1 className="text-lg font-semibold">Конфиденциальность</h1>
        </div>

        <div className="p-4 space-y-6">
          
          {/* Блок 1: Безопасность */}
          <div className="bg-[#17212b] rounded-2xl overflow-hidden">
            <SettingItem icon="🛑" bg="bg-red-500" title="Чёрный список" value={settings.blacklist} />
            <SettingItem icon="🌐" bg="bg-blue-500" title="Активные сайты" value={settings.activeSites} />
            <SettingItem icon="🔐" bg="bg-green-500" title="Код-пароль и Face ID" value={settings.passcode} />
            <SettingItem icon="🔒" bg="bg-yellow-500" title="Облачный пароль" value={settings.cloudPassword} />
            <SettingItem icon="🔑" bg="bg-purple-500" title="Ключи доступа" value={settings.accessKeys} />
            <SettingItem icon="⏱️" bg="bg-pink-500" title="Автоудаление сообщений" value={settings.autoDelete} last />
          </div>
          <p className="text-xs text-gray-400 px-2 -mt-4 mb-4">
            Автоматически удалять сообщения спустя указанное время у всех участников во всех чатах, созданных после включения настройки.
          </p>

          {/* Блок 2: Почта */}
          <div className="bg-[#17212b] rounded-2xl overflow-hidden">
            <SettingItem icon="@" bg="bg-indigo-500" title="Почта для входа" value="" last />
          </div>
          <p className="text-xs text-gray-400 px-2 -mt-4 mb-4">
            Укажите адрес электронной почты для отправки проверочных кодов Telegram.
          </p>

          {/* Блок 3: Приватность */}
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mt-6">Конфиденциальность</h2>
          <div className="bg-[#17212b] rounded-2xl overflow-hidden">
            <SettingItem icon="📞" bg="bg-blue-500" title="Номер телефона" value={settings.phoneNumber} />
            <SettingItem icon="⏰" bg="bg-teal-500" title="Время захода" value={settings.lastSeen} />
            <SettingItem icon="🖼️" bg="bg-orange-500" title="Фотографии профиля" value={settings.profilePhotos} />
            <SettingItem icon="📝" bg="bg-gray-500" title="Раздел «О себе»" value={settings.bio} />
            <SettingItem icon="🎁" bg="bg-yellow-500" title="Подарки" value={settings.gifts} />
            <SettingItem icon="🎂" bg="bg-pink-500" title="День рождения" value={settings.birthday} />
            <SettingItem icon="🎵" bg="bg-purple-500" title="Сохранённая музыка" value={settings.savedMusic} />
            <SettingItem icon="➡️" bg="bg-blue-500" title="Пересылка сообщений" value={settings.forwards} />
            <SettingItem icon="📞" bg="bg-green-500" title="Звонки" value={settings.calls} />
            <SettingItem icon="🎤" bg="bg-red-500" title="Голосовые сообщения" value={settings.voiceMessages} />
            <SettingItem icon="💬" bg="bg-blue-500" title="Сообщения" value={settings.messages} />
            <SettingItem icon="✉️" bg="bg-gray-500" title="Приглашения" value={settings.invites} last />
          </div>
          <p className="text-xs text-gray-400 px-2 mt-2">
            Вы можете выбрать, кому разрешаете приглашать Вас в группы и каналы.
          </p>

        </div>
      </div>
    </div>
  )
}

// Вспомогательный компонент для строки настройки
function SettingItem({ icon, bg, title, value, last }: { icon: string, bg: string, title: string, value: string, last?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer ${!last ? 'border-b border-white/5' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${bg}`}>
          {icon}
        </div>
        <span className="text-[15px] font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        {value && <span>{value}</span>}
        <span>›</span>
      </div>
    </div>
  )
}
