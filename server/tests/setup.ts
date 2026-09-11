import { afterAll, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/koala-test";
process.env.CLIENT_URL = "http://localhost:5173";
delete process.env.CLERK_SECRET_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.IMAGE_KIT_PRIVATE_KEY;

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("koala-test"));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  const { clearUserCache } = await import("../src/middleware/auth.js");
  clearUserCache();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
