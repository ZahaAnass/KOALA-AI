import { Router, raw } from "express";
import { Webhook } from "svix";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { User } from "../models/User.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { deleteUserData } from "../services/users.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { unauthorized, serviceUnavailable } from "../utils/errors.js";

const router = Router();

interface ClerkUserPayload {
  id: string;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
}

interface ClerkEvent {
  type: string;
  data: ClerkUserPayload;
}

/**
 * POST /api/webhooks/clerk — keeps the local User collection in sync with Clerk.
 * Requires CLERK_WEBHOOK_SECRET (svix signature verification).
 */
router.post(
  "/clerk",
  raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    if (!env.CLERK_WEBHOOK_SECRET) throw serviceUnavailable("Webhook secret not configured");
    const headers = {
      "svix-id": req.header("svix-id") ?? "",
      "svix-timestamp": req.header("svix-timestamp") ?? "",
      "svix-signature": req.header("svix-signature") ?? "",
    };
    let event: ClerkEvent;
    try {
      const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
      event = new Webhook(env.CLERK_WEBHOOK_SECRET).verify(payload, headers) as ClerkEvent;
    } catch {
      throw unauthorized("Invalid webhook signature");
    }

    const d = event.data;
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = (d.email_addresses?.find((e) => e.id === d.primary_email_address_id)?.email_address ?? d.email_addresses?.[0]?.email_address ?? "").toLowerCase();
      const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.username || "";
      const $set: Record<string, unknown> = { email, name, imageUrl: d.image_url ?? "" };
      if (env.ADMIN_EMAILS.includes(email)) $set.role = "admin";
      await User.updateOne({ clerkId: d.id }, { $set, $setOnInsert: { clerkId: d.id } }, { upsert: true });
      invalidateUserCache(d.id);
    } else if (event.type === "user.deleted" && d.id) {
      await deleteUserData(d.id);
    }
    logger.info({ type: event.type, userId: d.id }, "Clerk webhook processed");
    res.json({ received: true });
  }),
);

export default router;
