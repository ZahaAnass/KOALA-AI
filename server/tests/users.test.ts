import { describe, expect, it } from "vitest";
import { ADMIN, OTHER, USER, app, as, makeAdmin, request } from "./helpers.js";
import { Chat } from "../src/models/Chat.js";
import { User } from "../src/models/User.js";

describe("users", () => {
  it("creates a local user on first request and exposes quota", async () => {
    const res = await request(app).get("/api/users/me").set(as(USER));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(USER);
    expect(res.body.role).toBe("user");
    expect(res.body.quota.limit).toBe(200);
    expect(res.body.settings.model).toBe("gemini-2.5-flash");
  });

  it("updates settings with validation", async () => {
    const ok = await request(app).patch("/api/users/me/settings").set(as(USER)).send({ theme: "dark", locale: "fr", temperature: 1.2, systemInstruction: "Be brief" });
    expect(ok.status).toBe(200);
    expect(ok.body.settings).toMatchObject({ theme: "dark", locale: "fr", temperature: 1.2, systemInstruction: "Be brief" });

    const bad = await request(app).patch("/api/users/me/settings").set(as(USER)).send({ temperature: 9 });
    expect(bad.status).toBe(400);
    const unknown = await request(app).patch("/api/users/me/settings").set(as(USER)).send({ hacker: true });
    expect(unknown.status).toBe(400);
  });

  it("returns usage analytics series", async () => {
    await Chat.create({ userId: USER, title: "x", messages: [{ role: "user", text: "a" }, { role: "model", text: "b", model: "gemini-2.5-flash", usage: { totalTokens: 50 } }], messageCount: 2 });
    const res = await request(app).get("/api/users/me/usage?days=7").set(as(USER));
    expect(res.status).toBe(200);
    expect(res.body.series).toHaveLength(7);
    const today = res.body.series[6];
    expect(today.user).toBe(1);
    expect(today.model).toBe(1);
    expect(res.body.totals.chats).toBe(1);
    expect(res.body.models[0]).toEqual({ model: "gemini-2.5-flash", count: 1 });
  });

  it("deletes the account and all data", async () => {
    await Chat.create({ userId: USER, title: "x", messages: [], messageCount: 0 });
    await request(app).get("/api/users/me").set(as(USER));
    const res = await request(app).delete("/api/users/me").set(as(USER));
    expect(res.body).toEqual({});
    expect(res.status).toBe(204);
    expect(await Chat.countDocuments({ userId: USER })).toBe(0);
    expect(await User.countDocuments({ clerkId: USER })).toBe(0);
  });
});

describe("admin", () => {
  it("blocks non-admins", async () => {
    const res = await request(app).get("/api/admin/stats").set(as(USER));
    expect(res.status).toBe(403);
  });

  it("returns stats and manages users", async () => {
    await makeAdmin();
    await request(app).get("/api/users/me").set(as(USER));
    await Chat.create({ userId: USER, title: "x", messages: [{ role: "user", text: "a" }, { role: "model", text: "b", model: "gemini-2.5-flash", feedback: "up" }], messageCount: 2 });

    const stats = await request(app).get("/api/admin/stats").set(as(ADMIN));
    expect(stats.status).toBe(200);
    expect(stats.body.totals.users).toBe(2);
    expect(stats.body.totals.messages).toBe(2);
    expect(stats.body.feedback.up).toBe(1);

    const users = await request(app).get("/api/admin/users").set(as(ADMIN));
    expect(users.body.total).toBe(2);
    const alice = users.body.items.find((u: { id: string }) => u.id === USER);
    expect(alice.chats).toBe(1);

    const patched = await request(app).patch(`/api/admin/users/${USER}`).set(as(ADMIN)).send({ dailyQuota: 5, role: "admin" });
    expect(patched.body).toEqual({ id: USER, role: "admin", dailyQuota: 5 });

    const self = await request(app).patch(`/api/admin/users/${ADMIN}`).set(as(ADMIN)).send({ role: "user" });
    expect(self.status).toBe(400);

    expect((await request(app).delete(`/api/admin/users/${OTHER}`).set(as(ADMIN))).status).toBe(404);
    expect((await request(app).delete(`/api/admin/users/${USER}`).set(as(ADMIN))).status).toBe(204);
    expect(await Chat.countDocuments({ userId: USER })).toBe(0);
  });

  it("enforces the daily quota", async () => {
    await User.create({ clerkId: OTHER, dailyQuota: 0 });
    const res = await request(app).post("/api/chats").set(as(OTHER)).send({ text: "hi" });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("prompt templates", () => {
  it("lists built-ins and manages personal templates", async () => {
    const list = await request(app).get("/api/prompts").set(as(USER));
    expect(list.status).toBe(200);
    expect(list.body.builtin.length).toBeGreaterThan(3);
    expect(list.body.items).toEqual([]);

    const created = await request(app).post("/api/prompts").set(as(USER)).send({ title: "Standup", content: "Summarize: " });
    expect(created.status).toBe(201);
    const id = created.body._id;

    const updated = await request(app).put(`/api/prompts/${id}`).set(as(USER)).send({ title: "Standup 2", content: "Summarize! ", icon: "🗓️" });
    expect(updated.body.title).toBe("Standup 2");

    expect((await request(app).put(`/api/prompts/${id}`).set(as(OTHER)).send({ title: "x", content: "y" })).status).toBe(404);
    expect((await request(app).delete(`/api/prompts/${id}`).set(as(USER))).status).toBe(204);
  });
});
