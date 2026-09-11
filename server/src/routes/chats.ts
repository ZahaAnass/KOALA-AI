import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { CHAT_LIST_PROJECTION, Chat } from "../models/Chat.js";
import { requireAuth } from "../middleware/auth.js";
import { enforceQuota } from "../middleware/quota.js";
import { idParam, objectId, validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/errors.js";
import { fallbackTitle } from "../services/ai.js";
import { assertHistoryLimit, buildUserMessage, streamAnswer } from "../services/chatStream.js";
import { chatToJson, chatToMarkdown, chatToPdf } from "../services/export.js";

const router = Router();
router.use(requireAuth);

const imageSchema = z.object({ filePath: z.string().min(1).max(500), mimeType: z.string().max(100).optional() });
const optionsSchema = z
  .object({
    model: z.string().max(80).optional(),
    webSearch: z.boolean().optional(),
    tools: z.boolean().optional(),
    useDocuments: z.boolean().optional(),
    documentIds: z.array(objectId).max(20).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().min(64).max(65536).optional(),
  })
  .default({});

const messageBody = z.object({
  text: z.string().max(50_000).default(""),
  images: z.array(imageSchema).max(4).default([]),
  options: optionsSchema,
});

const listQuery = z.object({
  q: z.string().max(200).optional(),
  archived: z.enum(["true", "false"]).optional(),
  pinned: z.enum(["true", "false"]).optional(),
  tag: z.string().max(40).optional(),
  folder: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const chatIdAndMsg = z.object({ id: objectId, messageId: objectId });

/** GET /api/chats — list (sidebar), search and filter. */
router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const filter: Record<string, unknown> = { userId: req.userId, archived: q.archived === "true" };
    if (q.pinned) filter.pinned = q.pinned === "true";
    if (q.tag) filter.tags = q.tag;
    if (q.folder) filter.folder = q.folder;
    if (q.q) filter.$text = { $search: q.q };

    const projection = q.q ? { ...CHAT_LIST_PROJECTION, score: { $meta: "textScore" } } : CHAT_LIST_PROJECTION;
    const sort: Record<string, 1 | -1 | { $meta: string }> = q.q ? { score: { $meta: "textScore" } } : { pinned: -1, lastMessageAt: -1 };

    const [items, total] = await Promise.all([
      Chat.find(filter, projection).sort(sort).skip(q.offset).limit(q.limit).lean(),
      Chat.countDocuments(filter),
    ]);

    // Return a short snippet for search results.
    let snippets: Record<string, string> = {};
    if (q.q && items.length) {
      const ids = items.map((i) => i._id);
      const docs = await Chat.find({ _id: { $in: ids } }, { "messages.text": 1 }).lean();
      const needle = q.q.toLowerCase();
      snippets = Object.fromEntries(
        docs.map((d) => {
          const hit = d.messages.find((m) => m.text.toLowerCase().includes(needle));
          if (!hit) return [String(d._id), ""];
          const idx = hit.text.toLowerCase().indexOf(needle);
          return [String(d._id), hit.text.slice(Math.max(0, idx - 60), idx + 100).replace(/\s+/g, " ")];
        }),
      );
    }

    res.json({
      items: items.map((i) => ({ ...i, snippet: snippets[String(i._id)] ?? "" })),
      total,
      limit: q.limit,
      offset: q.offset,
    });
  }),
);

/** GET /api/chats/meta — distinct tags and folders for the sidebar. */
router.get(
  "/meta",
  asyncHandler(async (req, res) => {
    const [tags, folders] = await Promise.all([
      Chat.distinct("tags", { userId: req.userId }),
      Chat.distinct("folder", { userId: req.userId, folder: { $ne: "" } }),
    ]);
    res.json({ tags: tags.sort(), folders: folders.sort() });
  }),
);

/** POST /api/chats — create a chat from a first message and stream the answer. */
router.post(
  "/",
  enforceQuota,
  validate({ body: messageBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof messageBody>;
    const userMessage = buildUserMessage(body.text, body.images);
    const chat = await Chat.create({
      userId: req.userId,
      title: fallbackTitle(body.text || "Image"),
      model: body.options.model ?? req.user!.settings.model,
      messages: [userMessage],
      messageCount: 1,
    });
    await streamAnswer(req, res, { chat, user: req.user!, userMessageIndex: 0, options: body.options, generateTitle: true });
  }),
);

/** POST /api/chats/bulk-delete — delete several chats. */
router.post(
  "/bulk-delete",
  validate({ body: z.object({ ids: z.array(objectId).min(1).max(500) }) }),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    const result = await Chat.deleteMany({ _id: { $in: ids }, userId: req.userId });
    res.json({ deleted: result.deletedCount });
  }),
);

/** DELETE /api/chats — clear all history. */
router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const result = await Chat.deleteMany({ userId: req.userId });
    res.json({ deleted: result.deletedCount });
  }),
);

/** GET /api/chats/:id — full chat with paginated messages (newest page by default). */
router.get(
  "/:id",
  validate({
    params: idParam,
    query: z.object({
      limit: z.coerce.number().int().min(1).max(500).default(60),
      before: z.coerce.number().int().min(0).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { limit, before } = req.query as unknown as { limit: number; before?: number };
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!chat) throw notFound("Chat not found");
    const total = chat.messages.length;
    const end = before === undefined ? total : Math.min(before, total);
    const start = Math.max(0, end - limit);
    const { messages, ...rest } = chat;
    res.json({
      ...rest,
      messages: messages.slice(start, end),
      page: { start, end, total, hasMore: start > 0 },
    });
  }),
);

/** PATCH /api/chats/:id — rename, pin, archive, tags, folder, per-chat settings. */
router.patch(
  "/:id",
  validate({
    params: idParam,
    body: z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        folder: z.string().trim().max(60).optional(),
        model: z.string().max(80).optional(),
        systemInstruction: z.string().max(4000).optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body as Record<string, unknown> },
      { new: true, runValidators: true, projection: CHAT_LIST_PROJECTION },
    ).lean();
    if (!chat) throw notFound("Chat not found");
    res.json(chat);
  }),
);

