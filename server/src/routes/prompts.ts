import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { idParam, validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DEFAULT_TEMPLATES, PromptTemplate } from "../models/PromptTemplate.js";
import { notFound } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

const bodySchema = z.object({
  title: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(8000),
  category: z.string().trim().max(40).default("general"),
  icon: z.string().max(8).default("✨"),
});

/** GET /api/prompts — built-in templates plus the user's own. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const mine = await PromptTemplate.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    res.json({
      builtin: DEFAULT_TEMPLATES.map((t, i) => ({ _id: `builtin-${i}`, ...t, builtin: true })),
      items: mine.map((t) => ({ ...t, builtin: false })),
    });
  }),
);

router.post(
  "/",
  validate({ body: bodySchema }),
  asyncHandler(async (req, res) => {
    const count = await PromptTemplate.countDocuments({ userId: req.userId });
    if (count >= 100) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Template limit reached (100)" } });
      return;
    }
    const doc = await PromptTemplate.create({ userId: req.userId, ...(req.body as z.infer<typeof bodySchema>) });
    res.status(201).json(doc);
  }),
);

router.put(
  "/:id",
  validate({ params: idParam, body: bodySchema }),
  asyncHandler(async (req, res) => {
    const doc = await PromptTemplate.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: req.body as Record<string, unknown> }, { new: true, runValidators: true }).lean();
    if (!doc) throw notFound("Template not found");
    res.json(doc);
  }),
);

router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await PromptTemplate.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!result.deletedCount) throw notFound("Template not found");
    res.status(204).end();
  }),
);

export default router;
