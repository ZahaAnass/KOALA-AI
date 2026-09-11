import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const SAFETY_LEVELS = ["off", "low", "medium", "high"] as const;
export type SafetyLevel = (typeof SAFETY_LEVELS)[number];

const SettingsSchema = new mongoose.Schema(
  {
    model: { type: String, default: "gemini-2.5-flash" },
    systemInstruction: { type: String, default: "", maxlength: 4000 },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxOutputTokens: { type: Number, default: 4096, min: 64, max: 65536 },
    theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
    locale: { type: String, enum: ["en", "fr"], default: "en" },
    safetyLevel: { type: String, enum: SAFETY_LEVELS, default: "medium" },
    followUps: { type: Boolean, default: true },
    webSearch: { type: Boolean, default: false },
    tools: { type: Boolean, default: true },
    useDocuments: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: "", index: true },
    name: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    dailyQuota: { type: Number, default: null },
    usage: {
      day: { type: String, default: "" },
      count: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    settings: { type: SettingsSchema, default: () => ({}) },
    onboarded: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
export type UserSettings = InferSchemaType<typeof SettingsSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);
