CREATE TABLE "chat_members" (
	"chat_id" integer,
	"user_id" text,
	"role" text DEFAULT 'member' NOT NULL,
	"last_read_id" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"muted" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"typing_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_members_pkey" PRIMARY KEY("chat_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" serial PRIMARY KEY,
	"type" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"owner_id" text,
	"invite_code" text UNIQUE,
	"pinned_message_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY,
	"chat_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"file_mime" text,
	"duration" integer,
	"reply_to_id" integer,
	"forwarded_from" text,
	"edited_at" timestamp with time zone,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"email" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"username" text UNIQUE,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"message_id" integer,
	"user_id" text,
	"emoji" text NOT NULL,
	CONSTRAINT "reactions_pkey" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "chat_members_user_idx" ON "chat_members" ("user_id");--> statement-breakpoint
CREATE INDEX "messages_chat_idx" ON "messages" ("chat_id","id");--> statement-breakpoint
CREATE INDEX "messages_updated_idx" ON "messages" ("chat_id","updated_at");--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;