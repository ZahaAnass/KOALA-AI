import { Router } from "express";
import { z } from "zod";
import { Chat } from "../models/Chat.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";

const router = Router();

/** GET /api/share/:token — public, read-only view of a shared chat. */
router.get(
  "/:token",
  validate({ params: z.object({ token: z.string().min(8).max(64) }) }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ shareToken: req.params.token }).lean();
    if (!chat) throw notFound("This shared chat does not exist or was revoked");
    res.json({
      title: chat.title,
      model: chat.model,
      sharedAt: chat.sharedAt,
      createdAt: chat.createdAt,
      messages: chat.messages.map((m) => ({
        _id: String(m._id),
        role: m.role,
        text: m.text,
        images: m.images,
        sources: m.sources,
        createdAt: m.createdAt,
      })),
    });
  }),
);

export default router;
