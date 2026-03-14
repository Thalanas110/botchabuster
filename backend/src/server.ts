import express from "express";
import cors from "cors";
import fs from "fs";
import { Config } from "./config";
import analysisRoutes from "./routes/analysis";
import profileRoutes from "./routes/profiles";
import inspectionRoutes from "./routes/inspections";
import accessCodeRoutes from "./routes/accessCodes";
import statsRoutes from "./routes/stats";

const config = Config.getInstance();
const app = express();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/analysis", analysisRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/access-codes", accessCodeRoutes);
app.use("/api/stats", statsRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`MeatGuard backend running on port ${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/analysis/health`);
});

export default app;
