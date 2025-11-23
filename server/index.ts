import express from "express";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (required for Replit)
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session setup - MUST be before routes
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: sessionTtl,
  tableName: "sessions",
});

app.use(session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    maxAge: sessionTtl,
  },
}));

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
}

async function startServer() {
  const server = await registerRoutes(app);
  const port = isProduction ? 5000 : 3001;
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`${isProduction ? 'Production' : 'Backend'} server running on port ${port}`);
  });
}

startServer().catch(console.error);
