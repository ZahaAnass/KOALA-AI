import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";

export const app = createApp();

export const USER = "user_test_alice";
export const OTHER = "user_test_bob";
export const ADMIN = "user_test_admin";

export const as = (userId: string) => ({ "x-test-user-id": userId });

export async function makeAdmin(clerkId = ADMIN): Promise<void> {
  await User.updateOne({ clerkId }, { $set: { role: "admin", email: "admin@test.dev" }, $setOnInsert: { clerkId } }, { upsert: true });
}

export { request };
