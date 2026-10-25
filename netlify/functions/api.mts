import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";

type Row = Record<string, any>;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function q<T = Row>(query: SQL): Promise<T[]> {
  const res: any = await db.execute(query);
  return (Array.isArray(res) ? res : res.rows) as T[];
}

async function one<T = Row>(query: SQL): Promise<T | undefined> {
  return (await q<T>(query))[0];
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

async function body(req: Request): Promise<Row> {
  try {
    return (await req.json()) ?? {};
  } catch {
    return {};
  }
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

// ---------- auth / profiles ----------

async function requireUser() {
  const user = await getUser();
  if (!user) fail(401, "Требуется вход");
  const name = user!.name || (user!.email ? user!.email.split("@")[0] : "Пользователь");
  await q(sql`
    INSERT INTO profiles (id, email, name)
    VALUES (${user!.id}, ${user!.email ?? ""}, ${name})
    ON CONFLICT (id) DO UPDATE SET last_seen = now()
    WHERE profiles.last_seen < now() - interval '20 seconds'
  `);
  return user!.id;
}

const PROFILE_COLS = sql`id, name, username, bio, avatar_url AS "avatarUrl", last_seen AS "lastSeen"`;

async function getProfile(id: string) {
  return one(sql`SELECT ${PROFILE_COLS}, email FROM profiles WHERE id = ${id}`);
}

async function getMembership(chatId: number, me: string) {
  const m = await one(sql`
    SELECT c.id, c.type, c.owner_id AS "ownerId", cm.role
    FROM chats c JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${me}
    WHERE c.id = ${chatId}
  `);
  if (!m) fail(404, "Чат не найден");
  return m!;
}

const isAdmin = (m: Row) => m.role === "owner" || m.role === "admin";

function canPost(m: Row) {
  return m.type !== "channel" || isAdmin(m);
}

async function systemMessage(chatId: number, senderId: string, text: string) {
  await q(sql`INSERT INTO messages (chat_id, sender_id, kind, text) VALUES (${chatId}, ${senderId}, 'system', ${text})`);
}

async function ensureSavedChat(me: string) {
  const existing = await one(sql`
    SELECT c.id FROM chats c JOIN chat_members cm ON cm.chat_id = c.id
    WHERE c.type = 'saved' AND cm.user_id = ${me} LIMIT 1
  `);
  if (existing) return existing.id as number;
  const chat = await one(sql`INSERT INTO chats (type, title, owner_id) VALUES ('saved', 'Избранное', ${me}) RETURNING id`);
  await q(sql`INSERT INTO chat_members (chat_id, user_id, role) VALUES (${chat!.id}, ${me}, 'owner')`);
  return chat!.id as number;
}

// ---------- messages ----------

function messageSelect(me: string) {
  return sql`
  SELECT m.id, m.chat_id AS "chatId", m.sender_id AS "senderId", m.kind, m.text,
    m.file_url AS "fileUrl", m.file_name AS "fileName", m.file_size AS "fileSize",
    m.file_mime AS "fileMime", m.duration, m.reply_to_id AS "replyToId",
    m.forwarded_from AS "forwardedFrom", m.edited_at AS "editedAt", m.deleted,
    m.created_at AS "createdAt", m.updated_at AS "updatedAt",
    p.name AS "senderName", p.avatar_url AS "senderAvatar",
    r.kind AS "replyKind", r.text AS "replyText", r.deleted AS "replyDeleted", rp.name AS "replyName",
    COALESCE((
      SELECT json_agg(json_build_object('emoji', x.emoji, 'count', x.cnt, 'mine', x.mine) ORDER BY x.cnt DESC)
      FROM (
        SELECT emoji, count(*)::int AS cnt, bool_or(user_id = ${me}) AS mine
        FROM reactions WHERE message_id = m.id GROUP BY emoji
      ) x
    ), '[]'::json) AS reactions
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  LEFT JOIN messages r ON r.id = m.reply_to_id
  LEFT JOIN profiles rp ON rp.id = r.sender_id`;
}

function scrub(m: Row) {
  if (m.deleted) {
    m.text = "";
    m.fileUrl = null;
    m.fileName = null;
    m.reactions = [];
  }
  return m;
}

async function listMessages(chatId: number, me: string, url: URL) {
  const since = url.searchParams.get("since");
  const before = Number(url.searchParams.get("before")) || 0;
  let rows: Row[];
  if (since) {
    rows = await q(sql`${messageSelect(me)}
      WHERE m.chat_id = ${chatId} AND m.updated_at > (${since}::timestamptz - interval '3 seconds')
      ORDER BY m.id ASC LIMIT 200`);
  } else if (before) {
    rows = (
      await q(sql`${messageSelect(me)}
      WHERE m.chat_id = ${chatId} AND m.id < ${before} AND m.deleted = false
      ORDER BY m.id DESC LIMIT 50`)
    ).reverse();
  } else {
    rows = (
      await q(sql`${messageSelect(me)}
      WHERE m.chat_id = ${chatId} AND m.deleted = false
      ORDER BY m.id DESC LIMIT 50`)
    ).reverse();
  }

  const state = await one(sql`
    SELECT
      (SELECT COALESCE(max(last_read_id), 0) FROM chat_members WHERE chat_id = ${chatId} AND user_id <> ${me}) AS "readUpTo",
      (SELECT COALESCE(json_agg(p.name), '[]'::json) FROM chat_members cm JOIN profiles p ON p.id = cm.user_id
        WHERE cm.chat_id = ${chatId} AND cm.user_id <> ${me} AND cm.typing_at > now() - interval '5 seconds') AS typing,
      (SELECT pinned_message_id FROM chats WHERE id = ${chatId}) AS "pinnedId",
      now() AS "serverTime"
  `);

  let pinned: Row | null = null;
  if (state?.pinnedId) {
    pinned = (await one(sql`SELECT id, kind, text, deleted FROM messages WHERE id = ${state.pinnedId}`)) ?? null;
    if (pinned?.deleted) pinned = null;
  }

  return {
    messages: rows.map(scrub),
    readUpTo: Number(state?.readUpTo ?? 0),
    typing: state?.typing ?? [],
    pinned,
    serverTime: state?.serverTime,
  };
}

async function sendMessage(chatId: number, me: string, data: Row) {
  const m = await getMembership(chatId, me);
  if (!canPost(m)) fail(403, "Только администраторы могут публиковать в канале");
  const kind = ["text", "image", "video", "file", "voice"].includes(data.kind) ? data.kind : "text";
  const text = clean(data.text, 4096);
  const fileUrl = typeof data.fileUrl === "string" && data.fileUrl.startsWith("/api/files/") ? data.fileUrl : null;
  if (kind === "text" && !text) fail(400, "Пустое сообщение");
  if (kind !== "text" && !fileUrl) fail(400, "Нет файла");
  let replyToId: number | null = Number(data.replyToId) || null;
  if (replyToId) {
    const r = await one(sql`SELECT id FROM messages WHERE id = ${replyToId} AND chat_id = ${chatId}`);
    if (!r) replyToId = null;
  }
  const inserted = await one(sql`
    INSERT INTO messages (chat_id, sender_id, kind, text, file_url, file_name, file_size, file_mime, duration, reply_to_id)
    VALUES (${chatId}, ${me}, ${kind}, ${text}, ${fileUrl}, ${clean(data.fileName, 255) || null},
      ${Number(data.fileSize) || null}, ${clean(data.fileMime, 100) || null}, ${Number(data.duration) || null}, ${replyToId})
    RETURNING id
  `);
  await q(sql`
    UPDATE chat_members SET last_read_id = GREATEST(last_read_id, ${inserted!.id}), typing_at = NULL, archived = false
    WHERE chat_id = ${chatId} AND user_id = ${me}
  `);
  // Unarchive the chat for everyone when a new message arrives (unless muted), like Telegram.
  await q(sql`UPDATE chat_members SET archived = false WHERE chat_id = ${chatId} AND muted = false AND archived = true`);
  return scrub((await one(sql`${messageSelect(me)} WHERE m.id = ${inserted!.id}`))!);
}

async function getOwnMessage(id: number, me: string) {
  const msg = await one(sql`SELECT id, chat_id AS "chatId", sender_id AS "senderId", kind, deleted FROM messages WHERE id = ${id}`);
  if (!msg || msg.deleted) fail(404, "Сообщение не найдено");
  const m = await getMembership(msg!.chatId, me);
  return { msg: msg!, m };
}

// ---------- chats ----------

async function listChats(me: string) {
  await ensureSavedChat(me);
  const chats = await q(sql`
    SELECT c.id, c.type, c.title, c.description, c.avatar_url AS "avatarUrl", c.owner_id AS "ownerId",
      c.created_at AS "createdAt", cm.role, cm.pinned, cm.muted, cm.archived, cm.last_read_id AS "lastReadId",
      (SELECT count(*)::int FROM chat_members x WHERE x.chat_id = c.id) AS "memberCount"
    FROM chats c JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${me}
  `);
  if (!chats.length) return [];
  const ids = chats.map((c) => Number(c.id));
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);

  const [last, unread, peers, reads, typing] = await Promise.all([
    q(sql`
      SELECT DISTINCT ON (m.chat_id) m.chat_id AS "chatId", m.id, m.kind, m.text, m.sender_id AS "senderId",
        m.file_name AS "fileName", m.created_at AS "createdAt", p.name AS "senderName"
      FROM messages m LEFT JOIN profiles p ON p.id = m.sender_id
      WHERE m.chat_id IN (${idList}) AND m.deleted = false
      ORDER BY m.chat_id, m.id DESC
    `),
    q(sql`
      SELECT m.chat_id AS "chatId", count(*)::int AS n
      FROM messages m JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = ${me}
      WHERE m.chat_id IN (${idList}) AND m.id > cm.last_read_id AND m.sender_id <> ${me}
        AND m.deleted = false AND m.kind <> 'system'
      GROUP BY m.chat_id
    `),
    q(sql`
      SELECT cm.chat_id AS "chatId", ${PROFILE_COLS}
      FROM chat_members cm JOIN chats c ON c.id = cm.chat_id JOIN profiles p ON p.id = cm.user_id
      WHERE c.type = 'private' AND cm.chat_id IN (${idList}) AND cm.user_id <> ${me}
    `),
    q(sql`
      SELECT chat_id AS "chatId", max(last_read_id)::int AS n FROM chat_members
      WHERE chat_id IN (${idList}) AND user_id <> ${me} GROUP BY chat_id
    `),
    q(sql`
      SELECT cm.chat_id AS "chatId", json_agg(p.name) AS names
      FROM chat_members cm JOIN profiles p ON p.id = cm.user_id
      WHERE cm.chat_id IN (${idList}) AND cm.user_id <> ${me} AND cm.typing_at > now() - interval '5 seconds'
      GROUP BY cm.chat_id
    `),
  ]);

  const byChat = <T extends Row>(rows: T[]) => new Map(rows.map((r) => [Number(r.chatId), r]));
  const lastMap = byChat(last);
  const unreadMap = byChat(unread);
  const peerMap = byChat(peers);
  const readMap = byChat(reads);
  const typingMap = byChat(typing);

  return chats
    .map((c) => {
      const id = Number(c.id);
      const peer = peerMap.get(id);
      return {
        ...c,
        id,
        peer: peer ? { ...peer, chatId: undefined } : null,
        lastMessage: lastMap.get(id) ?? null,
        unread: unreadMap.get(id)?.n ?? 0,
        readUpTo: readMap.get(id)?.n ?? 0,
        typing: typingMap.get(id)?.names ?? [],
      };
    })
    .filter((c) => c.type !== "private" || c.peer);
}

async function chatDetails(chatId: number, me: string) {
  await getMembership(chatId, me);
  const chat = await one(sql`
    SELECT c.id, c.type, c.title, c.description, c.avatar_url AS "avatarUrl", c.owner_id AS "ownerId",
      c.invite_code AS "inviteCode", c.created_at AS "createdAt", cm.role, cm.muted, cm.pinned, cm.archived
    FROM chats c JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${me}
    WHERE c.id = ${chatId}
  `);
  const members = await q(sql`
    SELECT ${PROFILE_COLS}, cm.role FROM chat_members cm JOIN profiles p ON p.id = cm.user_id
    WHERE cm.chat_id = ${chatId}
    ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, p.name
    LIMIT 500
  `);
  const media = await q(sql`
    SELECT id, kind, file_url AS "fileUrl", file_name AS "fileName", file_size AS "fileSize", created_at AS "createdAt"
    FROM messages WHERE chat_id = ${chatId} AND deleted = false AND kind IN ('image', 'video', 'file', 'voice')
    ORDER BY id DESC LIMIT 60
  `);
  if (chat && !isAdmin(chat)) chat.inviteCode = chat.type === "private" ? null : chat.inviteCode;
  return { chat, members, media };
}

async function createChat(me: string, data: Row) {
  if (data.type === "private") {
    const other = clean(data.userId, 100);
    if (!other || other === me) return { id: await ensureSavedChat(me) };
    const exists = await one(sql`SELECT id FROM profiles WHERE id = ${other}`);
    if (!exists) fail(404, "Пользователь не найден");
    const existing = await one(sql`
      SELECT c.id FROM chats c
      JOIN chat_members a ON a.chat_id = c.id AND a.user_id = ${me}
      JOIN chat_members b ON b.chat_id = c.id AND b.user_id = ${other}
      WHERE c.type = 'private' LIMIT 1
    `);
    if (existing) return { id: existing.id };
    const chat = await one(sql`INSERT INTO chats (type, owner_id) VALUES ('private', ${me}) RETURNING id`);
    await q(sql`INSERT INTO chat_members (chat_id, user_id, role) VALUES (${chat!.id}, ${me}, 'member'), (${chat!.id}, ${other}, 'member')`);
    return { id: chat!.id };
  }

  if (data.type === "group" || data.type === "channel") {
    const title = clean(data.title, 128);
    if (!title) fail(400, "Укажите название");
    const chat = await one(sql`
      INSERT INTO chats (type, title, description, avatar_url, owner_id, invite_code)
      VALUES (${data.type}, ${title}, ${clean(data.description, 255)}, ${avatarOrNull(data.avatarUrl)}, ${me}, ${randomCode()})
      RETURNING id
    `);
    const chatId = chat!.id as number;
    await q(sql`INSERT INTO chat_members (chat_id, user_id, role) VALUES (${chatId}, ${me}, 'owner')`);
    await addMembers(chatId, Array.isArray(data.memberIds) ? data.memberIds : []);
    const name = (await getProfile(me))?.name ?? "";
    await systemMessage(chatId, me, data.type === "group" ? `${name} создал(а) группу «${title}»` : `Канал «${title}» создан`);
    return { id: chatId };
  }

  return fail(400, "Неизвестный тип чата");
}

function avatarOrNull(v: unknown) {
  return typeof v === "string" && v.startsWith("/api/files/") ? v : null;
}

async function addMembers(chatId: number, ids: unknown[]) {
  const valid = ids.filter((x): x is string => typeof x === "string" && x.length < 100).slice(0, 200);
  if (!valid.length) return 0;
  const rows = await q(sql`
    INSERT INTO chat_members (chat_id, user_id)
    SELECT ${chatId}, id FROM profiles WHERE id IN (${sql.join(valid.map((v) => sql`${v}`), sql`, `)})
    ON CONFLICT DO NOTHING
    RETURNING user_id
  `);
  return rows.length;
}

// ---------- files ----------

const SAFE_INLINE = /^(image\/(png|jpe?g|gif|webp|heic|heif|avif)|audio\/[\w.+-]+|video\/[\w.+-]+)$/i;

async function upload(req: Request, me: string) {
  const type = (req.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const name = decodeURIComponent(req.headers.get("x-file-name") || "file").slice(0, 200);
  const data = await req.arrayBuffer();
  if (!data.byteLength) fail(400, "Пустой файл");
  if (data.byteLength > 5.5 * 1024 * 1024) fail(413, "Файл слишком большой (максимум 5 МБ)");
  const key = `${Date.now().toString(36)}-${crypto.randomUUID()}`;
  await getStore("cosma-files").set(key, data, {
    metadata: { contentType: type, name, owner: me },
  });
  return { url: `/api/files/${key}`, name, size: data.byteLength, mime: type };
}

async function serveFile(key: string, req: Request) {
  const result = await getStore("cosma-files").getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) return new Response("Not found", { status: 404 });
  const meta = (result.metadata ?? {}) as Row;
  const type = String(meta.contentType || "application/octet-stream");
  const inline = SAFE_INLINE.test(type);
  const buf = new Uint8Array(result.data as ArrayBuffer);
  const headers: Record<string, string> = {
    "Content-Type": inline ? type : "application/octet-stream",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(String(meta.name || "file"))}`,
  };
  // Safari needs byte-range support to play audio and video.
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, buf.length - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), buf.length - 1) : buf.length - 1;
    if (start >= buf.length || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${buf.length}` } });
    }
    return new Response(buf.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${buf.length}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(buf, { headers: { ...headers, "Content-Length": String(buf.length) } });
}

