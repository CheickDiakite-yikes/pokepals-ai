# Overview

POKEPALS is a retro-themed web application that transforms photos of friends into collectible 3D monster trading cards. Users can capture photos via camera, which are then analyzed and transformed into unique cards with AI-generated stats, artwork, and abilities. The app features a social component where users can explore and like cards created by others, building their own deck of transformed friend cards.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

**November 23, 2025**:
- Replaced Replit OAuth with custom email/password authentication (bcrypt, session-based)
- Configured Gemini API key as secret (using `gemini-3-pro-image-preview` model for card generation)
- Fixed card saving data transformation (frontend format → database schema mapping)
- Added comprehensive integration tests (`tests/card-save-test.ts`) - all passing ✅
- **Critical Fix**: Removed object storage upload dependency from card creation flow
  - Object storage integration was causing ObjectNotFoundError spam (76+ errors)
  - Cards now save base64 images directly to PostgreSQL database
  - Eliminates blocking PROCESSING state, cards save and display immediately
  - App functional with simplified storage architecture
- Added sign-out functionality to profile page with proper useAuth hook integration
- **Code Cleanup**: Removed all unused object storage code
  - Deleted `/objects/*`, `/api/objects/upload`, and `/api/cards/image` routes from routes.ts
  - Removed unused imports: ObjectStorageService, ObjectNotFoundError, ObjectPermission
  - Fixed all LSP TypeScript errors
- **Explore Page**: Removed hardcoded placeholder cards (Cyber Squirrel, Tech Guru, Sara Snaps, Vortex Viper)
  - Explore feed now shows only real user-created public cards
  - Clean, production-ready explore experience
- **User Profile Visiting Feature**: Added ability to visit other users' profiles from explore page
  - Clickable usernames in explore feed navigate to user profile view
  - New backend endpoints: GET /api/users/:userId and GET /api/users/:userId/cards
  - Updated GET /api/cards/public to include userId and trainer name with each card
  - User profile view displays trainer name and their public card collection
  - Fresh profile data fetched from API to prevent stale trainer names after renames
  - Back button navigation returns to explore feed
  - New AppState.USER_PROFILE for viewing other users' profiles
- **Camera Switching Feature**: Added ability to toggle between front and back cameras
  - Camera switch button added to camera interface (left side of capture button)
  - Supports both selfie mode (front camera) and environment mode (back camera)
  - Front camera view is mirrored for natural selfie experience
  - Back camera view is not mirrored for accurate photo capture
  - Smooth camera transition when switching modes
- **Social Media Share Preview**: Created on-brand Open Graph image and metadata
  - AI-generated retro gaming social banner (1792x1008px) in public/og-image.png
  - Comprehensive Open Graph meta tags for Facebook, Instagram, LinkedIn
  - Twitter/X card support with large image preview
  - WhatsApp-compatible metadata
  - Image dimensions and alt text specified for optimal sharing
  - Relative paths for deployment flexibility
- **Public Cards Persistence Fix**: Fixed bug where public cards disappeared after refresh
  - Added PATCH /api/cards/:id endpoint with validation for updating isPublic status
  - Implemented updateCardPublicStatus in storage layer with database persistence
  - Updated frontend to use API instead of IndexedDB for togglePublic
  - Public cards now persist in PostgreSQL and appear correctly in profile/explore pages
- **Profile Picture Persistence**: Implemented complete profile image storage system
  - Profile images stored as base64 data in PostgreSQL users.profileImageUrl (text column)
  - Added updateProfileImage storage method and PATCH /api/profile/image endpoint
  - Frontend calls API instead of IndexedDB for avatar uploads
  - Profile images load from backend user data on login/refresh and persist across sessions
  - Added sanitizeUser helper to prevent password hash exposure in API responses
  - Security: All user-facing endpoints now strip sensitive fields (passwordHash) before returning data
- **Deployment Configuration**: Configured Autoscale deployment for production
  - Build command: `npm run build` - Creates optimized production assets with Vite
  - Run command: `npm run server:prod` - Runs production server (no watch mode)
  - Production server serves both API (backend) and static files (frontend) on port 5000
  - Static file serving from dist/ directory in production mode
  - Health check endpoint at `/health` responds with 200 OK for deployment monitoring
  - SPA catch-all route (`/*`) serves index.html for all non-API routes
  - **CRITICAL**: Must set NODE_ENV=production as deployment secret in Autoscale settings
  - Port 5000 must be first localPort in .replit [[ports]] section for Autoscale
  - SESSION_SECRET configured as secret for production
- Production-ready authentication and card storage

# System Architecture

## Frontend Architecture

**Technology Stack**: React 19 with TypeScript, Vite build system, TailwindCSS for styling, and custom 3D CSS transforms for card flip animations.

