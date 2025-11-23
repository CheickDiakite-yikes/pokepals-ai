
export enum AppState {
  LANDING = 'LANDING',
  CAMERA = 'CAMERA',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  DECK = 'DECK',
  PROFILE = 'PROFILE',
  EXPLORE = 'EXPLORE'
}

export interface PokemonStats {
  name: string;
  type: string;
  hp: number;
  attack: number;
  defense: number;
  description: string;
  moves: string[];
  weakness: string;
  rarity: 'Common' | 'Rare' | 'Legendary' | 'Exotic';
}

export interface FriendCard {
  id: string;
  originalImage: string; // Base64
  pokemonImage: string; // Base64
  cardBackImage?: string; // Base64
  stats: PokemonStats;
  timestamp: number;
  isPublic?: boolean; // New field for privacy management
}

export interface TrainerProfile {
  name: string;
  avatar?: string; // Base64
}

export type ImageSize = '1K' | '2K' | '4K';

export interface GenerationConfig {
  size: ImageSize;
  stylePreset: '3D Render' | 'Pixel Art' | 'Anime';
}
