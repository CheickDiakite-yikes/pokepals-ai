import { FriendCard, TrainerProfile } from '../types';

const API_BASE = '';

export interface AuthUser {
  id: string;
  email?: string;
  trainerName?: string;
  profileImageUrl?: string;
}

export const apiService = {
  async checkAuth(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        credentials: 'include',
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (error) {
      console.error('Auth check failed:', error);
      return null;
    }
  },

  async signup(email: string, password: string, trainerName?: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, trainerName }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Signup failed');
    }
    return await res.json();
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }
    return await res.json();
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Logout failed');
  },

  async updateProfile(trainerName: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ trainerName }),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return await res.json();
  },

  async updateProfileImage(profileImageUrl: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/api/profile/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileImageUrl }),
    });
    if (!res.ok) throw new Error('Failed to update profile image');
    return await res.json();
  },

  async getCards(): Promise<FriendCard[]> {
    const res = await fetch(`${API_BASE}/api/cards`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch cards');
    return await res.json();
  },

  async getCardUsage(): Promise<{ used: number; limit: number; remaining: number; hasReachedLimit: boolean }> {
    const res = await fetch(`${API_BASE}/api/cards/usage`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch usage stats');
    return await res.json();
  },

  async saveCard(card: Omit<FriendCard, 'id'>): Promise<FriendCard> {
    const cardData = {
      ...card,
      stats: JSON.stringify(card.stats),
    };

    const res = await fetch(`${API_BASE}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(cardData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to save card');
    }
    return await res.json();
  },

  async deleteCard(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cards/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete card');
  },

  async updateCard(id: string, updates: { isPublic: boolean }): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update card');
  },

  async uploadImage(base64Image: string): Promise<string> {
    const blob = await (await fetch(base64Image)).blob();
    
    const res = await fetch(`${API_BASE}/api/objects/upload`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!res.ok) throw new Error('Failed to get upload URL');
    const { uploadURL, objectPath } = await res.json();
    
    const uploadRes = await fetch(uploadURL, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
    });
    
    if (!uploadRes.ok) throw new Error('Failed to upload image');
    
    const aclRes = await fetch(`${API_BASE}/api/cards/image`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageURL: uploadURL }),
    });
    
    if (!aclRes.ok) throw new Error('Failed to set image ACL');
    
    return objectPath;
  },

  getObjectUrl(objectPath: string): string {
    return `${API_BASE}${objectPath}`;
  },

  async getUserProfile(userId: string): Promise<{ id: string; trainerName: string }> {
    const res = await fetch(`${API_BASE}/api/users/${userId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return await res.json();
  },

  async getUserPublicCards(userId: string): Promise<FriendCard[]> {
    const res = await fetch(`${API_BASE}/api/users/${userId}/cards`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch user cards');
    return await res.json();
  },

  async getPublicCards(): Promise<Array<FriendCard & { user: string; userId: string; likes: number }>> {
    const res = await fetch(`${API_BASE}/api/cards/public`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch public cards');
    return await res.json();
  },
};