**State Management**: Component-level state using React hooks (useState, useEffect, useRef). Application flow controlled via AppState enum (LANDING, CAMERA, PROCESSING, RESULT, DECK, PROFILE, EXPLORE, USER_PROFILE).

**Key Design Decisions**:
- **Single Page Application**: All interactions happen within one page with conditional rendering based on AppState
- **Progressive Web App**: Configured with manifest.json for installability and offline-first capabilities
- **Camera Integration**: Direct browser MediaStream API usage for photo capture with quality fallbacks (1080p ideal → basic constraints)
- **3D Card Rendering**: CSS 3D transforms with perspective for flip animations, rarity-based glow effects using box shadows
- **Audio Feedback**: Web Audio API generates retro 8-bit sounds procedurally (no audio files), including capture, save, and flip sounds

**Component Structure**:
- `CameraCapture`: Handles camera access and photo capture with quality negotiation
- `Card3D`: Renders flippable trading cards with front/back states and rarity-based visual effects
- `AuthForm`: Toggle between login/signup modes with validation

## Backend Architecture

**Technology Stack**: Express.js server with TypeScript, session-based authentication using bcrypt password hashing.

**Authentication Flow**: 
- Session management via `express-session` with PostgreSQL session store (`connect-pg-simple`)
- Password-based auth with bcrypt (12 rounds) 
- Session persistence across requests with HTTP-only cookies
- Trust proxy configuration for deployment compatibility

**API Design**:
- RESTful endpoints under `/api` prefix
- Authentication middleware (`isAuthenticated`) protects user-specific routes
- Card CRUD operations scoped to authenticated user
- Profile management separate from card operations
- Data transformation layer in POST /api/cards maps frontend format (originalImage, pokemonImage, stats JSON) to database schema

**Key Architectural Choices**:
- **Session-based auth over JWT**: Chosen for better security (server-side revocation) and simpler implementation
- **Request size limits**: 50MB JSON/URL-encoded bodies to support base64-encoded images
- **CORS configuration**: Credential support enabled for cross-origin authenticated requests

## Data Storage

**Database**: PostgreSQL accessed via Drizzle ORM with Neon serverless driver for connection pooling.

**Schema Design** (shared/schema.ts):
- `users`: Stores email, password hash, trainer name, profile images (URLs), timestamps
- `cards`: Stores card metadata (stats, images as URLs), references user via foreign key, includes privacy flag (isPublic)
- `sessions`: Managed by connect-pg-simple for Express session persistence

**Data Access Layer** (server/storage.ts):
- Interface-based design (`IStorage`) allows for potential storage backend swaps
- `DatabaseStorage` implementation provides user and card CRUD operations
- Operations scoped by userId to enforce data isolation

**Migration Strategy**:
- Function `migrateFromLocalStorage` in dbService.ts suggests original IndexedDB storage with migration path to PostgreSQL
- IndexedDB code preserved for offline-first capabilities or fallback scenarios

**Image Storage Strategy**:
- **Current Implementation**: Base64 images stored directly in PostgreSQL database
- Cards save and display using `data:image/png;base64,...` format
- No external object storage required (simplified architecture)
- Object storage service (`server/objectStorage.ts`) present but unused in current flow

## External Dependencies

**AI/ML Services**:
- **Google Gemini API** (`@google/genai`): Primary AI service for two distinct tasks:
  1. Image analysis → generates card stats (name, type, HP, attack, defense, moves, rarity) using `gemini-2.5-flash` based on photo content scoring rubric
  2. Image generation → creates stylized Pokemon-like character art using `gemini-3-pro-image-preview` model
- API key stored securely in Replit Secrets as `GEMINI_API_KEY`
- Rarity determination uses 100-point scoring system (environment, subject, vibe, extras)

**Cloud Services**:
- **Google Cloud Storage** (`@google-cloud/storage`): Object storage for card images and user uploads
- **Replit Sidecar**: External account authentication for GCS using Replit-specific token endpoint
- **Neon Database** (`@neondatabase/serverless`): Serverless PostgreSQL with WebSocket support for connection pooling

**Authentication Integrations**:
- **OpenID Connect** (`openid-client`): Configured for optional Replit OAuth authentication
- **Passport.js**: Authentication middleware framework (configured but appears unused in main flow)
- Dual auth strategy: Custom password-based (active) + Replit OIDC (configured, dormant)

**File Upload** (configured but not actively used):
- **Uppy** (`@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`, `@uppy/react`): File upload UI components
- Suggests future feature for direct image uploads vs. camera-only capture

**Development Tools**:
- **Drizzle Kit**: Database schema management and migrations
- **TSX**: TypeScript execution for server hot-reloading during development
- **Vite**: Frontend build tool with React plugin, proxy configuration for API routes

**Notable Libraries**:
- **Memoizee**: Caching for OIDC configuration (1-hour TTL)
- **WS**: WebSocket library for Neon database connections