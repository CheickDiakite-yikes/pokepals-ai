# POKEPALS - Collect Your Friends!

> Transform photos of your friends into collectible monster trading cards powered by AI

https://youtube.com/shorts/_8ePs8tF42Q

https://pokepals-cheickdiakite.replit.app/
---

## About

POKEPALS is a retro-styled web app that brings the magic of collectible card games to your camera roll. Take a photo of anyone, anywhere, and watch as AI transforms it into a unique trading card with custom artwork, stats, abilities, and rarity.

Every card is one-of-a-kind. The AI analyzes your photo's environment, lighting, colors, and subject to generate truly dynamic stats. Take a photo at a famous landmark? Expect a powerful card. Capture someone doing something epic? Watch that power score climb.

---

## How It Works

1. **Snap** - Use your phone's camera to capture a photo
2. **Transform** - AI analyzes the scene and generates a unique monster
3. **Collect** - Add the card to your personal deck
4. **Share** - Make cards public for others to discover

---

## Card Attributes

Each generated card includes:

| Attribute | Description |
|-----------|-------------|
| **Name** | AI-generated monster name based on the photo |
| **Type** | Fire, Water, Nature, Electric, Psychic, or Shadow |
| **Power Score** | 0-1000 rating based on photo quality and location |
| **Moves** | Two unique abilities with damage values |
| **Weakness** | Counter-type for battle mechanics |
| **Rarity** | Common, Uncommon, Rare, Epic, or Legendary |
| **Artwork** | Stylized monster illustration generated from the photo |

---

## Features

**For Collectors**
- 3D flip-card gallery with smooth animations
- Rarity-based glow effects (gold for Legendary!)
- Front and back camera support
- Profile customization with trainer name and avatar

**Social**
- Browse the public explore feed
- Visit other trainers' profiles
- Toggle cards between private and public

**Fair Usage**
- 10 cards per month for regular users
- Resets on the 1st of each month

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Express.js, TypeScript, Drizzle ORM |
| Database | PostgreSQL (Neon Serverless) |
| Auth | Session-based with bcrypt password hashing |
| AI | Google Gemini API (analysis + image generation) |

---

## Quick Start

### Requirements
- Node.js 20+
- PostgreSQL database
- Google Gemini API key

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
# DATABASE_URL - PostgreSQL connection string
# GEMINI_API_KEY - Your Gemini API key
# SESSION_SECRET - Random string for session encryption

# Run in development
npm run dev

# Build for production
npm run build
npm run server:prod
```

Server runs on port **5000**.

---

## Project Layout

```
client/              React frontend
  └── src/
      ├── App.tsx    Main application
      └── hooks/     Custom React hooks

server/              Express backend
  ├── routes.ts      API endpoints
  ├── storage.ts     Database layer
  └── auth.ts        Authentication

services/            Shared services
  └── geminiService.ts   AI integration

shared/              Shared code
  └── schema.ts      Database schema
```

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/user` | GET | Current user info |

### Cards
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cards` | GET | User's card collection |
| `/api/cards` | POST | Generate new card |
| `/api/cards/:id` | PATCH | Update visibility |
| `/api/cards/:id` | DELETE | Remove card |
| `/api/cards/public` | GET | Public feed (paginated) |
| `/api/cards/usage` | GET | Monthly usage stats |

### Profile
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | PATCH | Update trainer name |
| `/api/profile/image` | PATCH | Update avatar |
| `/api/users/:id` | GET | View user profile |
| `/api/users/:id/cards` | GET | User's public cards |

---

Built with Replit
