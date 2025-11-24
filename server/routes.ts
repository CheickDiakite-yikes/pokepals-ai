import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signup, login, logout, isAuthenticated, getCurrentUser, sanitizeUser, type AuthRequest } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

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
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update profile image
  app.patch('/api/profile/image', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const { profileImageUrl } = req.body;
      
      if (!profileImageUrl || typeof profileImageUrl !== 'string') {
        return res.status(400).json({ message: "profileImageUrl is required and must be a string" });
      }
      
      await storage.updateProfileImage(userId, profileImageUrl);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });

  // Card routes
  // Admin user with unlimited access
  // Note: Email is unique in database (schema enforces this), so this email cannot be hijacked by other users
  const ADMIN_EMAIL = 'zorovt18@gmail.com';
  
  // Helper function to check if user is admin
  const isAdminUser = (user: any): boolean => {
    return user && user.email === ADMIN_EMAIL;
  };
  
  // Get monthly usage stats
  app.get('/api/cards/usage', isAuthenticated, async (req: AuthRequest, res) => {
    console.log('[GET /api/cards/usage] Request received');
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      console.log('[GET /api/cards/usage] User:', user?.email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin users have unlimited access
      if (isAdminUser(user)) {
        const monthlyCount = await storage.getMonthlyCardCount(userId);
        console.log('[GET /api/cards/usage] Admin user detected, monthly count:', monthlyCount);
        return res.json({
          used: monthlyCount,
          limit: 999999,
          remaining: 999999,
          hasReachedLimit: false,
          isAdmin: true
        });
      }
      
      // Regular users have 10 card limit
      const monthlyCount = await storage.getMonthlyCardCount(userId);
      const limit = 10;
      console.log('[GET /api/cards/usage] Regular user, monthly count:', monthlyCount);
      
      res.json({
        used: monthlyCount,
        limit: limit,
        remaining: Math.max(0, limit - monthlyCount),
        hasReachedLimit: monthlyCount >= limit
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  app.post('/api/cards', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check monthly limit (10 cards per month) - skip for admin
      if (!isAdminUser(user)) {
        const monthlyCount = await storage.getMonthlyCardCount(userId);
        const MONTHLY_LIMIT = 10;
        
        if (monthlyCount >= MONTHLY_LIMIT) {
          return res.status(429).json({ 
            message: "Monthly card limit reached",
            used: monthlyCount,
            limit: MONTHLY_LIMIT
          });
        }
      }
      
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

  // SPA catch-all route for production (must be last)
  // Serves index.html for all non-API routes
  if (process.env.NODE_ENV === 'production') {
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Fallback middleware for SPA - serves index.html for any non-API GET requests
    app.use((req, res, next) => {
      // Only handle GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Don't handle API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Serve index.html for all other routes (SPA routing)
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
