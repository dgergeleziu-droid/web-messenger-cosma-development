import type { MessageType } from '@/lib/types'

export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (res.status === 401) {
    window.location.href = '/sign-in'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

const AVATAR_COLORS = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
]

export function avatarGradient(seed: string | number) {
  const s = String(seed)
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0
  const [a, b] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  return `linear-gradient(180deg, ${a} 0%, ${b} 100%)`
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatListDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return formatTime(iso)
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' })
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function formatDayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Сегодня'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Вчера'
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function formatLastSeen(iso: string | null, online: boolean) {
  if (online) return 'в сети'
  if (!iso) return 'был(а) давно'
  const d = new Date(iso)
  const now = new Date()
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 1) return 'был(а) только что'
  if (mins < 60) return `был(а) ${mins} мин. назад`
  if (sameDay(d, now)) return `был(а) сегодня в ${formatTime(iso)}`
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return `был(а) вчера в ${formatTime(iso)}`
  return `был(а) ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatBytes(n?: number) {
  if (!n) return ''
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}

export function pluralMembers(n: number, kind: 'group' | 'channel' = 'group') {
  const mod10 = n % 10
  const mod100 = n % 100
  const forms = kind === 'channel' ? ['подписчик', 'подписчика', 'подписчиков'] : ['участник', 'участника', 'участников']
  const form = mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? forms[1] : forms[2]
  return `${n} ${form}`
}

export function messagePreview(type: MessageType, content: string) {
  switch (type) {
    case 'photo':
      return content ? `🖼 ${content}` : 'Фотография'
    case 'video':
      return content ? `📹 ${content}` : 'Видео'
    case 'voice':
      return 'Голосовое сообщение'
    case 'file':
      return content ? `📎 ${content}` : 'Файл'
    default:
      return content
  }
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function compressImage(
  file: Blob,
  maxSide = 1600,
  quality = 0.82,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous'
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
