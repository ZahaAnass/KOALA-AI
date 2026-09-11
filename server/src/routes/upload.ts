import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { imageKitConfigured, imagekit } from "../services/imagekit.js";
import { env } from "../config/env.js";

const router = Router();
router.use(requireAuth);

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** GET /api/upload — signed ImageKit upload parameters for the authenticated user. */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const params = imagekit().getAuthenticationParameters();
    res.json({
      ...params,
      publicKey: env.IMAGE_KIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGE_KIT_END_POINT,
      allowedTypes: ALLOWED_IMAGE_TYPES,
      maxBytes: MAX_IMAGE_BYTES,
    });
  }),
);

/** GET /api/upload/config — lets the client know whether uploads are available. */
router.get("/config", (_req, res) => {
  res.json({ enabled: imageKitConfigured(), allowedTypes: ALLOWED_IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES, urlEndpoint: env.IMAGE_KIT_END_POINT ?? "" });
});

export default router;
