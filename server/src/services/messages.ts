import mongoose from "mongoose";
import type { PlainMessage } from "../models/Chat.js";

type MessageInput = Partial<Omit<PlainMessage, "_id" | "role" | "text">> & { role: PlainMessage["role"]; text: string };

/** Builds a complete message object with sane defaults, ready to be pushed into a chat. */
export function makeMessage({ role, text, ...extra }: MessageInput): PlainMessage {
  return {
    _id: new mongoose.Types.ObjectId(),
    role,
    text,
    images: [],
    sources: [],
    toolCalls: [],
    model: "",
    feedback: null,
    feedbackNote: "",
    usage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
    edited: false,
    createdAt: new Date(),
    ...extra,
  };
}

/** Serializes a message for JSON responses (ObjectId to string). */
export function serializeMessage(message: PlainMessage): Omit<PlainMessage, "_id"> & { _id: string } {
  return { ...message, _id: String(message._id) };
}
