import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  username: text('username'),
  bio: text('bio'),
  lastSeen: timestamp('lastSeen').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title'),
  description: text('description'),
  avatar: text('avatar'),
  privateKey: text('privateKey'),
  pinnedMessageId: integer('pinnedMessageId'),
  createdBy: text('createdBy').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const chatMembers = pgTable(
  'chat_members',
  {
    chatId: integer('chatId').notNull(),
    userId: text('userId').notNull(),
    role: text('role').notNull().default('member'),
    lastReadMessageId: integer('lastReadMessageId').notNull().default(0),
    pinned: boolean('pinned').notNull().default(false),
    muted: boolean('muted').notNull().default(false),
    archived: boolean('archived').notNull().default(false),
    typingAt: timestamp('typingAt'),
    joinedAt: timestamp('joinedAt').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.userId] })],
)

export type MediaMeta = {
  name?: string
  size?: number
  mime?: string
  duration?: number
  width?: number
  height?: number
  waveform?: number[]
}

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatId: integer('chatId').notNull(),
  senderId: text('senderId').notNull(),
  type: text('type').notNull().default('text'),
  content: text('content').notNull().default(''),
  mediaData: text('mediaData'),
  mediaMeta: jsonb('mediaMeta').$type<MediaMeta>(),
  replyToId: integer('replyToId'),
  forwardedFrom: text('forwardedFrom'),
  editedAt: timestamp('editedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const messageReactions = pgTable(
  'message_reactions',
  {
    messageId: integer('messageId').notNull(),
    userId: text('userId').notNull(),
    emoji: text('emoji').notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
)

export const hiddenMessages = pgTable(
  'hidden_messages',
  {
    messageId: integer('messageId').notNull(),
    userId: text('userId').notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
)
