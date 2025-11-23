import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signup, login, logout, isAuthenticated, getCurrentUser, type AuthRequest } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/signup', signup);
  app.post('/api/auth/login', login);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/user', getCurrentUser);

  // Update trainer name
  app.put('/api/profile', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const { trainerName } = req.body;
      await storage.updateTrainerName(userId, trainerName);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Card routes
  app.post('/api/cards', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const { originalImage, pokemonImage, cardBackImage, stats: statsString, timestamp, isPublic } = req.body;
      
      // Parse stats from JSON string
      const stats = typeof statsString === 'string' ? JSON.parse(statsString) : statsString;
      
      // Transform frontend card format to database schema
      const cardData = {
        id: Date.now().toString(),
        userId,
        originalImageUrl: originalImage || null,
        pokemonImageUrl: pokemonImage,
        cardBackImageUrl: cardBackImage || null,
        name: stats.name,
        type: stats.type,
        hp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        description: stats.description,
        moves: stats.moves,
        weakness: stats.weakness,
        rarity: stats.rarity,
        isPublic: isPublic || false,
      };
      
      const card = await storage.createCard(cardData);
      
      // Transform back to frontend format
      const frontendCard = {
        id: card.id,
        originalImage: card.originalImageUrl || '',
        pokemonImage: card.pokemonImageUrl,
        cardBackImage: card.cardBackImageUrl || '',
        stats: {
          name: card.name,
          type: card.type,
          hp: card.hp,
          attack: card.attack,
          defense: card.defense,
          description: card.description,
          moves: card.moves,
          weakness: card.weakness,
          rarity: card.rarity,
        },
        timestamp: new Date(card.timestamp).getTime(),
        isPublic: card.isPublic,
      };
      
      res.json(frontendCard);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.get('/api/cards', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      console.log(`[GET /api/cards] Fetching cards for user: ${userId}`);
      
      const cards = await storage.getUserCards(userId);
      console.log(`[GET /api/cards] Found ${cards.length} cards in database`);
      
      // Transform database format to frontend format
      const frontendCards = cards.map((card, index) => {
        console.log(`[GET /api/cards] Transforming card ${index + 1}/${cards.length}: ${card.id}, name: ${card.name}, has moves: ${!!card.moves}`);
        
        return {
          id: card.id,
          originalImage: card.originalImageUrl || '',
          pokemonImage: card.pokemonImageUrl,
          cardBackImage: card.cardBackImageUrl || '',
          stats: {
            name: card.name,
            type: card.type,
            hp: card.hp,
            attack: card.attack,
            defense: card.defense,
            description: card.description,
            moves: card.moves,
            weakness: card.weakness,
            rarity: card.rarity,
          },
          timestamp: new Date(card.timestamp).getTime(),
          isPublic: card.isPublic,
        };
      });
      
      console.log(`[GET /api/cards] Successfully transformed ${frontendCards.length} cards`);
      res.json(frontendCards);
    } catch (error) {
      console.error("[GET /api/cards] Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.get('/api/cards/public', async (req, res) => {
    try {
      const cards = await storage.getAllPublicCards();
      
      // Get user info for each card
      const frontendCards = await Promise.all(cards.map(async (card) => {
        const user = await storage.getUser(card.userId);
        return {
          id: card.id,
          originalImage: card.originalImageUrl || '',
          pokemonImage: card.pokemonImageUrl,
          cardBackImage: card.cardBackImageUrl || '',
          stats: {
            name: card.name,
            type: card.type,
            hp: card.hp,
            attack: card.attack,
            defense: card.defense,
            description: card.description,
            moves: card.moves,
            weakness: card.weakness,
            rarity: card.rarity,
          },
          timestamp: new Date(card.timestamp).getTime(),
          isPublic: card.isPublic,
          userId: card.userId,
          user: user?.trainerName || 'Unknown Trainer',
          likes: 0,
        };
      }));
      
      res.json(frontendCards);
    } catch (error) {
      console.error("Error fetching public cards:", error);
      res.status(500).json({ message: "Failed to fetch public cards" });
    }
  });

  app.delete('/api/cards/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const cardId = req.params.id;
      
      // Verify card exists and belongs to user
      const userCards = await storage.getUserCards(userId);
      const cardExists = userCards.some(card => card.id === cardId);
      
      if (!cardExists) {
        return res.status(404).json({ message: "Card not found or access denied" });
      }
      
      await storage.deleteCard(cardId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  app.patch('/api/cards/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const cardId = req.params.id;
      const { isPublic } = req.body;
      
      // Validate isPublic is a boolean
      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: "isPublic must be a boolean" });
      }
      
      // Verify card exists and belongs to user
      const userCards = await storage.getUserCards(userId);
      const card = userCards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Card not found or access denied" });
      }
      
      await storage.updateCardPublicStatus(cardId, userId, isPublic);
      res.json({ success: true, isPublic });
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  // User profile routes
  app.get('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ 
        id: user.id, 
        trainerName: user.trainerName || 'Unknown Trainer' 
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  app.get('/api/users/:userId/cards', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const cards = await storage.getUserPublicCards(userId);
      
      // Transform database format to frontend format
      const frontendCards = cards.map(card => ({
        id: card.id,
        originalImage: card.originalImageUrl || '',
        pokemonImage: card.pokemonImageUrl,
        cardBackImage: card.cardBackImageUrl || '',
        stats: {
          name: card.name,
          type: card.type,
          hp: card.hp,
          attack: card.attack,
          defense: card.defense,
          description: card.description,
          moves: card.moves,
          weakness: card.weakness,
          rarity: card.rarity,
        },
        timestamp: new Date(card.timestamp).getTime(),
        isPublic: card.isPublic,
      }));
      
      res.json(frontendCards);
    } catch (error) {
      console.error('Error fetching user cards:', error);
      res.status(500).json({ message: 'Failed to fetch user cards' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
