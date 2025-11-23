import bcrypt from 'bcrypt';
import type { RequestHandler } from 'express';
import { storage } from './storage';

const SALT_ROUNDS = 12;

export interface AuthRequest extends Express.Request {
  session: {
    userId?: string;
    save: (callback: (err: any) => void) => void;
    destroy: (callback: (err: any) => void) => void;
  };
}

export const signup: RequestHandler = async (req, res) => {
  try {
    const { email, password, trainerName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await storage.createUser({
      email,
      passwordHash,
      trainerName: trainerName || null,
    });

    (req as AuthRequest).session.userId = user.id;
    (req as AuthRequest).session.save((err: any) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Failed to save session' });
      }
      res.json({ id: user.id, email: user.email, trainerName: user.trainerName });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Signup failed' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    (req as AuthRequest).session.userId = user.id;
    (req as AuthRequest).session.save((err: any) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Failed to save session' });
      }
      res.json({ id: user.id, email: user.email, trainerName: user.trainerName });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const logout: RequestHandler = async (req, res) => {
  (req as AuthRequest).session.destroy((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req as AuthRequest).session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ id: user.id, email: user.email, trainerName: user.trainerName });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
};