// ---------- router ----------

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = req.method;
  const [a, b, c, d] = parts;

  if (a === "files" && b && method === "GET") {
    await requireUser();
    return serveFile(b, req);
  }

  const me = await requireUser();

  // /api/me
  if (a === "me") {
    if (method === "GET") return json(await getProfile(me));
    if (method === "PATCH") {
      const data = await body(req);
      if ("username" in data) {
        const username = clean(data.username, 32).replace(/^@/, "").toLowerCase();
        if (username && !/^[a-z0-9_]{4,32}$/.test(username)) {
          fail(400, "Имя пользователя: 4–32 символа, латиница, цифры и _");
        }
        if (username) {
          const taken = await one(sql`SELECT id FROM profiles WHERE username = ${username} AND id <> ${me}`);
          if (taken) fail(409, "Это имя пользователя уже занято");
        }
        await q(sql`UPDATE profiles SET username = ${username || null} WHERE id = ${me}`);
      }
      if ("name" in data) {
        const name = clean(data.name, 64);
        if (!name) fail(400, "Имя не может быть пустым");
        await q(sql`UPDATE profiles SET name = ${name} WHERE id = ${me}`);
      }
      if ("bio" in data) await q(sql`UPDATE profiles SET bio = ${clean(data.bio, 140)} WHERE id = ${me}`);
      if ("avatarUrl" in data) await q(sql`UPDATE profiles SET avatar_url = ${avatarOrNull(data.avatarUrl)} WHERE id = ${me}`);
      return json(await getProfile(me));
    }
  }

  // /api/users/search?q= , /api/users/:id
  if (a === "users" && method === "GET") {
    if (b === "search") {
      const term = clean(url.searchParams.get("q"), 64).replace(/^@/, "").toLowerCase();
      if (!term) return json([]);
      const like = `%${term.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
      return json(
        await q(sql`
          SELECT ${PROFILE_COLS} FROM profiles
          WHERE id <> ${me} AND (username ILIKE ${like} OR name ILIKE ${like} OR lower(email) = ${term})
          ORDER BY (username = ${term}) DESC, name LIMIT 30
        `),
      );
    }
    if (b) {
      const p = await one(sql`SELECT ${PROFILE_COLS} FROM profiles WHERE id = ${b}`);
      if (!p) fail(404, "Пользователь не найден");
      return json(p);
    }
  }

  // /api/join/:code
  if (a === "join" && b) {
    const chat = await one(sql`SELECT id, type, title, avatar_url AS "avatarUrl",
      (SELECT count(*)::int FROM chat_members WHERE chat_id = chats.id) AS "memberCount"
      FROM chats WHERE invite_code = ${b}`);
    if (!chat) fail(404, "Ссылка недействительна");
    if (method === "GET") return json(chat);
    if (method === "POST") {
      const added = await addMembers(chat!.id, [me]);
      if (added && chat!.type === "group") {
        await systemMessage(chat!.id, me, `${(await getProfile(me))?.name} присоединился(-ась) к группе`);
      }
      return json({ id: chat!.id });
    }
  }

  if (a === "upload" && method === "POST") return json(await upload(req, me));

  // /api/chats
  if (a === "chats") {
    if (!b) {
      if (method === "GET") return json(await listChats(me));
      if (method === "POST") return json(await createChat(me, await body(req)), 201);
    }
    const chatId = Number(b);
    if (!chatId) fail(400, "Неверный чат");

    if (!c) {
      if (method === "GET") return json(await chatDetails(chatId, me));
      if (method === "PATCH") {
        const m = await getMembership(chatId, me);
        if (!isAdmin(m) || m.type === "private" || m.type === "saved") fail(403, "Нет прав");
        const data = await body(req);
        if ("title" in data) {
          const title = clean(data.title, 128);
          if (!title) fail(400, "Укажите название");
          await q(sql`UPDATE chats SET title = ${title} WHERE id = ${chatId}`);
        }
        if ("description" in data) await q(sql`UPDATE chats SET description = ${clean(data.description, 255)} WHERE id = ${chatId}`);
        if ("avatarUrl" in data) await q(sql`UPDATE chats SET avatar_url = ${avatarOrNull(data.avatarUrl)} WHERE id = ${chatId}`);
        if (data.resetInvite) await q(sql`UPDATE chats SET invite_code = ${randomCode()} WHERE id = ${chatId}`);
        return json(await chatDetails(chatId, me));
      }
      if (method === "DELETE") {
        const m = await getMembership(chatId, me);
        if (m.type === "saved") {
          await q(sql`DELETE FROM messages WHERE chat_id = ${chatId}`);
        } else if (m.type === "private" || m.role === "owner") {
          await q(sql`DELETE FROM chats WHERE id = ${chatId}`);
        } else {
          await q(sql`DELETE FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${me}`);
          if (m.type === "group") await systemMessage(chatId, me, `${(await getProfile(me))?.name} покинул(а) группу`);
        }
        return json({ ok: true });
      }
    }

    if (c === "messages") {
      await getMembership(chatId, me);
      if (method === "GET") return json(await listMessages(chatId, me, url));
      if (method === "POST") return json(await sendMessage(chatId, me, await body(req)), 201);
    }

    if (c === "read" && method === "POST") {
      const { messageId } = await body(req);
      await q(sql`
        UPDATE chat_members SET last_read_id = GREATEST(last_read_id, ${Number(messageId) || 0})
        WHERE chat_id = ${chatId} AND user_id = ${me}
      `);
      return json({ ok: true });
    }

    if (c === "typing" && method === "POST") {
      await q(sql`UPDATE chat_members SET typing_at = now() WHERE chat_id = ${chatId} AND user_id = ${me}`);
      return json({ ok: true });
    }

    if (c === "settings" && method === "PATCH") {
      const data = await body(req);
      await getMembership(chatId, me);
      if (typeof data.pinned === "boolean") await q(sql`UPDATE chat_members SET pinned = ${data.pinned} WHERE chat_id = ${chatId} AND user_id = ${me}`);
      if (typeof data.muted === "boolean") await q(sql`UPDATE chat_members SET muted = ${data.muted} WHERE chat_id = ${chatId} AND user_id = ${me}`);
      if (typeof data.archived === "boolean") await q(sql`UPDATE chat_members SET archived = ${data.archived} WHERE chat_id = ${chatId} AND user_id = ${me}`);
      if (data.markUnread === false) {
        await q(sql`UPDATE chat_members SET last_read_id = (SELECT COALESCE(max(id), 0) FROM messages WHERE chat_id = ${chatId}) WHERE chat_id = ${chatId} AND user_id = ${me}`);
      }
      return json({ ok: true });
    }

    if (c === "pin" && method === "POST") {
      const m = await getMembership(chatId, me);
      if ((m.type === "group" || m.type === "channel") && !isAdmin(m)) fail(403, "Нет прав");
      const { messageId } = await body(req);
      const id = Number(messageId) || null;
      if (id) {
        const exists = await one(sql`SELECT id FROM messages WHERE id = ${id} AND chat_id = ${chatId} AND deleted = false`);
        if (!exists) fail(404, "Сообщение не найдено");
      }
      await q(sql`UPDATE chats SET pinned_message_id = ${id} WHERE id = ${chatId}`);
      return json({ ok: true });
    }

    if (c === "members") {
      const m = await getMembership(chatId, me);
      if (m.type !== "group" && m.type !== "channel") fail(400, "Нельзя изменить участников");
      if (method === "POST") {
        if (m.type === "channel" && !isAdmin(m)) fail(403, "Нет прав");
        const { userIds } = await body(req);
        const added = await addMembers(chatId, Array.isArray(userIds) ? userIds : []);
        if (added && m.type === "group") {
          await systemMessage(chatId, me, `${(await getProfile(me))?.name} добавил(а) участников: ${added}`);
        }
        return json(await chatDetails(chatId, me));
      }
      if (d && method === "DELETE") {
        if (d === me) fail(400, "Используйте «Покинуть»");
        if (!isAdmin(m)) fail(403, "Нет прав");
        const target = await one(sql`SELECT role FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${d}`);
        if (!target) fail(404, "Участник не найден");
        if (target!.role === "owner" || (target!.role === "admin" && m.role !== "owner")) fail(403, "Нет прав");
        await q(sql`DELETE FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${d}`);
        return json(await chatDetails(chatId, me));
      }
      if (d && method === "PATCH") {
        if (m.role !== "owner") fail(403, "Только владелец может назначать администраторов");
        const { role } = await body(req);
        if (role !== "admin" && role !== "member") fail(400, "Неверная роль");
        await q(sql`UPDATE chat_members SET role = ${role} WHERE chat_id = ${chatId} AND user_id = ${d} AND role <> 'owner'`);
        return json(await chatDetails(chatId, me));
      }
    }
  }

  // /api/messages/:id
  if (a === "messages" && b) {
    const id = Number(b);
    if (!c && method === "PATCH") {
      const { msg } = await getOwnMessage(id, me);
      if (msg.senderId !== me) fail(403, "Можно редактировать только свои сообщения");
      const text = clean((await body(req)).text, 4096);
      if (!text && msg.kind === "text") fail(400, "Пустое сообщение");
      await q(sql`UPDATE messages SET text = ${text}, edited_at = now(), updated_at = now() WHERE id = ${id}`);
      return json({ ok: true });
    }
    if (!c && method === "DELETE") {
      const { msg, m } = await getOwnMessage(id, me);
      const allowed = msg.senderId === me || m.type === "private" || m.type === "saved" || isAdmin(m);
      if (!allowed) fail(403, "Нет прав на удаление");
      await q(sql`UPDATE messages SET deleted = true, updated_at = now() WHERE id = ${id}`);
      await q(sql`UPDATE chats SET pinned_message_id = NULL WHERE id = ${msg.chatId} AND pinned_message_id = ${id}`);
      return json({ ok: true });
    }
    if (c === "react" && method === "POST") {
      await getOwnMessage(id, me);
      const emoji = clean((await body(req)).emoji, 16);
      const current = await one(sql`SELECT emoji FROM reactions WHERE message_id = ${id} AND user_id = ${me}`);
      if (!emoji || current?.emoji === emoji) {
        await q(sql`DELETE FROM reactions WHERE message_id = ${id} AND user_id = ${me}`);
      } else {
        await q(sql`
          INSERT INTO reactions (message_id, user_id, emoji) VALUES (${id}, ${me}, ${emoji})
          ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji
        `);
      }
      await q(sql`UPDATE messages SET updated_at = now() WHERE id = ${id}`);
      return json({ ok: true });
    }
    if (c === "forward" && method === "POST") {
      const { msg } = await getOwnMessage(id, me);
      const { chatIds } = await body(req);
      const original = await one(sql`
        SELECT m.kind, m.text, m.file_url, m.file_name, m.file_size, m.file_mime, m.duration,
          COALESCE(m.forwarded_from, CASE WHEN c.type = 'channel' THEN c.title ELSE p.name END) AS origin
        FROM messages m JOIN chats c ON c.id = m.chat_id LEFT JOIN profiles p ON p.id = m.sender_id
        WHERE m.id = ${msg.id}
      `);
      let count = 0;
      for (const target of (Array.isArray(chatIds) ? chatIds : []).slice(0, 20)) {
        const t = await one(sql`
          SELECT c.type, cm.role FROM chats c JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${me}
          WHERE c.id = ${Number(target)}
        `);
        if (!t || !canPost(t)) continue;
        await q(sql`
          INSERT INTO messages (chat_id, sender_id, kind, text, file_url, file_name, file_size, file_mime, duration, forwarded_from)
          VALUES (${Number(target)}, ${me}, ${original!.kind}, ${original!.text}, ${original!.file_url}, ${original!.file_name},
            ${original!.file_size}, ${original!.file_mime}, ${original!.duration}, ${original!.origin})
        `);
        count++;
      }
      return json({ ok: true, count });
    }
  }

  return json({ error: "Not found" }, 404);
}

export default async (req: Request, _context: Context) => {
  try {
    return await route(req);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Внутренняя ошибка сервера" }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
