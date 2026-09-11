import mongoose from "mongoose";
import { logger } from "./logger.js";

export async function connectDB(uri: string): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info({ host: conn.connection.host }, "MongoDB connected");
  return conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export function dbReady(): boolean {
  return mongoose.connection.readyState === 1;
}
