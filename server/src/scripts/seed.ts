/**
 * Seeds a demo user with a few sample chats and prompt templates so reviewers
 * can explore the UI without sending real model requests.
 *
 * Usage:  npm run seed -- --user <clerkUserId> [--email you@example.com] [--admin]
 */
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Chat } from "../models/Chat.js";
import { User } from "../models/User.js";
import { PromptTemplate } from "../models/PromptTemplate.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const msg = (role: "user" | "model", text: string, minutesAgo: number, model = "") => ({
  _id: new mongoose.Types.ObjectId(),
  role,
  text,
  images: [],
  sources: [],
  toolCalls: [],
  model,
  feedback: null,
  feedbackNote: "",
  usage: { promptTokens: role === "model" ? 120 : 0, candidateTokens: role === "model" ? 240 : 0, totalTokens: role === "model" ? 360 : 0 },
  edited: false,
  createdAt: new Date(Date.now() - minutesAgo * 60_000),
});

async function main() {
  const userId = arg("user") ?? "user_demo_koala";
  const email = arg("email") ?? "demo@koala.ai";
  const admin = process.argv.includes("--admin");

  await connectDB(env.MONGO_URI);

  await User.updateOne(
    { clerkId: userId },
    { $set: { email, name: "Demo Koala", role: admin ? "admin" : "user", onboarded: false }, $setOnInsert: { clerkId: userId } },
    { upsert: true },
  );

  await Chat.deleteMany({ userId, tags: "seed" });
  await Chat.insertMany([
    {
      userId,
      title: "Explain React Server Components",
      model: "gemini-2.5-flash",
      pinned: true,
      tags: ["seed", "react"],
      folder: "Learning",
      messages: [
        msg("user", "Explain React Server Components in simple terms.", 90),
        msg(
          "model",
          "**React Server Components (RSC)** render on the server and send a serialized UI tree to the client.\n\n- They never ship their JavaScript to the browser.\n- They can read databases or files directly.\n- Client Components (`\"use client\"`) still handle interactivity.\n\n```tsx\n// app/page.tsx (server component)\nexport default async function Page() {\n  const posts = await db.post.findMany();\n  return <PostList posts={posts} />;\n}\n```\n\nThink of RSC as *templates that run on the server*, and client components as *widgets that run in the browser*.",
          89,
          "gemini-2.5-flash",
        ),
      ],
      messageCount: 2,
      lastMessageAt: new Date(Date.now() - 89 * 60_000),
    },
    {
      userId,
      title: "Weekly meal plan",
      model: "gemini-2.5-flash",
      tags: ["seed", "life"],
      messages: [
        msg("user", "Give me a simple 3-day vegetarian meal plan.", 60 * 26),
        msg(
          "model",
          "| Day | Breakfast | Lunch | Dinner |\n|---|---|---|---|\n| 1 | Oatmeal with berries | Chickpea salad wrap | Lentil curry with rice |\n| 2 | Greek yogurt & granola | Tomato soup + grilled cheese | Veggie stir-fry with tofu |\n| 3 | Avocado toast | Quinoa bowl | Mushroom risotto |\n\nWant a shopping list for this plan?",
          60 * 26 - 1,
          "gemini-2.5-flash",
        ),
      ],
      messageCount: 2,
      lastMessageAt: new Date(Date.now() - (60 * 26 - 1) * 60_000),
    },
    {
      userId,
      title: "Quadratic formula refresher",
      model: "gemini-2.5-flash",
      tags: ["seed", "math"],
      folder: "Learning",
      messages: [
        msg("user", "What is the quadratic formula?", 60 * 50),
        msg(
          "model",
          "For $ax^2 + bx + c = 0$ the solutions are\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nThe discriminant $\\Delta = b^2 - 4ac$ tells you how many real roots exist: two if $\\Delta > 0$, one if $\\Delta = 0$, none if $\\Delta < 0$.",
          60 * 50 - 1,
          "gemini-2.5-flash",
        ),
      ],
      messageCount: 2,
      lastMessageAt: new Date(Date.now() - (60 * 50 - 1) * 60_000),
    },
  ]);

  await PromptTemplate.deleteMany({ userId, category: "seed" });
  await PromptTemplate.insertMany([
    { userId, title: "Daily standup", icon: "🗓️", category: "seed", content: "Turn these notes into a 3-line standup update (yesterday / today / blockers):\n\n" },
    { userId, title: "Regex helper", icon: "🔍", category: "seed", content: "Write a regular expression that matches: " },
  ]);

   
  console.log(`Seeded demo data for user ${userId} (${email})${admin ? " as admin" : ""}.`);
  await disconnectDB();
}

main().catch((err) => {
   
  console.error(err);
  process.exit(1);
});
