import type { Profile } from './types'

const AVATAR_COLORS = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
]

export function hashString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function avatarGradient(seed: string) {
  const [a, b] = AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length]
  return `linear-gradient(180deg, ${a} 0%, ${b} 100%)`
}

const NAME_COLORS = ['#e17076', '#eda86c', '#a695e7', '#7bc862', '#6ec9cb', '#65aadd', '#ee7aae']
export function nameColor(seed: string) {
  return NAME_COLORS[hashString(seed) % NAME_COLORS.length]
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function formatListTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return formatTime(iso)
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 7) return WEEKDAYS[d.getDay()]
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
}

export function formatDateChip(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Сегодня'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Вчера'
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`
}

export function isOnline(p: Pick<Profile, 'lastSeen'> | null | undefined) {
  if (!p) return false
  return Date.now() - new Date(p.lastSeen).getTime() < 60_000
}

export function lastSeenText(p: Pick<Profile, 'lastSeen'>) {
  if (isOnline(p)) return 'в сети'
  const d = new Date(p.lastSeen)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `был(а) ${mins} мин. назад`
  const now = new Date()
  if (sameDay(d, now)) return `был(а) в ${formatTime(p.lastSeen)}`
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return `был(а) вчера в ${formatTime(p.lastSeen)}`
  return `был(а) ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatSize(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

export function membersText(n: number, type: string) {
  return type === 'channel'
    ? `${n} ${plural(n, 'подписчик', 'подписчика', 'подписчиков')}`
    : `${n} ${plural(n, 'участник', 'участника', 'участников')}`
}

export function previewText(m: { kind: string; text: string; fileName?: string | null }) {
  switch (m.kind) {
    case 'image':
      return m.text ? `🖼 ${m.text}` : '🖼 Фотография'
    case 'video':
      return m.text ? `📹 ${m.text}` : '📹 Видео'
    case 'voice':
      return '🎤 Голосовое сообщение'
    case 'file':
      return `📎 ${m.fileName || 'Файл'}`
    default:
      return m.text
  }
}
