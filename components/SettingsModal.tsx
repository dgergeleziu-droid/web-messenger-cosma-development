'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsModal({ currentUser, onClose, onUpdate }: { currentUser: any, onClose: () => void, onUpdate: () => void }) {
  const [name, setName] = useState(currentUser.name || '')
  const [username, setUsername] = useState(currentUser.username || '')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Загрузка аватарки в хранилище Supabase
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return
      
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      // Уникальное имя файла для каждого пользователя
      const filePath = `${currentUser.id}-${Math.random()}.${fileExt}`

      // Загружаем файл
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Получаем публичную ссылку на фото
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    } catch (error: any) {
      alert('Ошибка загрузки фото: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    
    // Сохраняем ВСЕ поля в базу
    const { error } = await supabase
      .from('profiles')
      .update({ 
        name, 
        username: username.replace('@', ''), 
        phone,
        avatar_url: avatarUrl
      })
      .eq('id', currentUser.id)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onUpdate() // Обновляем данные на главной странице
      onClose()
    }
  }

  return (
    <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/80 dark:bg-[#17212b]/90 backdrop-blur-2xl rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Настройки профиля</h2>
        
        {/* Загрузка аватарки */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-lg relative overflow-hidden group cursor-pointer border-2 border-white/50" 
            style={{ backgroundColor: currentUser.avatar_color || '#2aabee' }}
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{name?.[0]?.toUpperCase()}</span>
            )}
            {/* Затемнение при наведении */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm">Изменить</span>
            </div>
          </div>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/*" 
            onChange={uploadAvatar} 
            disabled={uploading} 
            className="hidden" 
          />
          <span className="text-xs text-gray-500">{uploading ? 'Загрузка...' : 'Нажмите, чтобы сменить фото'}</span>
        </div>

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Имя (Никнейм)</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder="Ваше имя"
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" 
        />

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Юзернейм (@)</label>
        <input 
          type="text" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          placeholder="username"
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" 
        />

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Номер телефона</label>
        <input 
          type="tel" 
          value={phone} 
          onChange={e => setPhone(e.target.value)}
          placeholder="+7 999 000-00-00"
          className="w-full bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 mb-4 outline-none text-black dark:text-white" 
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button onClick={handleSave} disabled={loading || uploading} className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition disabled:opacity-50 shadow-lg">
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
