import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  trainerName: varchar("trainer_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pokemon cards table
export const cards = pgTable("cards", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  originalImageUrl: varchar("original_image_url"),
  pokemonImageUrl: varchar("pokemon_image_url").notNull(),
  cardBackImageUrl: varchar("card_back_image_url"),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  hp: integer("hp").notNull(),
  attack: integer("attack").notNull(),
  defense: integer("defense").notNull(),
  description: text("description").notNull(),
  moves: jsonb("moves").notNull(),
  weakness: varchar("weakness").notNull(),
  rarity: varchar("rarity").notNull(),
  isPublic: boolean("is_public").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_cards_public_timestamp").on(table.isPublic, table.timestamp),
  index("idx_cards_user_id").on(table.userId),
  index("idx_cards_user_timestamp").on(table.userId, table.timestamp),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;
export type Card = typeof cards.$inferSelect;
