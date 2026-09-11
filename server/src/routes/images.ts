import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { enforceQuota, recordUsage } from "../middleware/quota.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { gemini } from "../services/providers/gemini.js";
import { imageKitConfigured, uploadBase64 } from "../services/imagekit.js";
import { serviceUnavailable, badRequest } from "../utils/errors.js";
import { Chat } from "../models/Chat.js";
import { objectId } from "../middleware/validate.js";
import mongoose from "mongoose";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/images/generate — generate an image from a prompt.
 * If ImageKit is configured the image is stored and its path returned; otherwise a data URL is returned.
 * When `chatId` is provided the prompt and image are appended to that chat.
 */
router.post(
  "/generate",
  enforceQuota,
  validate({ body: z.object({ prompt: z.string().trim().min(1).max(2000), chatId: objectId.optional() }) }),
  asyncHandler(async (req, res) => {
    if (!gemini.isConfigured()) throw serviceUnavailable("Image generation requires GEMINI_API_KEY");
    const { prompt, chatId } = req.body as { prompt: string; chatId?: string };
    const image = await gemini.generateImage(prompt);
    if (!image) throw badRequest("The model did not return an image. Try a more descriptive prompt.");

    let stored: { filePath: string; url: string };
    if (imageKitConfigured()) {
      stored = await uploadBase64(image.data, `generated-${Date.now()}.png`);
    } else {
      const dataUrl = `data:${image.mimeType};base64,${image.data}`;
      stored = { filePath: dataUrl, url: dataUrl };
    }
    await recordUsage(req.userId!);

    if (chatId) {
      const chat = await Chat.findOne({ _id: chatId, userId: req.userId });
      if (chat) {
        const now = new Date();
        chat.messages.push(
          { _id: new mongoose.Types.ObjectId(), role: "user", text: `🎨 ${prompt}`, images: [], sources: [], toolCalls: [], model: "", feedback: null, feedbackNote: "", usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 }, edited: false, createdAt: now },
          { _id: new mongoose.Types.ObjectId(), role: "model", text: "Here is the generated image.", images: [{ filePath: stored.filePath, mimeType: image.mimeType, url: stored.url }], sources: [], toolCalls: [], model: "gemini-2.5-flash-image", feedback: null, feedbackNote: "", usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 }, edited: false, createdAt: now },
        );
        chat.messageCount = chat.messages.length;
        chat.lastMessageAt = now;
        await chat.save();
      }
    }

    res.status(201).json({ prompt, mimeType: image.mimeType, ...stored });
  }),
);

export default router;
