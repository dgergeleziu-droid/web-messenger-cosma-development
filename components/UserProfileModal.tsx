'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UserProfileModal({ user, currentUser, onClose, onSendMessage }: any) {
  const supabase = createClient()
  const [gifts, setGifts] = useState<any[]>([])
  const isMe = user?.id === currentUser?.id

  useEffect(() => {
    if (user?.gifts_inventory) {
      setGifts(user.gifts_inventory)
    }
  }, [user])

  if (!user) return null

  return (
    <div className="absolute inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#17212b] w-full max-w-md md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/20 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        
        <div className={`relative h-32 flex items-end justify-center ${user.is_premium ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gradient-to-r from-blue-400 to-teal-400'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition">
            ✕
          </button>
          
          <div className="absolute -bottom-12 w-24 h-24 rounded-full border-4 border-white dark:border-[#17212b] shadow-xl overflow-hidden bg-gray-200">
            {user.avatar_url && user.privacy_settings?.profile_photo !== 'nobody' ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: user.avatar_color || '#2aabee' }}>
                {user.privacy_settings?.profile_photo === 'nobody' ? '👤' : user.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="pt-16 px-6 pb-6 flex flex-col items-center text-center overflow-y-auto">
          <h2 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
            {user.name} {user.status_emoji && <span>{user.status_emoji}</span>}
            {user.is_premium && <span className="text-yellow-500 text-lg" title="Premium">💎</span>}
          </h2>
          
          <p className="text-blue-500 font-medium mt-1">@{user.username || 'username'}</p>
          
          {user.phone && user.privacy_settings?.phone !== 'nobody' && (
            <p className="text-sm text-gray-500 mt-1">{user.phone}</p>
          )}

          <p className="text-xs text-gray-400 mt-2">
            {user.last_seen ? `Был(а) в сети: ${new Date(user.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Недавно'}
          </p>

          {!isMe && (
            <div className="flex gap-3 mt-6 w-full max-w-xs">
              <button 
                onClick={() => { onSendMessage(user); onClose(); }} 
                className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition shadow-lg flex justify-center items-center gap-2"
              >
                💬 Написать
              </button>
              <button className="px-4 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition">
                📞
              </button>
            </div>
          )}

          {isMe && (
             <div className="flex gap-3 mt-6 w-full max-w-xs">
               <button onClick={() => {}} className="flex-1 bg-gray-100 dark:bg-white/10 text-black dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                 Редактировать профиль
               </button>
             </div>
          )}

          {gifts.length > 0 && (
            <div className="w-full mt-8 text-left">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Коллекция NFT-подарков</h3>
              <div className="grid grid-cols-4 gap-3">
                {gifts.map((gift, idx) => (
                  <div key={idx} className="aspect-square bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30 flex flex-col items-center justify-center p-2">
                    <span className="text-3xl drop-shadow-md">{gift.emoji}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-300 font-bold mt-1 truncate w-full text-center">{gift.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="w-full mt-6 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 text-left">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">О себе</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Люблю Cosma и NFT-подарки 🚀</p>
          </div>
        </div>
      </div>
    </div>
  )
}
