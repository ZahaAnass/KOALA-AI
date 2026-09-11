import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { idParam, validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/errors.js";
import { KnowledgeDocument } from "../models/Document.js";
import { MAX_DOC_BYTES, ingestDocument, retrieveContext } from "../services/documents.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
});

const DOC_PROJECTION = { name: 1, mimeType: 1, size: 1, chunkCount: 1, status: 1, createdAt: 1 };

/** GET /api/documents — list the user's knowledge documents. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await KnowledgeDocument.find({ userId: req.userId }, DOC_PROJECTION).sort({ createdAt: -1 }).lean();
    res.json({ items: docs });
  }),
);

/** POST /api/documents — upload a PDF/TXT/MD/CSV/JSON file (multipart field "file"). */
router.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return next(badRequest("Document exceeds the 10 MB limit"));
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("A file is required (multipart field 'file')");
    const count = await KnowledgeDocument.countDocuments({ userId: req.userId });
    if (count >= 50) throw badRequest("Document limit reached (50). Delete some documents first.");
    const doc = await ingestDocument(req.userId!, req.file);
    res.status(201).json(doc);
  }),
);

/** POST /api/documents/search — debug/preview retrieval. */
router.post(
  "/search",
  validate({ body: z.object({ query: z.string().min(1).max(2000), topK: z.number().int().min(1).max(20).default(6) }) }),
  asyncHandler(async (req, res) => {
    const { query, topK } = req.body as { query: string; topK: number };
    res.json({ results: await retrieveContext(req.userId!, query, { topK }) });
  }),
);

/** DELETE /api/documents/:id */
router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await KnowledgeDocument.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!result.deletedCount) throw notFound("Document not found");
    res.status(204).end();
  }),
);

export default router;
