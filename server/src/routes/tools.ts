import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchUrlText } from "../services/urlFetch.js";
import { evaluateExpression } from "../services/tools.js";
import { badRequest } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

/** POST /api/tools/url — fetch a web page and return its readable text for summarization. */
router.post(
  "/url",
  validate({ body: z.object({ url: z.string().url().max(2000) }) }),
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url: string };
    res.json(await fetchUrlText(url));
  }),
);

/** POST /api/tools/calculate — evaluate a math expression (same engine the model uses). */
router.post(
  "/calculate",
  validate({ body: z.object({ expression: z.string().min(1).max(500) }) }),
  asyncHandler(async (req, res) => {
    const { expression } = req.body as { expression: string };
    try {
      res.json({ expression, result: evaluateExpression(expression) });
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : "Invalid expression");
    }
  }),
);

export default router;
