import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import type {
  ChatDetails,
  ChatListItem,
  ChatMember,
  ChatMessage,
  Me,
  UserSearchResult,
} from '@/lib/types'

const ONLINE_WINDOW_SEC = 75
const TYPING_WINDOW_SEC = 6

type Row = Record<string, any>

async function rows<T = Row>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.execute(query)
  return res.rows as T[]
}

const iso = (d: Date | string | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : new Date(d).toISOString()) : null

export const userAvatarUrl = (id: string, hasImage: boolean, updatedAt: Date | string) =>
  hasImage ? `/api/avatar/u/${encodeURIComponent(id)}?v=${new Date(updatedAt).getTime()}` : null

export const chatAvatarUrl = (id: number, hasImage: boolean, updatedAt: Date | string) =>
  hasImage ? `/api/avatar/c/${id}?v=${new Date(updatedAt).getTime()}` : null

function isOnline(lastSeen: Date | string | null) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_SEC * 1000
}

export async function touchLastSeen(userId: string) {
  await db.execute(
    sql`UPDATE "user" SET "lastSeen" = now() WHERE id = ${userId} AND "lastSeen" < now() - interval '20 seconds'`,
  )
}

function generateUsername(name: string, email: string) {
  const base = (name || email.split('@')[0])
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
  const prefix = base.length >= 3 ? base : `user${base}`
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`
}

export async function getMe(userId: string): Promise<Me | null> {
  const [u] = await rows(
    sql`SELECT id, name, email, username, bio, (image IS NOT NULL) AS "hasImage", "updatedAt" FROM "user" WHERE id = ${userId}`,
  )
  if (!u) return null
  let username: string | null = u.username
  if (!username) {
    for (let i = 0; i < 5 && !username; i++) {
      const candidate = generateUsername(u.name, u.email)
      const res = await rows(
        sql`UPDATE "user" SET username = ${candidate} WHERE id = ${userId} AND username IS NULL
            AND NOT EXISTS (SELECT 1 FROM "user" WHERE lower(username) = lower(${candidate}))
            RETURNING username`,
      )
      username = res[0]?.username ?? null
    }
  }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username,
    bio: u.bio,
    avatarUrl: userAvatarUrl(u.id, u.hasImage, u.updatedAt),
  }
}

export async function getChatList(userId: string): Promise<ChatListItem[]> {
  const result = await rows(sql`
    SELECT
      c.id, c.type, c.title, (c.avatar IS NOT NULL) AS "chatHasAvatar", c."updatedAt" AS "chatUpdatedAt", c."createdAt" AS "chatCreatedAt",
      cm.pinned, cm.muted, cm.archived,
      lm.id AS "lastId", lm.type AS "lastType", lm.content AS "lastContent", lm."senderId" AS "lastSenderId", lm."createdAt" AS "lastAt",
      su.name AS "lastSenderName",
      (SELECT count(*)::int FROM messages m
         WHERE m."chatId" = c.id AND m.id > cm."lastReadMessageId" AND m."senderId" <> ${userId}
           AND NOT EXISTS (SELECT 1 FROM hidden_messages h WHERE h."messageId" = m.id AND h."userId" = ${userId})) AS unread,
      (SELECT count(*)::int FROM chat_members x WHERE x."chatId" = c.id) AS "memberCount",
      (SELECT COALESCE(max(x."lastReadMessageId"), 0) FROM chat_members x WHERE x."chatId" = c.id AND x."userId" <> ${userId}) AS "othersRead",
      (SELECT COALESCE(array_agg(tu.name), '{}') FROM chat_members x JOIN "user" tu ON tu.id = x."userId"
         WHERE x."chatId" = c.id AND x."userId" <> ${userId} AND x."typingAt" > now() - make_interval(secs => ${TYPING_WINDOW_SEC})) AS typing,
      ou.id AS "otherId", ou.name AS "otherName", ou.username AS "otherUsername", (ou.image IS NOT NULL) AS "otherHasImage",
      ou."updatedAt" AS "otherUpdatedAt", ou."lastSeen" AS "otherLastSeen"
    FROM chat_members cm
    JOIN chats c ON c.id = cm."chatId"
    LEFT JOIN LATERAL (
      SELECT m.* FROM messages m
      WHERE m."chatId" = c.id
        AND NOT EXISTS (SELECT 1 FROM hidden_messages h WHERE h."messageId" = m.id AND h."userId" = ${userId})
      ORDER BY m.id DESC LIMIT 1
    ) lm ON true
    LEFT JOIN "user" su ON su.id = lm."senderId"
    LEFT JOIN LATERAL (
      SELECT u.* FROM chat_members om JOIN "user" u ON u.id = om."userId"
      WHERE c.type = 'private' AND om."chatId" = c.id AND om."userId" <> ${userId}
      LIMIT 1
    ) ou ON true
    WHERE cm."userId" = ${userId}
    ORDER BY COALESCE(lm."createdAt", c."createdAt") DESC
  `)

  return result.map((r) => {
    const isPrivate = r.type === 'private'
    return {
      id: r.id,
      type: r.type,
      title:
        r.type === 'saved' ? 'Избранное' : isPrivate ? (r.otherName ?? 'Удалённый аккаунт') : (r.title ?? 'Группа'),
      avatarUrl: isPrivate
        ? r.otherId
          ? userAvatarUrl(r.otherId, r.otherHasImage, r.otherUpdatedAt)
          : null
        : chatAvatarUrl(r.id, r.chatHasAvatar, r.chatUpdatedAt),
      pinned: r.pinned,
      muted: r.muted,
      archived: r.archived,
      unread: r.unread,
      memberCount: r.memberCount,
      otherUserId: r.otherId ?? null,
      otherUsername: r.otherUsername ?? null,
      online: isPrivate ? isOnline(r.otherLastSeen) : false,
      lastSeen: iso(r.otherLastSeen),
      typing: r.typing ?? [],
      lastMessage: r.lastId
        ? {
            id: r.lastId,
            type: r.lastType,
            content: r.lastContent,
            senderId: r.lastSenderId,
            senderName: r.lastSenderName ?? '',
            createdAt: iso(r.lastAt)!,
            read: r.othersRead >= r.lastId,
          }
        : null,
      sortAt: iso(r.lastAt ?? r.chatCreatedAt)!,
    }
  })
}

export async function getChatDetails(
  chatId: number,
  userId: string,
  limit: number,
): Promise<ChatDetails | null> {
  const [c] = await rows(sql`
    SELECT c.*, (c.avatar IS NOT NULL) AS "hasAvatar", cm.role AS "myRole", cm.muted, cm.pinned AS "isPinned", cm."lastReadMessageId" AS "myLastRead"
    FROM chats c JOIN chat_members cm ON cm."chatId" = c.id AND cm."userId" = ${userId}
    WHERE c.id = ${chatId}
  `)
  if (!c) return null

  const memberRows = await rows(sql`
    SELECT u.id, u.name, u.username, (u.image IS NOT NULL) AS "hasImage", u."updatedAt", u."lastSeen", u.bio,
           cm.role, cm."lastReadMessageId", cm."typingAt"
    FROM chat_members cm JOIN "user" u ON u.id = cm."userId"
    WHERE cm."chatId" = ${chatId}
    ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name
  `)

  const members: ChatMember[] = memberRows.map((m) => ({
    userId: m.id,
    name: m.name,
    username: m.username,
    avatarUrl: userAvatarUrl(m.id, m.hasImage, m.updatedAt),
    role: m.role,
    online: isOnline(m.lastSeen),
    lastSeen: iso(m.lastSeen)!,
  }))

  const safeLimit = Math.min(Math.max(limit, 20), 1000)
  const msgRows = await rows(sql`
    SELECT * FROM (
      SELECT m.id, m."chatId", m."senderId", m.type, m.content, (m."mediaData" IS NOT NULL) AS "hasMedia", m."mediaMeta",
             m."replyToId", m."forwardedFrom", m."editedAt", m."createdAt",
             su.name AS "senderName", (su.image IS NOT NULL) AS "senderHasImage", su."updatedAt" AS "senderUpdatedAt",
             rm.id AS "rId", rm.type AS "rType", rm.content AS "rContent", ru.name AS "rSender",
             (SELECT COALESCE(json_agg(json_build_object('emoji', r.emoji, 'userId', r."userId")), '[]'::json)
                FROM message_reactions r WHERE r."messageId" = m.id) AS reactions
      FROM messages m
      LEFT JOIN "user" su ON su.id = m."senderId"
      LEFT JOIN messages rm ON rm.id = m."replyToId"
      LEFT JOIN "user" ru ON ru.id = rm."senderId"
      WHERE m."chatId" = ${chatId}
        AND NOT EXISTS (SELECT 1 FROM hidden_messages h WHERE h."messageId" = m.id AND h."userId" = ${userId})
      ORDER BY m.id DESC
      LIMIT ${safeLimit + 1}
    ) t ORDER BY id ASC
  `)
  const hasMore = msgRows.length > safeLimit
  const visible = hasMore ? msgRows.slice(1) : msgRows

  const messages: ChatMessage[] = visible.map((m) => {
    const grouped = new Map<string, { count: number; mine: boolean }>()
    for (const r of (m.reactions ?? []) as { emoji: string; userId: string }[]) {
      const g = grouped.get(r.emoji) ?? { count: 0, mine: false }
      g.count++
      if (r.userId === userId) g.mine = true
      grouped.set(r.emoji, g)
    }
    return {
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      senderName: m.senderName ?? 'Удалённый аккаунт',
      senderAvatarUrl: userAvatarUrl(m.senderId, Boolean(m.senderHasImage), m.senderUpdatedAt ?? 0),
      type: m.type,
      content: m.content,
      mediaUrl: m.hasMedia ? `/api/media/${m.id}` : null,
      mediaMeta: m.mediaMeta ?? null,
      replyTo: m.rId ? { id: m.rId, senderName: m.rSender ?? '', type: m.rType, content: m.rContent } : null,
      forwardedFrom: m.forwardedFrom,
      editedAt: iso(m.editedAt),
      createdAt: iso(m.createdAt)!,
      reactions: [...grouped.entries()].map(([emoji, g]) => ({ emoji, ...g })),
    }
  })

  let pinnedMessage: ChatDetails['chat']['pinnedMessage'] = null
  if (c.pinnedMessageId) {
    const [p] = await rows(sql`
      SELECT m.id, m.content, m.type, u.name AS "senderName" FROM messages m LEFT JOIN "user" u ON u.id = m."senderId"
      WHERE m.id = ${c.pinnedMessageId} AND m."chatId" = ${chatId}
    `)
    if (p) pinnedMessage = { id: p.id, content: p.content, type: p.type, senderName: p.senderName ?? '' }
  }

  const other = c.type === 'private' ? memberRows.find((m) => m.id !== userId) : undefined
  const othersRead = memberRows
    .filter((m) => m.id !== userId)
    .reduce((max, m) => Math.max(max, m.lastReadMessageId), 0)
  const typing = memberRows
    .filter(
      (m) =>
        m.id !== userId &&
        m.typingAt &&
        Date.now() - new Date(m.typingAt).getTime() < TYPING_WINDOW_SEC * 1000,
    )
    .map((m) => m.name)

  const canSeeInvite = c.type !== 'private' && c.type !== 'saved' && (c.myRole === 'owner' || c.myRole === 'admin')

  return {
    chat: {
      id: c.id,
      type: c.type,
      title:
        c.type === 'saved' ? 'Избранное' : c.type === 'private' ? (other?.name ?? 'Удалённый аккаунт') : (c.title ?? ''),
      description: c.description,
      avatarUrl:
        c.type === 'private'
          ? other
            ? userAvatarUrl(other.id, other.hasImage, other.updatedAt)
            : null
          : chatAvatarUrl(c.id, c.hasAvatar, c.updatedAt),
      pinnedMessage,
      inviteCode: canSeeInvite ? c.privateKey : null,
      myRole: c.myRole,
      muted: c.muted,
      pinned: c.isPinned,
      otherUser: other
        ? {
            id: other.id,
            name: other.name,
            username: other.username,
            bio: other.bio,
            online: isOnline(other.lastSeen),
            lastSeen: iso(other.lastSeen)!,
          }
        : null,
    },
    members,
    messages,
    hasMore,
    othersRead,
    myLastRead: c.myLastRead,
    typing,
  }
}

export async function searchUsers(q: string, userId: string): Promise<UserSearchResult[]> {
  const term = q.trim().replace(/^@/, '')
  if (term.length < 1) return []
  const like = `%${term.replace(/[\\%_]/g, (s) => `\\${s}`)}%`
  const result = await rows(sql`
    SELECT id, name, username, (image IS NOT NULL) AS "hasImage", "updatedAt", "lastSeen"
    FROM "user"
    WHERE id <> ${userId} AND (username ILIKE ${like} OR name ILIKE ${like} OR lower(email) = lower(${term}))
    ORDER BY (lower(username) = lower(${term})) DESC, name
    LIMIT 30
  `)
  return result.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    avatarUrl: userAvatarUrl(u.id, u.hasImage, u.updatedAt),
    online: isOnline(u.lastSeen),
    lastSeen: iso(u.lastSeen)!,
  }))
}

export async function getContacts(userId: string): Promise<UserSearchResult[]> {
  const result = await rows(sql`
    SELECT DISTINCT u.id, u.name, u.username, (u.image IS NOT NULL) AS "hasImage", u."updatedAt", u."lastSeen"
    FROM chat_members mine
    JOIN chat_members other ON other."chatId" = mine."chatId" AND other."userId" <> ${userId}
    JOIN "user" u ON u.id = other."userId"
    WHERE mine."userId" = ${userId}
    ORDER BY u.name
    LIMIT 200
  `)
  return result.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    avatarUrl: userAvatarUrl(u.id, u.hasImage, u.updatedAt),
    online: isOnline(u.lastSeen),
    lastSeen: iso(u.lastSeen)!,
  }))
}

export async function getUserProfile(targetId: string) {
  const [u] = await rows(sql`
    SELECT id, name, username, bio, (image IS NOT NULL) AS "hasImage", "updatedAt", "lastSeen" FROM "user" WHERE id = ${targetId}
  `)
  if (!u) return null
  return {
    id: u.id as string,
    name: u.name as string,
    username: u.username as string | null,
    bio: u.bio as string | null,
    avatarUrl: userAvatarUrl(u.id, u.hasImage, u.updatedAt),
    online: isOnline(u.lastSeen),
    lastSeen: iso(u.lastSeen)!,
  }
}
