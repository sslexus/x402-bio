import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: text("conversation_id").notNull().unique(),
  walletAddr: text("wallet_addr").notNull(),
  state: text("state").notNull().default("pending"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
