import type { MediaMeta } from '@/lib/db/schema'

export type ChatType = 'private' | 'saved' | 'group' | 'channel'
export type MessageType = 'text' | 'photo' | 'voice' | 'file' | 'video' | 'system'

export type Me = {
  id: string
  name: string
  email: string
  username: string | null
  bio: string | null
  avatarUrl: string | null
}

export type ChatListItem = {
  id: number
  type: ChatType
  title: string
  avatarUrl: string | null
  pinned: boolean
  muted: boolean
  archived: boolean
  unread: number
  memberCount: number
  otherUserId: string | null
  otherUsername: string | null
  online: boolean
  lastSeen: string | null
  typing: string[]
  lastMessage: {
    id: number
    type: MessageType
    content: string
    senderId: string
    senderName: string
    createdAt: string
    read: boolean
  } | null
  sortAt: string
}

export type ChatMessage = {
  id: number
  chatId: number
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  type: MessageType
  content: string
  mediaUrl: string | null
  mediaMeta: MediaMeta | null
  replyTo: { id: number; senderName: string; type: MessageType; content: string } | null
  forwardedFrom: string | null
  editedAt: string | null
  createdAt: string
  reactions: { emoji: string; count: number; mine: boolean }[]
}

export type ChatMember = {
  userId: string
  name: string
  username: string | null
  avatarUrl: string | null
  role: string
  online: boolean
  lastSeen: string
}

export type ChatDetails = {
  chat: {
    id: number
    type: ChatType
    title: string
    description: string | null
    avatarUrl: string | null
    pinnedMessage: { id: number; content: string; type: MessageType; senderName: string } | null
    inviteCode: string | null
    myRole: string
    muted: boolean
    pinned: boolean
    otherUser: {
      id: string
      name: string
      username: string | null
      bio: string | null
      online: boolean
      lastSeen: string
    } | null
  }
  members: ChatMember[]
  messages: ChatMessage[]
  hasMore: boolean
  othersRead: number
  myLastRead: number
  typing: string[]
}

export type UserSearchResult = {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  online: boolean
  lastSeen: string
}
