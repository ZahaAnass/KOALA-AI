import { Router } from "express";
import { z } from "zod";
import { clerkClient } from "@clerk/express";
import { invalidateUserCache, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SAFETY_LEVELS, User } from "../models/User.js";
import { Chat } from "../models/Chat.js";
import { KnowledgeDocument } from "../models/Document.js";
import { PromptTemplate } from "../models/PromptTemplate.js";
import { quotaFor, todayKey } from "../middleware/quota.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { listModels } from "../services/providers/index.js";

const router = Router();
router.use(requireAuth);

function publicUser(user: NonNullable<Express.Request["user"]>) {
  const quota = quotaFor(user);
  const usedToday = user.usage?.day === todayKey() ? (user.usage?.count ?? 0) : 0;
  return {
    id: user.clerkId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
    onboarded: user.onboarded,
    settings: user.settings,
    quota: { limit: Number.isFinite(quota) ? quota : null, usedToday, remaining: Number.isFinite(quota) ? Math.max(0, quota - usedToday) : null },
    totals: { messages: user.usage?.totalMessages ?? 0, tokens: user.usage?.totalTokens ?? 0 },
    createdAt: user.createdAt,
  };
}

/** GET /api/users/me */
router.get("/me", (req, res) => {
  res.json(publicUser(req.user!));
});

const settingsSchema = z
  .object({
    model: z.string().max(80).optional(),
    systemInstruction: z.string().max(4000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().min(64).max(65536).optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
    locale: z.enum(["en", "fr"]).optional(),
    safetyLevel: z.enum(SAFETY_LEVELS).optional(),
    followUps: z.boolean().optional(),
    webSearch: z.boolean().optional(),
    tools: z.boolean().optional(),
    useDocuments: z.boolean().optional(),
  })
  .strict();

/** PATCH /api/users/me/settings */
router.patch(
  "/me/settings",
  validate({ body: settingsSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof settingsSchema>;
    if (body.model && !listModels().some((m) => m.id === body.model)) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Unknown model" } });
      return;
    }
    const $set = Object.fromEntries(Object.entries(body).map(([k, v]) => [`settings.${k}`, v]));
    const user = await User.findOneAndUpdate({ clerkId: req.userId }, { $set }, { new: true, runValidators: true });
    invalidateUserCache(req.userId!);
    res.json(publicUser(user!));
  }),
);

/** POST /api/users/me/onboarded */
router.post(
  "/me/onboarded",
  asyncHandler(async (req, res) => {
    await User.updateOne({ clerkId: req.userId }, { $set: { onboarded: true } });
    invalidateUserCache(req.userId!);
    res.json({ ok: true });
  }),
);

/** GET /api/users/me/usage — messages per day for the last N days plus totals. */
router.get(
  "/me/usage",
  validate({ query: z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }) }),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await Chat.aggregate<{ _id: string; user: number; model: number; tokens: number }>([
      { $match: { userId: req.userId } },
      { $unwind: "$messages" },
      { $match: { "messages.createdAt": { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$messages.createdAt" } },
          user: { $sum: { $cond: [{ $eq: ["$messages.role", "user"] }, 1, 0] } },
          model: { $sum: { $cond: [{ $eq: ["$messages.role", "model"] }, 1, 0] } },
          tokens: { $sum: "$messages.usage.totalTokens" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const byDay = new Map(rows.map((r) => [r._id, r]));
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      const r = byDay.get(d);
      series.push({ day: d, user: r?.user ?? 0, model: r?.model ?? 0, tokens: r?.tokens ?? 0 });
    }
    const [chats, documents, modelsAgg] = await Promise.all([
      Chat.countDocuments({ userId: req.userId }),
      KnowledgeDocument.countDocuments({ userId: req.userId }),
      Chat.aggregate<{ _id: string; count: number }>([
        { $match: { userId: req.userId } },
        { $unwind: "$messages" },
        { $match: { "messages.role": "model", "messages.model": { $ne: "" } } },
        { $group: { _id: "$messages.model", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      days,
      series,
      totals: {
        chats,
        documents,
        messages: req.user!.usage?.totalMessages ?? 0,
        tokens: req.user!.usage?.totalTokens ?? 0,
      },
      models: modelsAgg.map((m) => ({ model: m._id, count: m.count })),
      quota: publicUser(req.user!).quota,
    });
  }),
);

/** DELETE /api/users/me — delete the account and every piece of data. */
router.delete(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    await Promise.all([
      Chat.deleteMany({ userId }),
      KnowledgeDocument.deleteMany({ userId }),
      PromptTemplate.deleteMany({ userId }),
      User.deleteOne({ clerkId: userId }),
    ]);
    invalidateUserCache(userId);
    if (env.CLERK_SECRET_KEY) {
      try {
        await clerkClient.users.deleteUser(userId);
      } catch (err) {
        logger.warn({ err, userId }, "Clerk user deletion failed (local data removed)");
      }
    }
    res.status(204).end();
  }),
);

export default router;
