import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { invalidateUserCache } from "./auth.js";
import { tooMany } from "../utils/errors.js";

export const todayKey = (): string => new Date().toISOString().slice(0, 10);

export function quotaFor(user: { role: string; dailyQuota?: number | null }): number {
  if (user.role === "admin") return Number.POSITIVE_INFINITY;
  return user.dailyQuota ?? env.DAILY_MESSAGE_QUOTA;
}

/** Enforces a per-user daily message quota. Must run after `requireAuth`. */
export async function enforceQuota(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) return next();
    const limit = quotaFor(user);
    if (limit === Number.POSITIVE_INFINITY || limit === 0 && user.role === "admin") return next();

    const day = todayKey();
    const used = user.usage?.day === day ? (user.usage?.count ?? 0) : 0;
    if (used >= limit) {
      throw tooMany(`Daily limit of ${limit} messages reached. Try again tomorrow.`);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Records one message (and optional token usage) against the user's daily counter. */
export async function recordUsage(clerkId: string, tokens = 0): Promise<void> {
  const day = todayKey();
  const user = await User.findOne({ clerkId }, { "usage.day": 1 });
  if (!user) return;
  if (user.usage?.day === day) {
    await User.updateOne(
      { clerkId },
      { $inc: { "usage.count": 1, "usage.totalMessages": 1, "usage.totalTokens": tokens }, $set: { lastSeenAt: new Date() } },
    );
  } else {
    await User.updateOne(
      { clerkId },
      {
        $set: { "usage.day": day, "usage.count": 1, lastSeenAt: new Date() },
        $inc: { "usage.totalMessages": 1, "usage.totalTokens": tokens },
      },
    );
  }
  invalidateUserCache(clerkId);
}
