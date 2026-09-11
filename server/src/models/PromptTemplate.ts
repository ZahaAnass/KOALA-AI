import mongoose, { type InferSchemaType, type Model } from "mongoose";

const PromptTemplateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 80 },
    content: { type: String, required: true, maxlength: 8000 },
    category: { type: String, default: "general", maxlength: 40 },
    icon: { type: String, default: "✨", maxlength: 8 },
  },
  { timestamps: true },
);

export type PromptTemplateDoc = InferSchemaType<typeof PromptTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PromptTemplate: Model<PromptTemplateDoc> =
  (mongoose.models.PromptTemplate as Model<PromptTemplateDoc>) ||
  mongoose.model<PromptTemplateDoc>("PromptTemplate", PromptTemplateSchema);

export const DEFAULT_TEMPLATES = [
  {
    title: "Explain this code",
    icon: "🧑‍💻",
    category: "coding",
    content: "Explain what the following code does, step by step, and point out any bugs or improvements:\n\n```\n\n```",
  },
  {
    title: "Summarize text",
    icon: "📝",
    category: "writing",
    content: "Summarize the following text in 5 bullet points, then give a one-sentence takeaway:\n\n",
  },
  {
    title: "Improve my writing",
    icon: "✍️",
    category: "writing",
    content: "Rewrite the following text to be clearer and more concise while keeping the original meaning and tone:\n\n",
  },
  {
    title: "Brainstorm ideas",
    icon: "💡",
    category: "creative",
    content: "Give me 10 creative ideas for: ",
  },
  {
    title: "Write unit tests",
    icon: "🧪",
    category: "coding",
    content: "Write thorough unit tests for the following code. Cover edge cases and explain each test briefly:\n\n```\n\n```",
  },
  {
    title: "Translate to French",
    icon: "🇫🇷",
    category: "language",
    content: "Translate the following text into natural, fluent French:\n\n",
  },
] as const;
