export type Profile = {
  id: string
  name: string
  username: string | null
  bio: string
  avatarUrl: string | null
  lastSeen: string
  email?: string
}

export type Reaction = { emoji: string; count: number; mine: boolean }

export type Message = {
  id: number
  chatId: number
  senderId: string
  kind: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system'
  text: string
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  fileMime: string | null
  duration: number | null
  replyToId: number | null
  forwardedFrom: string | null
  editedAt: string | null
  deleted: boolean
  createdAt: string
  updatedAt: string
  senderName: string | null
  senderAvatar: string | null
  replyKind: string | null
  replyText: string | null
  replyDeleted: boolean | null
  replyName: string | null
  reactions: Reaction[]
  // client-only
  pending?: boolean
  failed?: boolean
}

export type ChatType = 'private' | 'group' | 'channel' | 'saved'

export type ChatSummary = {
  id: number
  type: ChatType
  title: string
  description: string
  avatarUrl: string | null
  ownerId: string | null
  createdAt: string
  role: 'owner' | 'admin' | 'member'
  pinned: boolean
  muted: boolean
  archived: boolean
  lastReadId: number
  memberCount: number
  peer: Profile | null
  lastMessage: {
    id: number
    kind: Message['kind']
    text: string
    senderId: string
    senderName: string | null
    fileName: string | null
    createdAt: string
  } | null
  unread: number
  readUpTo: number
  typing: string[]
}

export type ChatDetails = {
  chat: {
    id: number
    type: ChatType
    title: string
    description: string
    avatarUrl: string | null
    ownerId: string | null
    inviteCode: string | null
    createdAt: string
    role: 'owner' | 'admin' | 'member'
    muted: boolean
    pinned: boolean
    archived: boolean
  }
  members: (Profile & { role: 'owner' | 'admin' | 'member' })[]
  media: { id: number; kind: string; fileUrl: string; fileName: string | null; fileSize: number | null; createdAt: string }[]
}

export type MessagesResponse = {
  messages: Message[]
  readUpTo: number
  typing: string[]
  pinned: { id: number; kind: string; text: string } | null
  serverTime: string
}
