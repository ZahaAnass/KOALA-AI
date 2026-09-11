import mongoose, { type InferSchemaType, type Model } from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    mimeType: { type: String, default: "image/png" },
    url: { type: String, default: "" },
  },
  { _id: false },
);

const SourceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    uri: { type: String, default: "" },
  },
  { _id: false },
);

const ToolCallSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

export const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    text: { type: String, default: "", maxlength: 200_000 },
    images: { type: [ImageSchema], default: [] },
    sources: { type: [SourceSchema], default: [] },
    toolCalls: { type: [ToolCallSchema], default: [] },
    model: { type: String, default: "" },
    feedback: { type: String, enum: ["up", "down", null], default: null },
    feedbackNote: { type: String, default: "", maxlength: 2000 },
    usage: {
      promptTokens: { type: Number, default: 0 },
      candidateTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    edited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ChatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    model: { type: String, default: "" },
    systemInstruction: { type: String, default: "", maxlength: 4000 },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    folder: { type: String, default: "" },
    shareToken: { type: String, default: null, index: true, sparse: true },
    sharedAt: { type: Date, default: null },
    summary: { type: String, default: "" },
    summarizedUpTo: { type: Number, default: 0 },
    messages: { type: [MessageSchema], default: [] },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ChatSchema.index({ userId: 1, pinned: -1, lastMessageAt: -1 });
ChatSchema.index({ userId: 1, archived: 1 });
ChatSchema.index({ title: "text", "messages.text": "text" }, { weights: { title: 10, "messages.text": 1 } });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & { _id: mongoose.Types.ObjectId };
export type ChatDoc = InferSchemaType<typeof ChatSchema> & { _id: mongoose.Types.ObjectId };

export const Chat: Model<ChatDoc> =
  (mongoose.models.Chat as Model<ChatDoc>) || mongoose.model<ChatDoc>("Chat", ChatSchema);

/** Fields returned when listing chats in the sidebar (no message bodies). */
export const CHAT_LIST_PROJECTION = {
  title: 1,
  model: 1,
  pinned: 1,
  archived: 1,
  tags: 1,
  folder: 1,
  shareToken: 1,
  messageCount: 1,
  lastMessageAt: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;
