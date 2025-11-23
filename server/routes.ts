import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { signup, login, logout, isAuthenticated, getCurrentUser, type AuthRequest } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

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
      const cardData = {
        ...req.body,
        userId,
        id: Date.now().toString(),
      };
      const card = await storage.createCard(cardData);
      res.json(card);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.get('/api/cards', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.session.userId!;
      const cards = await storage.getUserCards(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.get('/api/cards/public', async (req, res) => {
    try {
      const cards = await storage.getAllPublicCards();
      res.json(cards);
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

  // Object storage routes - using req.params[0] to capture wildcard path
  app.use("/objects", isAuthenticated, async (req: AuthRequest, res) => {
    const userId = req.session.userId!;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/cards/image", isAuthenticated, async (req: AuthRequest, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.session.userId!;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting card image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
