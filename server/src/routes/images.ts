import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { enforceQuota } from "../middleware/quota.js";
import { objectId, validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, serviceUnavailable } from "../utils/errors.js";
import { Chat } from "../models/Chat.js";
import { gemini } from "../services/providers/gemini.js";
import { imageKitConfigured, uploadBase64 } from "../services/imagekit.js";
import { assertHistoryLimit } from "../services/chatStream.js";
import { makeMessage } from "../services/messages.js";

const router = Router();
router.use(requireAuth);

const IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * POST /api/images/generate — generate an image from a prompt.
 * With ImageKit configured the image is stored and appended to `chatId` when given;
 * without it the image is returned as a data URL and never persisted (it would bloat the chat document).
 */
router.post(
  "/generate",
  enforceQuota,
  validate({ body: z.object({ prompt: z.string().trim().min(1).max(2000), chatId: objectId.optional() }) }),
  asyncHandler(async (req, res) => {
    if (!gemini.isConfigured()) throw serviceUnavailable("Image generation requires GEMINI_API_KEY");
    const { prompt, chatId } = req.body as { prompt: string; chatId?: string };

    const chat = chatId ? await Chat.findOne({ _id: chatId, userId: req.userId }) : null;
    if (chatId && !chat) throw notFound("Chat not found");
    if (chat) assertHistoryLimit(chat);

    const image = await gemini.generateImage(prompt);
    if (!image) throw badRequest("The model did not return an image. Try a more descriptive prompt.");

    if (!imageKitConfigured()) {
      const dataUrl = `data:${image.mimeType};base64,${image.data}`;
      res.status(201).json({ prompt, mimeType: image.mimeType, filePath: "", url: dataUrl, persisted: false });
      return;
    }

    const stored = await uploadBase64(image.data, `generated-${Date.now()}.png`);
    if (chat) {
      const now = new Date();
      chat.messages.push(
        makeMessage({ role: "user", text: `🎨 ${prompt}`, createdAt: now }),
        makeMessage({ role: "model", text: "Here is the generated image.", model: IMAGE_MODEL, createdAt: now, images: [{ filePath: stored.filePath, mimeType: image.mimeType, url: stored.url }] }),
      );
      chat.messageCount = chat.messages.length;
      chat.lastMessageAt = now;
      await chat.save();
    }
    res.status(201).json({ prompt, mimeType: image.mimeType, ...stored, persisted: Boolean(chat) });
  }),
);

export default router;
