import {
  users,
  cards,
  type User,
  type UpsertUser,
  type InsertCard,
  type Card,
} from "../shared/schema.js";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; passwordHash: string; trainerName?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateTrainerName(userId: string, trainerName: string): Promise<void>;
  
  // Card operations
  createCard(card: InsertCard): Promise<Card>;
  getUserCards(userId: string): Promise<Card[]>;
  getAllPublicCards(): Promise<Card[]>;
  getUserPublicCards(userId: string): Promise<Card[]>;
  deleteCard(cardId: string, userId: string): Promise<void>;
  updateCardPublicStatus(cardId: string, userId: string, isPublic: boolean): Promise<void>;
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
}

export const storage = new DatabaseStorage();
