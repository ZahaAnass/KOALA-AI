import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Chat } from "../src/models/Chat.js";
import { OTHER, USER, app, as, request } from "./helpers.js";

async function seedChat(userId = USER, overrides: Record<string, unknown> = {}) {
  return Chat.create({
    userId,
    title: "Seeded chat",
    messages: [
      { _id: new mongoose.Types.ObjectId(), role: "user", text: "Hello koala", createdAt: new Date() },
      { _id: new mongoose.Types.ObjectId(), role: "model", text: "Hi! How can I help?", model: "gemini-2.5-flash", createdAt: new Date() },
    ],
    messageCount: 2,
    ...overrides,
  });
}

describe("auth guard", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/chats");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("ignores bearer tokens when Clerk is not configured (nothing is decoded by hand)", async () => {
    const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"user_victim"}').toString("base64url")}.sig`;
    const res = await request(app).get("/api/chats").set("Authorization", `Bearer ${unsigned}`);
    expect(res.status).toBe(401);
  });
});

describe("chats", () => {
  it("lists only the caller's chats, pinned first", async () => {
    await seedChat(USER, { title: "A", lastMessageAt: new Date(Date.now() - 1000) });
    await seedChat(USER, { title: "B", pinned: true, lastMessageAt: new Date(Date.now() - 5000) });
    await seedChat(OTHER, { title: "Not mine" });

    const res = await request(app).get("/api/chats").set(as(USER));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((c: { title: string }) => c.title)).toEqual(["B", "A"]);
    expect(res.body.items[0].messages).toBeUndefined();
  });

  it("filters archived chats out by default and in on request", async () => {
    await seedChat(USER, { title: "Live" });
    await seedChat(USER, { title: "Old", archived: true });
    const live = await request(app).get("/api/chats").set(as(USER));
    expect(live.body.items.map((c: { title: string }) => c.title)).toEqual(["Live"]);
    const archived = await request(app).get("/api/chats?archived=true").set(as(USER));
    expect(archived.body.items.map((c: { title: string }) => c.title)).toEqual(["Old"]);
  });

  it("supports full-text search with a snippet", async () => {
    await seedChat(USER, { title: "Cooking", messages: [{ role: "user", text: "How do I make a perfect risotto?" }] });
    await seedChat(USER, { title: "Coding", messages: [{ role: "user", text: "Explain closures in JavaScript" }] });
    const res = await request(app).get("/api/chats?q=risotto").set(as(USER));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Cooking");
    expect(res.body.items[0].snippet).toContain("risotto");
  });

  it("returns a chat with pagination and forbids access to others' chats", async () => {
    const chat = await seedChat(USER);
    const mine = await request(app).get(`/api/chats/${chat._id}?limit=1`).set(as(USER));
    expect(mine.status).toBe(200);
    expect(mine.body.messages).toHaveLength(1);
    expect(mine.body.messages[0].role).toBe("model");
    expect(mine.body.page).toEqual({ start: 1, end: 2, total: 2, hasMore: true });

    const theirs = await request(app).get(`/api/chats/${chat._id}`).set(as(OTHER));
    expect(theirs.status).toBe(404);
  });

  it("validates ids", async () => {
    const res = await request(app).get("/api/chats/not-an-id").set(as(USER));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("renames, pins, tags and archives a chat", async () => {
    const chat = await seedChat(USER);
    const res = await request(app)
      .patch(`/api/chats/${chat._id}`)
      .set(as(USER))
      .send({ title: "Renamed", pinned: true, tags: ["work", "ai"], folder: "Projects", archived: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Renamed", pinned: true, tags: ["work", "ai"], folder: "Projects", archived: true });

    const bad = await request(app).patch(`/api/chats/${chat._id}`).set(as(USER)).send({ userId: "hijack" });
    expect(bad.status).toBe(400);
  });

  it("deletes a single chat, bulk deletes and clears all", async () => {
    const a = await seedChat(USER);
    const b = await seedChat(USER);
    const c = await seedChat(USER);
    const other = await seedChat(OTHER);

    expect((await request(app).delete(`/api/chats/${a._id}`).set(as(USER))).status).toBe(204);
    expect((await request(app).delete(`/api/chats/${a._id}`).set(as(USER))).status).toBe(404);

    const bulk = await request(app).post("/api/chats/bulk-delete").set(as(USER)).send({ ids: [b._id, other._id] });
    expect(bulk.body.deleted).toBe(1);
    expect(await Chat.countDocuments({ _id: other._id })).toBe(1);

    const all = await request(app).delete("/api/chats").set(as(USER));
    expect(all.body.deleted).toBe(1);
    expect(await Chat.countDocuments({ _id: c._id })).toBe(0);
  });

  it("records feedback on a message", async () => {
    const chat = await seedChat(USER);
    const msgId = String(chat.messages[1]!._id);
    const res = await request(app).post(`/api/chats/${chat._id}/messages/${msgId}/feedback`).set(as(USER)).send({ feedback: "down", note: "Too short" });
    expect(res.status).toBe(200);
    const saved = await Chat.findById(chat._id);
    expect(saved!.messages[1]!.feedback).toBe("down");
    expect(saved!.messages[1]!.feedbackNote).toBe("Too short");
  });

  it("exports markdown, json and pdf", async () => {
    const chat = await seedChat(USER);
    const md = await request(app).get(`/api/chats/${chat._id}/export?format=md`).set(as(USER));
    expect(md.status).toBe(200);
    expect(md.headers["content-type"]).toContain("text/markdown");
    expect(md.text).toContain("# Seeded chat");
    expect(md.text).toContain("Hello koala");

    const json = await request(app).get(`/api/chats/${chat._id}/export?format=json`).set(as(USER));
    expect(json.body.messages).toHaveLength(2);

    const pdf = await request(app).get(`/api/chats/${chat._id}/export?format=pdf`).set(as(USER)).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("shares and revokes a public link", async () => {
    const chat = await seedChat(USER);
    const share = await request(app).post(`/api/chats/${chat._id}/share`).set(as(USER));
    expect(share.status).toBe(200);
    const token = share.body.shareToken as string;
    expect(token).toHaveLength(16);

    const pub = await request(app).get(`/api/share/${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.title).toBe("Seeded chat");
    expect(pub.body.messages).toHaveLength(2);
    expect(pub.body.userId).toBeUndefined();

    expect((await request(app).delete(`/api/chats/${chat._id}/share`).set(as(USER))).status).toBe(204);
    expect((await request(app).get(`/api/share/${token}`)).status).toBe(404);
  });

  it("rejects messages without text or image and refuses when no provider is configured", async () => {
    const empty = await request(app).post("/api/chats").set(as(USER)).send({ text: "   " });
    expect(empty.status).toBe(400);

    const res = await request(app).post("/api/chats").set(as(USER)).send({ text: "hi" });
    // Stream opens, then reports the provider error as an SSE error event.
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("event: error");
    expect(res.text).toContain("No AI provider is configured");
  });
});
