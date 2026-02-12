CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"wallet_addr" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "conversations_conversation_id_unique" UNIQUE("conversation_id")
);
