import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text().primaryKey(),
  email: text().notNull().default(""),
  name: text().notNull().default(""),
  username: text().unique(),
  bio: text().notNull().default(""),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: serial().primaryKey(),
  // private | group | channel | saved
  type: text().notNull(),
  title: text().notNull().default(""),
  description: text().notNull().default(""),
  avatarUrl: text("avatar_url"),
  ownerId: text("owner_id"),
  inviteCode: text("invite_code").unique(),
  pinnedMessageId: integer("pinned_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // owner | admin | member
    role: text().notNull().default("member"),
    lastReadId: integer("last_read_id").notNull().default(0),
    pinned: boolean().notNull().default(false),
    muted: boolean().notNull().default(false),
    archived: boolean().notNull().default(false),
    typingAt: timestamp("typing_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.userId] }), index("chat_members_user_idx").on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey(),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    // text | image | video | file | voice | system
    kind: text().notNull().default("text"),
    text: text().notNull().default(""),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    fileMime: text("file_mime"),
    duration: integer(),
    replyToId: integer("reply_to_id"),
    forwardedFrom: text("forwarded_from"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deleted: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("messages_chat_idx").on(t.chatId, t.id), index("messages_updated_idx").on(t.chatId, t.updatedAt)],
);

export const reactions = pgTable(
  "reactions",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    emoji: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);
