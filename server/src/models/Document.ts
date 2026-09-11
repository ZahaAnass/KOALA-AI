import mongoose, { type InferSchemaType, type Model } from "mongoose";

const ChunkSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { _id: false },
);

const DocumentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    mimeType: { type: String, default: "text/plain" },
    size: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    chunks: { type: [ChunkSchema], default: [] },
    status: { type: String, enum: ["ready", "failed"], default: "ready" },
  },
  { timestamps: true },
);

export type DocumentDoc = InferSchemaType<typeof DocumentSchema> & { _id: mongoose.Types.ObjectId };

export const KnowledgeDocument: Model<DocumentDoc> =
  (mongoose.models.KnowledgeDocument as Model<DocumentDoc>) ||
  mongoose.model<DocumentDoc>("KnowledgeDocument", DocumentSchema);
