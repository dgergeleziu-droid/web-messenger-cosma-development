'use server'

import { randomBytes } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  chatMembers,
  chats,
  hiddenMessages,
  messageReactions,
  messages,
  user,
  type MediaMeta,
} from '@/lib/db/schema'
import { getUserId, requireMembership } from '@/lib/session'

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string }

const MAX_MEDIA_CHARS = 5_600_000
const MAX_TEXT = 4096
const ALLOWED_TYPES = ['text', 'photo', 'voice', 'file', 'video'] as const
const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉', '👎', '🙏', '💯']

function fail(error: string): Result<never> {
  return { ok: false, error }
}

async function safe<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка'
    if (message === 'Unauthorized' || message === 'Forbidden') return fail('Нет доступа')
    console.error('[cosma] action error', e)
    return fail('Что-то пошло не так')
  }
}

function isValidDataUrl(value: string, prefix?: string) {
  return value.startsWith('data:') && (!prefix || value.startsWith(`data:${prefix}`)) && value.length <= MAX_MEDIA_CHARS
}

const newInviteCode = () => randomBytes(12).toString('base64url')

async function canPost(chatId: number, userId: string) {
  const member = await requireMembership(chatId, userId)
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
  if (!chat) throw new Error('Forbidden')
  if (chat.type === 'channel' && member.role === 'member') throw new Error('Forbidden')
  return { chat, member }
}

export async function sendMessage(input: {
  chatId: number
  type: (typeof ALLOWED_TYPES)[number]
  content?: string
  mediaData?: string | null
  mediaMeta?: MediaMeta | null
  replyToId?: number | null
}): Promise<Result<{ id: number }>> {
  return safe(async () => {
    const userId = await getUserId()
    const chatId = Number(input.chatId)
    if (!ALLOWED_TYPES.includes(input.type)) return fail('Неверный тип')
    const content = (input.content ?? '').slice(0, MAX_TEXT)
    if (input.type === 'text' && !content.trim()) return fail('Пустое сообщение')
    if (input.type !== 'text' && (!input.mediaData || !isValidDataUrl(input.mediaData))) {
      return fail('Файл слишком большой (макс. 4 МБ)')
    }
    const { chat } = await canPost(chatId, userId)

    let replyToId: number | null = null
    if (input.replyToId) {
      const [r] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, input.replyToId), eq(messages.chatId, chatId)))
        .limit(1)
      replyToId = r?.id ?? null
    }

    const meta = input.mediaMeta
      ? {
          name: input.mediaMeta.name?.slice(0, 200),
          size: Number(input.mediaMeta.size) || undefined,
          mime: input.mediaMeta.mime?.slice(0, 100),
          duration: Number(input.mediaMeta.duration) || undefined,
          width: Number(input.mediaMeta.width) || undefined,
          height: Number(input.mediaMeta.height) || undefined,
          waveform: Array.isArray(input.mediaMeta.waveform)
            ? input.mediaMeta.waveform.slice(0, 64).map((n) => Math.max(0, Math.min(1, Number(n) || 0)))
            : undefined,
        }
      : null

    const [msg] = await db
      .insert(messages)
      .values({
        chatId,
        senderId: userId,
        type: input.type,
        content,
        mediaData: input.type === 'text' ? null : input.mediaData,
        mediaMeta: meta,
        replyToId,
      })
      .returning({ id: messages.id })

    // Deleted private chats reappear for both sides when someone writes again.
    if (chat.type === 'private' && chat.privateKey) {
      const ids = chat.privateKey.split(':')
      for (const id of ids) {
        await db.insert(chatMembers).values({ chatId, userId: id }).onConflictDoNothing()
      }
    }

    await db
      .update(chatMembers)
      .set({ lastReadMessageId: msg.id, typingAt: null, archived: false })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    await db.update(chats).set({ updatedAt: sql`now()` }).where(eq(chats.id, chatId))
    return { ok: true, data: { id: msg.id } }
  })
}

export async function editMessage(messageId: number, content: string): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const text = content.slice(0, MAX_TEXT)
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1)
    if (!msg || msg.senderId !== userId) return fail('Нельзя изменить')
    if (msg.type === 'text' && !text.trim()) return fail('Пустое сообщение')
    await db.update(messages).set({ content: text, editedAt: sql`now()` }).where(eq(messages.id, messageId))
    return { ok: true, data: null }
  })
}

