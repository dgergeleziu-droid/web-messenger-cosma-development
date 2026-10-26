'use client'
import { createClient } from '@/lib/supabase/client'

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '🙏', '💯']

export default function ReactionModal({ messageId, currentReactions, onClose, onReacted }: { messageId: string, currentReactions: any, onClose: () => void, onReacted: () => void }) {
  const supabase = createClient()

  const addReaction = async (emoji: string) => {
    const newReactions = { ...currentReactions }
    
    if (newReactions[emoji]) {
      // Если уже есть, убираем (toggle)
      newReactions[emoji] = newReactions[emoji].filter((id: string) => id !== (supabase.auth.getUser() as any).id)
      if (newReactions[emoji].length === 0) delete newReactions[emoji]
    } else {
      // Если нет, добавляем
      const { data: { user } } = await supabase.auth.getUser()
      if (user) newReactions[emoji] = [user.id]
    }

    await supabase.from('messages').update({ reactions: newReactions }).eq('id', messageId)
    onReacted()
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-xl rounded-full p-3 flex gap-2 shadow-2xl border border-white/20 max-w-sm flex-wrap justify-center" onClick={e => e.stopPropagation()}>
        {EMOJIS.map(emoji => (
          <button 
            key={emoji} 
            onClick={() => addReaction(emoji)} 
            className="text-3xl hover:scale-125 transition-transform p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
