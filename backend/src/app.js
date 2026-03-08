import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRoutes from "./routes/health.routes.js";
import formRoutes from "./routes/form.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || "*";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.join(__dirname, "..", "public");

  app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin }));
  app.use(express.json());

  app.use(express.static(publicDir));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/admin", (_req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
  });

  app.use("/health", healthRoutes);
  app.use("/api/forms", formRoutes);
  app.use("/api/devices", deviceRoutes);

  app.use(errorHandler);
  return app;
}