export async function deleteMessages(ids: number[], forEveryone: boolean): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const clean = ids.map(Number).filter(Number.isInteger).slice(0, 200)
    if (!clean.length) return { ok: true, data: null }
    const rows = await db.select().from(messages).where(inArray(messages.id, clean))
    for (const msg of rows) {
      const member = await requireMembership(msg.chatId, userId)
      const isAdmin = member.role === 'owner' || member.role === 'admin'
      if (forEveryone && (msg.senderId === userId || isAdmin)) {
        await db.delete(messageReactions).where(eq(messageReactions.messageId, msg.id))
        await db.delete(hiddenMessages).where(eq(hiddenMessages.messageId, msg.id))
        await db.update(chats).set({ pinnedMessageId: null }).where(eq(chats.pinnedMessageId, msg.id))
        await db.delete(messages).where(eq(messages.id, msg.id))
      } else {
        await db.insert(hiddenMessages).values({ messageId: msg.id, userId }).onConflictDoNothing()
      }
    }
    return { ok: true, data: null }
  })
}

export async function toggleReaction(messageId: number, emoji: string): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    if (!ALLOWED_REACTIONS.includes(emoji)) return fail('Неверная реакция')
    const [msg] = await db.select({ chatId: messages.chatId }).from(messages).where(eq(messages.id, messageId)).limit(1)
    if (!msg) return fail('Сообщение не найдено')
    await requireMembership(msg.chatId, userId)
    const [existing] = await db
      .select()
      .from(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)))
      .limit(1)
    if (existing?.emoji === emoji) {
      await db
        .delete(messageReactions)
        .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)))
    } else if (existing) {
      await db
        .update(messageReactions)
        .set({ emoji })
        .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)))
    } else {
      await db.insert(messageReactions).values({ messageId, userId, emoji })
    }
    return { ok: true, data: null }
  })
}

export async function forwardMessages(ids: number[], toChatIds: number[]): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const clean = ids.map(Number).filter(Number.isInteger).slice(0, 100)
    const targets = toChatIds.map(Number).filter(Number.isInteger).slice(0, 20)
    const rows = await db.select().from(messages).where(inArray(messages.id, clean)).orderBy(messages.id)
    const senders = new Map<string, string>()
    for (const msg of rows) await requireMembership(msg.chatId, userId)
    if (rows.length) {
      const users = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, [...new Set(rows.map((r) => r.senderId))]))
      users.forEach((u) => senders.set(u.id, u.name))
    }
    for (const chatId of targets) {
      await canPost(chatId, userId)
      for (const msg of rows) {
        await db.insert(messages).values({
          chatId,
          senderId: userId,
          type: msg.type,
          content: msg.content,
          mediaData: msg.mediaData,
          mediaMeta: msg.mediaMeta,
          forwardedFrom: msg.forwardedFrom ?? senders.get(msg.senderId) ?? 'Неизвестный',
        })
      }
      await db.update(chats).set({ updatedAt: sql`now()` }).where(eq(chats.id, chatId))
    }
    return { ok: true, data: null }
  })
}

export async function pinMessage(chatId: number, messageId: number | null): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const member = await requireMembership(chatId, userId)
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
    if (!chat) return fail('Чат не найден')
    if ((chat.type === 'group' || chat.type === 'channel') && member.role === 'member') {
      return fail('Только администраторы могут закреплять')
    }
    if (messageId) {
      const [m] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
        .limit(1)
      if (!m) return fail('Сообщение не найдено')
    }
    await db.update(chats).set({ pinnedMessageId: messageId }).where(eq(chats.id, chatId))
    return { ok: true, data: null }
  })
}

export async function markRead(chatId: number, messageId: number): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await db
      .update(chatMembers)
      .set({ lastReadMessageId: sql`GREATEST(${chatMembers.lastReadMessageId}, ${Number(messageId) || 0})` })
      .where(and(eq(chatMembers.chatId, Number(chatId)), eq(chatMembers.userId, userId)))
    return { ok: true, data: null }
  })
}

export async function setTyping(chatId: number): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await db
      .update(chatMembers)
      .set({ typingAt: sql`now()` })
      .where(and(eq(chatMembers.chatId, Number(chatId)), eq(chatMembers.userId, userId)))
    return { ok: true, data: null }
  })
}

export async function openPrivateChat(otherUserId: string): Promise<Result<{ chatId: number }>> {
  return safe(async () => {
    const userId = await getUserId()
    if (otherUserId === userId) return openSavedMessages()
    const [other] = await db.select({ id: user.id }).from(user).where(eq(user.id, otherUserId)).limit(1)
    if (!other) return fail('Пользователь не найден')
    const key = [userId, otherUserId].sort().join(':')
    let [chat] = await db.select().from(chats).where(eq(chats.privateKey, key)).limit(1)
    if (!chat) {
      ;[chat] = await db
        .insert(chats)
        .values({ type: 'private', privateKey: key, createdBy: userId })
        .onConflictDoNothing()
        .returning()
      if (!chat) [chat] = await db.select().from(chats).where(eq(chats.privateKey, key)).limit(1)
      await db.insert(chatMembers).values({ chatId: chat.id, userId: otherUserId }).onConflictDoNothing()
    }
    await db.insert(chatMembers).values({ chatId: chat.id, userId }).onConflictDoNothing()
    return { ok: true, data: { chatId: chat.id } }
  })
}

