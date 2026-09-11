import type { NextFunction, Request, Response } from "express";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import { env, isTest } from "../config/env.js";
import { User, type UserDoc } from "../models/User.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { logger } from "../config/logger.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      user?: UserDoc;
    }
  }
}

/** Global Clerk middleware: verifies the session JWT signature when a token is present. */
export const clerk = env.CLERK_SECRET_KEY
  ? clerkMiddleware({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY })
  : (_req: Request, _res: Response, next: NextFunction) => next();

const userCache = new Map<string, { user: UserDoc; expires: number }>();
const CACHE_TTL_MS = 30_000;

export function invalidateUserCache(clerkId: string): void {
  userCache.delete(clerkId);
}

export function clearUserCache(): void {
  userCache.clear();
}

async function fetchClerkProfile(clerkId: string): Promise<{ email: string; name: string; imageUrl: string }> {
  if (!env.CLERK_SECRET_KEY) return { email: "", name: "", imageUrl: "" };
  try {
    const u = await clerkClient.users.getUser(clerkId);
    const email =
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      "";
    return {
      email: email.toLowerCase(),
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
      imageUrl: u.imageUrl ?? "",
    };
  } catch (err) {
    logger.warn({ err, clerkId }, "Could not fetch Clerk profile");
    return { email: "", name: "", imageUrl: "" };
  }
}

/** Finds or creates the local User document for a Clerk user id. */
export async function ensureUser(clerkId: string): Promise<UserDoc> {
  const cached = userCache.get(clerkId);
  if (cached && cached.expires > Date.now()) return cached.user;

  let user = await User.findOne({ clerkId });
  if (!user) {
    const profile = await fetchClerkProfile(clerkId);
    const role = env.ADMIN_EMAILS.includes(profile.email) ? "admin" : "user";
    user = await User.findOneAndUpdate(
      { clerkId },
      { $setOnInsert: { clerkId, ...profile, role } },
      { upsert: true, new: true },
    );
  } else if (user.role !== "admin" && user.email && env.ADMIN_EMAILS.includes(user.email)) {
    user.role = "admin";
    await user.save();
  }

  if (!user) throw unauthorized();
  userCache.set(clerkId, { user, expires: Date.now() + CACHE_TTL_MS });
  return user;
}

/** Resolves the caller's Clerk id. In tests, `x-test-user-id` is accepted instead of a JWT. */
function resolveClerkId(req: Request): string | null {
  if (isTest) {
    const testId = req.header("x-test-user-id");
    if (testId) return testId;
  }
  if (!env.CLERK_SECRET_KEY) return null;
  const auth = getAuth(req);
  return auth.userId ?? null;
}

/** Requires a verified Clerk session and attaches `req.userId` and `req.user`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const clerkId = resolveClerkId(req);
    if (!clerkId) throw unauthorized();
    req.userId = clerkId;
    req.user = await ensureUser(clerkId);
    next();
  } catch (err) {
    next(err);
  }
}

/** Requires an admin role. Must run after `requireAuth`. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") return next(forbidden("Admin access required"));
  next();
}
