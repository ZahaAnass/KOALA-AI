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

/**
 * Reserves one message from the caller's daily quota in a single atomic update,
 * so parallel requests cannot exceed the limit. Must run after `requireAuth`.
 */
export async function enforceQuota(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) return next();
    const limit = quotaFor(user);
    if (limit <= 0) throw tooMany("Messaging is disabled for this account.");
    const day = todayKey();

    const filter =
      limit === Number.POSITIVE_INFINITY
        ? { clerkId: user.clerkId }
        : { clerkId: user.clerkId, $or: [{ "usage.day": { $ne: day } }, { "usage.count": { $lt: limit } }] };

    const reserved = await User.findOneAndUpdate(
      filter,
      [
        {
          $set: {
            "usage.count": { $cond: [{ $eq: ["$usage.day", day] }, { $add: [{ $ifNull: ["$usage.count", 0] }, 1] }, 1] },
            "usage.day": day,
            "usage.totalMessages": { $add: [{ $ifNull: ["$usage.totalMessages", 0] }, 1] },
            lastSeenAt: new Date(),
          },
        },
      ],
      { new: true },
    );
    invalidateUserCache(user.clerkId);
    if (!reserved) throw tooMany(`Daily limit of ${limit} messages reached. Try again tomorrow.`);
    next();
  } catch (err) {
    next(err);
  }
}

/** Adds token usage for a completed generation (the message itself was counted by `enforceQuota`). */
export async function recordUsage(clerkId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  await User.updateOne({ clerkId }, { $inc: { "usage.totalTokens": tokens } });
  invalidateUserCache(clerkId);
}