export async function openSavedMessages(): Promise<Result<{ chatId: number }>> {
  return safe(async () => {
    const userId = await getUserId()
    const key = `saved:${userId}`
    let [chat] = await db.select().from(chats).where(eq(chats.privateKey, key)).limit(1)
    if (!chat) {
      ;[chat] = await db
        .insert(chats)
        .values({ type: 'saved', privateKey: key, createdBy: userId })
        .onConflictDoNothing()
        .returning()
      if (!chat) [chat] = await db.select().from(chats).where(eq(chats.privateKey, key)).limit(1)
    }
    await db.insert(chatMembers).values({ chatId: chat.id, userId, role: 'owner' }).onConflictDoNothing()
    return { ok: true, data: { chatId: chat.id } }
  })
}

export async function createGroup(input: {
  type: 'group' | 'channel'
  title: string
  description?: string
  avatar?: string | null
  memberIds: string[]
}): Promise<Result<{ chatId: number }>> {
  return safe(async () => {
    const userId = await getUserId()
    const title = input.title.trim().slice(0, 128)
    if (!title) return fail('Введите название')
    if (input.type !== 'group' && input.type !== 'channel') return fail('Неверный тип')
    const avatar = input.avatar && isValidDataUrl(input.avatar, 'image/') ? input.avatar : null
    const [chat] = await db
      .insert(chats)
      .values({
        type: input.type,
        title,
        description: input.description?.slice(0, 255) || null,
        avatar,
        privateKey: newInviteCode(),
        createdBy: userId,
      })
      .returning()
    await db.insert(chatMembers).values({ chatId: chat.id, userId, role: 'owner' })
    const memberIds = [...new Set(input.memberIds)].filter((id) => id !== userId).slice(0, 200)
    if (memberIds.length) {
      const existing = await db.select({ id: user.id }).from(user).where(inArray(user.id, memberIds))
      if (existing.length) {
        await db
          .insert(chatMembers)
          .values(existing.map((u) => ({ chatId: chat.id, userId: u.id })))
          .onConflictDoNothing()
      }
    }
    await db.insert(messages).values({
      chatId: chat.id,
      senderId: userId,
      type: 'system',
      content: input.type === 'channel' ? `Канал «${title}» создан` : `Группа «${title}» создана`,
    })
    return { ok: true, data: { chatId: chat.id } }
  })
}

async function requireAdmin(chatId: number, userId: string) {
  const member = await requireMembership(chatId, userId)
  if (member.role !== 'owner' && member.role !== 'admin') throw new Error('Forbidden')
  return member
}

export async function updateChat(
  chatId: number,
  input: { title?: string; description?: string; avatar?: string | null },
): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await requireAdmin(chatId, userId)
    const patch: Partial<typeof chats.$inferInsert> = { updatedAt: new Date() }
    if (input.title !== undefined) {
      const t = input.title.trim().slice(0, 128)
      if (!t) return fail('Введите название')
      patch.title = t
    }
    if (input.description !== undefined) patch.description = input.description.slice(0, 255) || null
    if (input.avatar !== undefined) {
      if (input.avatar && !isValidDataUrl(input.avatar, 'image/')) return fail('Неверное изображение')
      patch.avatar = input.avatar
    }
    await db.update(chats).set(patch).where(eq(chats.id, chatId))
    return { ok: true, data: null }
  })
}

export async function addMembers(chatId: number, userIds: string[]): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await requireAdmin(chatId, userId)
    const ids = [...new Set(userIds)].slice(0, 200)
    if (!ids.length) return { ok: true, data: null }
    const existing = await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids))
    if (existing.length) {
      await db
        .insert(chatMembers)
        .values(existing.map((u) => ({ chatId, userId: u.id })))
        .onConflictDoNothing()
      await db.insert(messages).values({
        chatId,
        senderId: userId,
        type: 'system',
        content: `добавил(а): ${existing.map((u) => u.name).join(', ')}`,
      })
    }
    return { ok: true, data: null }
  })
}

export async function removeMember(chatId: number, targetId: string): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const me = await requireAdmin(chatId, userId)
    const target = await requireMembership(chatId, targetId)
    if (target.role === 'owner' || (target.role === 'admin' && me.role !== 'owner')) return fail('Нет прав')
    await db.delete(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, targetId)))
    return { ok: true, data: null }
  })
}

