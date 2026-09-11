import { clerkClient } from "@clerk/express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { Chat } from "../models/Chat.js";
import { KnowledgeDocument } from "../models/Document.js";
import { PromptTemplate } from "../models/PromptTemplate.js";
import { User } from "../models/User.js";

/**
 * Removes every piece of data owned by a user.
 * When `removeFromClerk` is set the Clerk account is deleted first, so a failure there
 * leaves the local account intact instead of letting the session recreate an empty one.
 */
export async function deleteUserData(clerkId: string, { removeFromClerk = false } = {}): Promise<void> {
  if (removeFromClerk && env.CLERK_SECRET_KEY) {
    try {
      await clerkClient.users.deleteUser(clerkId);
    } catch (err) {
      // A user that no longer exists in Clerk is already deleted there; anything else aborts.
      const status = (err as { status?: number }).status;
      if (status !== 404) {
        logger.warn({ err, clerkId }, "Clerk user deletion failed");
        throw err;
      }
    }
  }
  await Promise.all([
    Chat.deleteMany({ userId: clerkId }),
    KnowledgeDocument.deleteMany({ userId: clerkId }),
    PromptTemplate.deleteMany({ userId: clerkId }),
    User.deleteOne({ clerkId }),
  ]);
  invalidateUserCache(clerkId);
}

/** Escapes a user-supplied string for use inside a MongoDB `$regex`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
