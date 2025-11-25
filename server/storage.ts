import {
  users,
  cards,
  type User,
  type UpsertUser,
  type InsertCard,
  type Card,
} from "../shared/schema.js";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface CardWithUser extends Card {
  trainerName: string | null;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByIds(ids: string[]): Promise<Map<string, User>>;
  createUser(user: { email: string; passwordHash: string; trainerName?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateTrainerName(userId: string, trainerName: string): Promise<void>;
  updateProfileImage(userId: string, profileImageUrl: string): Promise<void>;
  
  // Card operations
  createCard(card: InsertCard): Promise<Card>;
  getUserCards(userId: string): Promise<Card[]>;
  getAllPublicCards(): Promise<Card[]>;
  getPublicCardsWithUsers(limit?: number, cursorTimestamp?: string): Promise<CardWithUser[]>;
  getUserPublicCards(userId: string): Promise<Card[]>;
  deleteCard(cardId: string, userId: string): Promise<void>;
  updateCardPublicStatus(cardId: string, userId: string, isPublic: boolean): Promise<void>;
  getMonthlyCardCount(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByIds(ids: string[]): Promise<Map<string, User>> {
    if (ids.length === 0) return new Map();
    
    const userList = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ANY(${ids})`);
    
    return new Map(userList.map(user => [user.id, user]));
  }

  async createUser(userData: { email: string; passwordHash: string; trainerName?: string | null }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      passwordHash: userData.passwordHash,
      trainerName: userData.trainerName,
    }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateTrainerName(userId: string, trainerName: string): Promise<void> {
    await db
      .update(users)
      .set({ trainerName, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateProfileImage(userId: string, profileImageUrl: string): Promise<void> {
    await db
      .update(users)
      .set({ profileImageUrl, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Card operations
  async createCard(card: InsertCard): Promise<Card> {
    const [newCard] = await db.insert(cards).values(card).returning();
    return newCard;
  }

  async getUserCards(userId: string): Promise<Card[]> {
    return await db
      .select()
      .from(cards)
      .where(eq(cards.userId, userId))
      .orderBy(desc(cards.timestamp));
  }

  async getAllPublicCards(): Promise<Card[]> {
    return await db
      .select()
      .from(cards)
      .where(eq(cards.isPublic, true))
      .orderBy(desc(cards.timestamp));
  }

  async getPublicCardsWithUsers(limit: number = 20, cursorTimestamp?: string): Promise<CardWithUser[]> {
    // Build query with optional cursor for pagination (using timestamp for correct ordering)
    let query = db
      .select({
        id: cards.id,
        userId: cards.userId,
        originalImageUrl: cards.originalImageUrl,
        pokemonImageUrl: cards.pokemonImageUrl,
        cardBackImageUrl: cards.cardBackImageUrl,
        name: cards.name,
        type: cards.type,
        hp: cards.hp,
        attack: cards.attack,
        defense: cards.defense,
        description: cards.description,
        moves: cards.moves,
        weakness: cards.weakness,
        rarity: cards.rarity,
        isPublic: cards.isPublic,
        timestamp: cards.timestamp,
        trainerName: users.trainerName,
      })
      .from(cards)
      .leftJoin(users, eq(cards.userId, users.id))
      .where(
        cursorTimestamp 
          ? and(eq(cards.isPublic, true), sql`${cards.timestamp} < ${cursorTimestamp}::timestamp`)
          : eq(cards.isPublic, true)
      )
      .orderBy(desc(cards.timestamp))
      .limit(limit);

    const results = await query;
    return results as CardWithUser[];
  }

  async getUserPublicCards(userId: string): Promise<Card[]> {
    return await db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.isPublic, true)))
      .orderBy(desc(cards.timestamp));
  }

  async deleteCard(cardId: string, userId: string): Promise<void> {
    await db
      .delete(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  }

  async updateCardPublicStatus(cardId: string, userId: string, isPublic: boolean): Promise<void> {
    await db
      .update(cards)
      .set({ isPublic })
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  }

  async getMonthlyCardCount(userId: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(and(
        eq(cards.userId, userId),
        gte(cards.timestamp, firstDayOfMonth)
      ));
    
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DatabaseStorage();