export async function setMemberRole(chatId: number, targetId: string, role: 'admin' | 'member'): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const me = await requireMembership(chatId, userId)
    if (me.role !== 'owner') return fail('Только владелец может назначать админов')
    await requireMembership(chatId, targetId)
    if (targetId === userId) return fail('Нельзя изменить свою роль')
    await db
      .update(chatMembers)
      .set({ role: role === 'admin' ? 'admin' : 'member' })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, targetId)))
    return { ok: true, data: null }
  })
}

export async function joinByInvite(code: string): Promise<Result<{ chatId: number }>> {
  return safe(async () => {
    const userId = await getUserId()
    const [chat] = await db.select().from(chats).where(eq(chats.privateKey, String(code).slice(0, 64))).limit(1)
    if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) return fail('Ссылка недействительна')
    const inserted = await db
      .insert(chatMembers)
      .values({ chatId: chat.id, userId })
      .onConflictDoNothing()
      .returning()
    if (inserted.length && chat.type === 'group') {
      await db.insert(messages).values({ chatId: chat.id, senderId: userId, type: 'system', content: 'присоединился(-ась) к группе' })
    }
    return { ok: true, data: { chatId: chat.id } }
  })
}

export async function resetInvite(chatId: number): Promise<Result<{ code: string }>> {
  return safe(async () => {
    const userId = await getUserId()
    await requireAdmin(chatId, userId)
    const code = newInviteCode()
    await db.update(chats).set({ privateKey: code }).where(eq(chats.id, chatId))
    return { ok: true, data: { code } }
  })
}

export async function leaveChat(chatId: number): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const member = await requireMembership(chatId, userId)
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
    if (!chat) return fail('Чат не найден')
    if (chat.type === 'private' || chat.type === 'saved') {
      await clearHistoryFor(chatId, userId)
    } else {
      if (chat.type === 'group') {
        await db.insert(messages).values({ chatId, senderId: userId, type: 'system', content: 'покинул(а) группу' })
      }
      if (member.role === 'owner') {
        const [next] = await db
          .select()
          .from(chatMembers)
          .where(and(eq(chatMembers.chatId, chatId), sql`${chatMembers.userId} <> ${userId}`))
          .orderBy(sql`CASE ${chatMembers.role} WHEN 'admin' THEN 0 ELSE 1 END`, chatMembers.joinedAt)
          .limit(1)
        if (next) {
          await db
            .update(chatMembers)
            .set({ role: 'owner' })
            .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, next.userId)))
        }
      }
    }
    await db.delete(chatMembers).where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    return { ok: true, data: null }
  })
}

async function clearHistoryFor(chatId: number, userId: string) {
  await db.execute(sql`
    INSERT INTO hidden_messages ("messageId", "userId")
    SELECT id, ${userId} FROM messages WHERE "chatId" = ${chatId}
    ON CONFLICT DO NOTHING
  `)
}

export async function clearHistory(chatId: number): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await requireMembership(chatId, userId)
    await clearHistoryFor(chatId, userId)
    return { ok: true, data: null }
  })
}

export async function setChatFlags(
  chatId: number,
  flags: { pinned?: boolean; muted?: boolean; archived?: boolean },
): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    await requireMembership(chatId, userId)
    const patch: Partial<typeof chatMembers.$inferInsert> = {}
    if (typeof flags.pinned === 'boolean') patch.pinned = flags.pinned
    if (typeof flags.muted === 'boolean') patch.muted = flags.muted
    if (typeof flags.archived === 'boolean') patch.archived = flags.archived
    if (!Object.keys(patch).length) return { ok: true, data: null }
    await db
      .update(chatMembers)
      .set(patch)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    return { ok: true, data: null }
  })
}

export async function updateProfile(input: {
  name?: string
  username?: string
  bio?: string
  image?: string | null
}): Promise<Result> {
  return safe(async () => {
    const userId = await getUserId()
    const patch: Partial<typeof user.$inferInsert> = { updatedAt: new Date() }
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 64)
      if (!name) return fail('Введите имя')
      patch.name = name
    }
    if (input.username !== undefined) {
      const username = input.username.trim().replace(/^@/, '')
      if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) {
        return fail('Имя пользователя: 5–32 символа, латиница, цифры и _, начинается с буквы')
      }
      const [taken] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(sql`lower(${user.username}) = lower(${username})`, sql`${user.id} <> ${userId}`))
        .limit(1)
      if (taken) return fail('Это имя пользователя уже занято')
      patch.username = username
    }
    if (input.bio !== undefined) patch.bio = input.bio.slice(0, 70) || null
    if (input.image !== undefined) {
      if (input.image && !isValidDataUrl(input.image, 'image/')) return fail('Неверное изображение')
      patch.image = input.image
    }
    await db.update(user).set(patch).where(eq(user.id, userId))
    return { ok: true, data: null }
  })
}
