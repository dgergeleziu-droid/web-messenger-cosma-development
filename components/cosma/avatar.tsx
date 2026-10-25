/* eslint-disable @next/next/no-img-element */
import { Bookmark, Megaphone, Users } from 'lucide-react'
import { avatarGradient, initials } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

export function Avatar({
  name,
  seed,
  src,
  size = 54,
  online,
  kind,
  className,
}: {
  name: string
  seed: string | number
  src?: string | null
  size?: number
  online?: boolean
  kind?: 'saved' | 'group' | 'channel' | 'private'
  className?: string
}) {
  const iconSize = Math.round(size * 0.46)
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="size-full rounded-full object-cover" draggable={false} />
      ) : (
        <div
          className="flex size-full select-none items-center justify-center rounded-full font-medium text-white"
          style={{
            background: kind === 'saved' ? 'linear-gradient(180deg,#72d5fd 0%,#2a9ef1 100%)' : avatarGradient(seed),
            fontSize: size * 0.38,
          }}
          aria-hidden
        >
          {kind === 'saved' ? (
            <Bookmark style={{ width: iconSize, height: iconSize }} fill="currentColor" />
          ) : name ? (
            initials(name)
          ) : kind === 'channel' ? (
            <Megaphone style={{ width: iconSize, height: iconSize }} />
          ) : (
            <Users style={{ width: iconSize, height: iconSize }} />
          )}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-online"
          style={{ width: Math.max(12, size * 0.26), height: Math.max(12, size * 0.26) }}
        >
          <span className="sr-only">в сети</span>
        </span>
      )}
    </div>
  )
}
