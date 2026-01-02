# POKEPALS

Transform your friends into collectible monster trading cards using AI-powered photo analysis.

## What is POKEPALS?

POKEPALS is a retro-themed web application that turns photos into unique trading cards. Snap a photo, and our AI analyzes the scene to generate a one-of-a-kind monster card complete with:

- Custom monster artwork in a stylized art style
- Dynamic stats based on the photo's environment, lighting, and subject
- Unique abilities and moves
- Rarity classification from Common to Legendary
- Type assignment (Fire, Water, Nature, Electric, Psychic, Shadow)

## Features

### Card Generation
- **Camera Capture**: Use front or back camera to snap photos
- **AI Analysis**: Photos are analyzed for scene factors like colors, expressions, setting, and props
- **Dynamic Scoring**: Cards receive a power score (0-1000) based on photo quality and location
- **Stylized Art**: AI generates unique monster artwork from your photo

### Card Collection
- **Personal Deck**: View all your created cards in a 3D flip-card gallery
- **Public Sharing**: Toggle cards between private and public visibility
- **Profile Customization**: Set your trainer name and avatar

### Social Features
- **Explore Feed**: Browse public cards from other trainers
- **User Profiles**: Visit other trainers' profiles to see their collections

### Usage Limits
- Regular users: 10 card generations per month
- Monthly limit resets on the 1st of each calendar month

## Tech Stack

**Frontend**
- React 19 with TypeScript
- Vite build system
- TailwindCSS for styling
- Custom 3D CSS transforms for card animations

**Backend**
- Express.js with TypeScript
- PostgreSQL database (Neon serverless)
- Drizzle ORM
- Session-based authentication with bcrypt

**AI Services**
- Google Gemini API for photo analysis and stat generation
- Google Gemini for stylized monster artwork generation

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Google Gemini API key

### Environment Variables
Set the following secrets:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `SESSION_SECRET` - Secret for session encryption

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run server:prod
```

The app runs on port 5000.

## Project Structure

```
/
├── client/           # React frontend source
├── server/           # Express backend
│   ├── routes.ts     # API endpoints
│   ├── storage.ts    # Database operations
│   └── auth.ts       # Authentication middleware
├── services/         # Shared services
│   └── geminiService.ts  # AI integration
├── shared/           # Shared types and schema
│   └── schema.ts     # Drizzle database schema
├── public/           # Static assets
└── dist/             # Production build output
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/user` | Get current user |
| GET | `/api/cards` | Get user's cards |
| POST | `/api/cards` | Create new card |
| PATCH | `/api/cards/:id` | Update card visibility |
| DELETE | `/api/cards/:id` | Delete card |
| GET | `/api/cards/public` | Get public cards feed |
| GET | `/api/cards/usage` | Get monthly usage stats |

## License

This project is proprietary software.
