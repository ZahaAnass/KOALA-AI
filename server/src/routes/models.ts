import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listModels } from "../services/providers/index.js";
import { env } from "../config/env.js";
import { imageKitConfigured } from "../services/imagekit.js";
import { gemini } from "../services/providers/gemini.js";

const router = Router();

/** GET /api/models — available models and feature flags for the client. */
router.get("/", requireAuth, (_req, res) => {
  res.json({
    defaultModel: env.DEFAULT_MODEL,
    models: listModels(),
    features: {
      imageUploads: imageKitConfigured(),
      imageGeneration: gemini.isConfigured(),
      // Documents always work; without Gemini retrieval falls back to keyword search.
      documents: true,
      webSearch: gemini.isConfigured(),
      tools: gemini.isConfigured(),
    },
  });
});

export default router;
