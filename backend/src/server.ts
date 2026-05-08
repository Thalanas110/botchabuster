import express from "express";
import cors from "cors";
import fs from "fs";
import type { Server } from "http";
import { Config } from "./config";
import { createCorsOptions } from "./config/cors";
import analysisRoutes from "./routes/analysis";
import profileRoutes from "./routes/profiles";
import inspectionRoutes from "./routes/inspections";
import accessCodeRoutes from "./routes/accessCodes";
import statsRoutes from "./routes/stats";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import marketLocationRoutes from "./routes/marketLocations";
import auditLogRoutes from "./routes/auditLogs";

const config = Config.getInstance();
const app = express();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Middleware
app.use(cors(createCorsOptions(config.allowedOrigins)));
app.use(express.json());

// Routes
app.use("/api/analysis", analysisRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/access-codes", accessCodeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/market-locations", marketLocationRoutes);
app.use("/api/audit-logs", auditLogRoutes);

function handleServerError(error: NodeJS.ErrnoException): never {
  if (error.code === "EADDRINUSE") {
    console.error(`[Startup] Port ${config.port} is already in use.`);
    console.error(`[Startup] Stop the existing process or set PORT to a different value before starting backend.`);
    console.error(`[Startup] Example (PowerShell): $env:PORT=3002; npm run dev -w backend`);
    process.exit(1);
  }

  console.error("[Startup] Backend failed to start:", error);
  process.exit(1);
}

export function startServer(): Server {
  const server = app.listen(config.port, () => {
    console.log(`MeatLens backend running on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/api/analysis/health`);
    console.log(
      `Allowed origins: ${config.allowedOrigins.length > 0 ? config.allowedOrigins.join(", ") : "none configured"}`,
    );
  });

  server.on("error", handleServerError);
  return server;
}

if (require.main === module) {
  startServer();
}

export default app;