/** DELETE /api/chats/:id */
router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await Chat.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!result.deletedCount) throw notFound("Chat not found");
    res.status(204).end();
  }),
);

/** POST /api/chats/:id/messages — send a message and stream the answer. */
router.post(
  "/:id/messages",
  enforceQuota,
  validate({ params: idParam, body: messageBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof messageBody>;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) throw notFound("Chat not found");
    assertHistoryLimit(chat);
    const userMessage = buildUserMessage(body.text, body.images);
    chat.messages.push(userMessage);
    chat.messageCount = chat.messages.length;
    chat.lastMessageAt = new Date();
    await chat.save();
    await streamAnswer(req, res, {
      chat,
      user: req.user!,
      userMessageIndex: chat.messages.length - 1,
      options: body.options,
      generateTitle: chat.messages.length === 1,
    });
  }),
);

/** POST /api/chats/:id/messages/:messageId/regenerate — regenerate a model answer. */
router.post(
  "/:id/messages/:messageId/regenerate",
  enforceQuota,
  validate({ params: chatIdAndMsg, body: z.object({ options: optionsSchema }).default({ options: {} }) }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) throw notFound("Chat not found");
    const idx = chat.messages.findIndex((m) => String(m._id) === req.params.messageId);
    if (idx < 0) throw notFound("Message not found");
    // Regenerate answers the closest preceding user message.
    let userIdx = idx;
    while (userIdx >= 0 && chat.messages[userIdx]!.role !== "user") userIdx--;
    if (userIdx < 0) throw badRequest("No user message to answer");
    const { options } = req.body as { options: z.infer<typeof optionsSchema> };
    await streamAnswer(req, res, { chat, user: req.user!, userMessageIndex: userIdx, options });
  }),
);

/** PUT /api/chats/:id/messages/:messageId — edit a user message and regenerate from there. */
router.put(
  "/:id/messages/:messageId",
  enforceQuota,
  validate({ params: chatIdAndMsg, body: z.object({ text: z.string().trim().min(1).max(50_000), options: optionsSchema }) }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) throw notFound("Chat not found");
    const idx = chat.messages.findIndex((m) => String(m._id) === req.params.messageId);
    if (idx < 0) throw notFound("Message not found");
    const msg = chat.messages[idx]!;
    if (msg.role !== "user") throw badRequest("Only user messages can be edited");
    const { text, options } = req.body as { text: string; options: z.infer<typeof optionsSchema> };
    msg.text = text;
    msg.edited = true;
    chat.messages.splice(idx + 1);
    chat.messageCount = chat.messages.length;
    await chat.save();
    await streamAnswer(req, res, { chat, user: req.user!, userMessageIndex: idx, options });
  }),
);

/** POST /api/chats/:id/messages/:messageId/feedback — thumbs up/down. */
router.post(
  "/:id/messages/:messageId/feedback",
  validate({ params: chatIdAndMsg, body: z.object({ feedback: z.enum(["up", "down"]).nullable(), note: z.string().max(2000).optional() }) }),
  asyncHandler(async (req, res) => {
    const { feedback, note } = req.body as { feedback: "up" | "down" | null; note?: string };
    const result = await Chat.updateOne(
      { _id: req.params.id, userId: req.userId, "messages._id": req.params.messageId },
      { $set: { "messages.$.feedback": feedback, "messages.$.feedbackNote": note ?? "" } },
    );
    if (!result.matchedCount) throw notFound("Message not found");
    res.json({ ok: true });
  }),
);

/** GET /api/chats/:id/export?format=md|json|pdf */
router.get(
  "/:id/export",
  validate({ params: idParam, query: z.object({ format: z.enum(["md", "json", "pdf"]).default("md") }) }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!chat) throw notFound("Chat not found");
    const { format } = req.query as unknown as { format: "md" | "json" | "pdf" };
    const safeName = chat.title.replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 60) || "chat";
    if (format === "json") {
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.json"`);
      res.json(chatToJson(chat));
      return;
    }
    if (format === "pdf") {
      const pdf = await chatToPdf(chat);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
      res.send(pdf);
      return;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.md"`);
    res.send(chatToMarkdown(chat));
  }),
);

/** POST /api/chats/:id/share — create (or return) a public read-only link. */
router.post(
  "/:id/share",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) throw notFound("Chat not found");
    if (!chat.shareToken) {
      chat.shareToken = nanoid(16);
      chat.sharedAt = new Date();
      await chat.save();
    }
    res.json({ shareToken: chat.shareToken, sharedAt: chat.sharedAt });
  }),
);

/** DELETE /api/chats/:id/share — revoke the public link. */
router.delete(
  "/:id/share",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await Chat.updateOne({ _id: req.params.id, userId: req.userId }, { $set: { shareToken: null, sharedAt: null } });
    if (!result.matchedCount) throw notFound("Chat not found");
    res.status(204).end();
  }),
);

export default router;
