import { Router } from "express";
import { z } from "zod";
import { invalidateUserCache, requireAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { Chat } from "../models/Chat.js";
import { KnowledgeDocument } from "../models/Document.js";
import { notFound, badRequest } from "../utils/errors.js";

const router = Router();
router.use(requireAuth, requireAdmin);

/** GET /api/admin/stats — platform-wide numbers for the dashboard. */
router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [users, chats, documents, msgAgg, daily, topModels, feedback] = await Promise.all([
      User.countDocuments(),
      Chat.countDocuments(),
      KnowledgeDocument.countDocuments(),
      Chat.aggregate<{ _id: null; messages: number; tokens: number }>([
        { $unwind: "$messages" },
        { $group: { _id: null, messages: { $sum: 1 }, tokens: { $sum: "$messages.usage.totalTokens" } } },
      ]),
      Chat.aggregate<{ _id: string; messages: number; activeUsers: number }>([
        { $unwind: "$messages" },
        { $match: { "messages.createdAt": { $gte: since }, "messages.role": "user" } },
        {
          $group: {
            _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$messages.createdAt" } }, user: "$userId" },
            messages: { $sum: 1 },
          },
        },
        { $group: { _id: "$_id.day", messages: { $sum: "$messages" }, activeUsers: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Chat.aggregate<{ _id: string; count: number }>([
        { $unwind: "$messages" },
        { $match: { "messages.role": "model", "messages.model": { $ne: "" } } },
        { $group: { _id: "$messages.model", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Chat.aggregate<{ _id: string; count: number }>([
        { $unwind: "$messages" },
        { $match: { "messages.feedback": { $in: ["up", "down"] } } },
        { $group: { _id: "$messages.feedback", count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      totals: {
        users,
        chats,
        documents,
        messages: msgAgg[0]?.messages ?? 0,
        tokens: msgAgg[0]?.tokens ?? 0,
      },
      daily: daily.map((d) => ({ day: d._id, messages: d.messages, activeUsers: d.activeUsers })),
      models: topModels.map((m) => ({ model: m._id, count: m.count })),
      feedback: { up: feedback.find((f) => f._id === "up")?.count ?? 0, down: feedback.find((f) => f._id === "down")?.count ?? 0 },
    });
  }),
);

/** GET /api/admin/users — paginated user list with per-user chat counts. */
router.get(
  "/users",
  validate({
    query: z.object({
      q: z.string().max(100).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { q, limit, offset } = req.query as unknown as { q?: string; limit: number; offset: number };
    const filter = q ? { $or: [{ email: { $regex: q, $options: "i" } }, { name: { $regex: q, $options: "i" } }, { clerkId: q }] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    const ids = users.map((u) => u.clerkId);
    const counts = await Chat.aggregate<{ _id: string; chats: number; messages: number }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", chats: { $sum: 1 }, messages: { $sum: "$messageCount" } } },
    ]);
    const byUser = new Map(counts.map((c) => [c._id, c]));
    res.json({
      items: users.map((u) => ({
        id: u.clerkId,
        email: u.email,
        name: u.name,
        imageUrl: u.imageUrl,
        role: u.role,
        dailyQuota: u.dailyQuota,
        usage: u.usage,
        chats: byUser.get(u.clerkId)?.chats ?? 0,
        messages: byUser.get(u.clerkId)?.messages ?? 0,
        lastSeenAt: u.lastSeenAt,
        createdAt: u.createdAt,
      })),
      total,
      limit,
      offset,
    });
  }),
);

/** PATCH /api/admin/users/:id — change role or daily quota. */
router.patch(
  "/users/:id",
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ role: z.enum(["user", "admin"]).optional(), dailyQuota: z.number().int().min(0).nullable().optional() }).strict(),
  }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.userId && (req.body as { role?: string }).role === "user") {
      throw badRequest("You cannot remove your own admin role");
    }
    const user = await User.findOneAndUpdate({ clerkId: req.params.id }, { $set: req.body as Record<string, unknown> }, { new: true }).lean();
    if (!user) throw notFound("User not found");
    invalidateUserCache(req.params.id!);
    res.json({ id: user.clerkId, role: user.role, dailyQuota: user.dailyQuota });
  }),
);

/** DELETE /api/admin/users/:id — remove a user and all their data. */
router.delete(
  "/users/:id",
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.userId) throw badRequest("Use account settings to delete your own account");
    const result = await User.deleteOne({ clerkId: req.params.id });
    if (!result.deletedCount) throw notFound("User not found");
    await Promise.all([Chat.deleteMany({ userId: req.params.id }), KnowledgeDocument.deleteMany({ userId: req.params.id })]);
    invalidateUserCache(req.params.id!);
    res.status(204).end();
  }),
);

export default router;
