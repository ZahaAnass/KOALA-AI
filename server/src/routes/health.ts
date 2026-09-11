import { Router } from "express";
import { dbReady } from "../config/db.js";
import { listModels } from "../services/providers/index.js";
import { imageKitConfigured } from "../services/imagekit.js";

const router = Router();
const startedAt = Date.now();

/** GET /health — liveness. */
router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), version: process.env.npm_package_version ?? "2.0.0" });
});

/** GET /ready — readiness: database and at least one AI provider. */
router.get("/ready", (_req, res) => {
  const db = dbReady();
  const ai = listModels().length > 0;
  const ok = db && ai;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ready" : "degraded",
    checks: { database: db ? "up" : "down", aiProvider: ai ? "configured" : "missing", imageUploads: imageKitConfigured() ? "configured" : "disabled" },
  });
});

export default router;
