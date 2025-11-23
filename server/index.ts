import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

async function startServer() {
  const server = await registerRoutes(app);
  const port = 3001;
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on port ${port}`);
  });
}

startServer().catch(console.error);
