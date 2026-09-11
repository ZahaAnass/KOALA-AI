import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatProvider, ModelInfo, StreamEvent, StreamParams } from "../src/services/providers/types.js";

/**
 * A fake provider that awaits between chunks, so the SSE plumbing is exercised across
 * event-loop turns (regression for the request-close abort bug) and tool events are covered.
 */
const model: ModelInfo = { id: "stub-model", label: "Stub", provider: "gemini", description: "", supportsImages: true, supportsTools: true, supportsWebSearch: true };
let lastParams: StreamParams | undefined;
let behaviour: "ok" | "throw" | "slow" = "ok";

const stubProvider: ChatProvider = {
  id: "gemini",
  isConfigured: () => true,
  models: () => [model],
  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    lastParams = params;
    if (behaviour === "throw") throw new Error("API key not valid");
    await new Promise((r) => setTimeout(r, 5));
    yield { type: "text", text: "Hello " };
    yield { type: "tool", call: { name: "calculate", args: { expression: "1+1" }, result: { result: 2 } } };
    await new Promise((r) => setTimeout(r, behaviour === "slow" ? 300 : 5));
    if (params.signal.aborted) return;
    yield { type: "text", text: "world" };
    yield { type: "sources", sources: [{ title: "Example", uri: "https://example.com" }] };
    yield { type: "usage", usage: { promptTokens: 10, candidateTokens: 5, totalTokens: 15 } };
  },
  complete: async () => "Stub title",
};

vi.mock("../src/services/providers/index.js", () => ({
  listModels: () => [model],
  resolveModel: () => ({ provider: stubProvider, model }),
  helperProvider: () => stubProvider,
}));

const { app, request, as, USER } = await import("./helpers.js");
const { Chat } = await import("../src/models/Chat.js");
const { User } = await import("../src/models/User.js");

function events(text: string): Array<{ event: string; data: Record<string, unknown> }> {
  return text
    .split("\n\n")
    .filter((b) => b.startsWith("event:"))
    .map((b) => {
      const [eventLine, dataLine] = b.split("\n");
      return { event: eventLine!.slice(7), data: JSON.parse(dataLine!.slice(6)) as Record<string, unknown> };
    });
}

describe("streaming generation", () => {
  beforeEach(() => {
    behaviour = "ok";
    lastParams = undefined;
  });

  it("creates a chat, streams chunks/tools/sources and persists the exchange", async () => {
    const res = await request(app).post("/api/chats").set(as(USER)).send({ text: "Say hello", options: { tools: true } });
    expect(res.status).toBe(200);
    const evs = events(res.text);
    const types = evs.map((e) => e.event);
    expect(types).toEqual(["meta", "chunk", "tool", "chunk", "sources", "done"]);

    const meta = evs[0]!.data;
    expect(meta.model).toBe("stub-model");
    expect(typeof meta.chatId).toBe("string");
    expect(typeof meta.userMessageId).toBe("string");

    const done = evs.at(-1)!.data as { chatId: string; message: { text: string; sources: unknown[]; toolCalls: unknown[]; usage: { totalTokens: number } }; title: string };
    expect(done.message.text).toBe("Hello world");
    expect(done.message.toolCalls).toHaveLength(1);
    expect(done.message.sources).toHaveLength(1);
    expect(done.message.usage.totalTokens).toBe(15);
    expect(done.title).toBe("Stub title");

    const chat = await Chat.findById(done.chatId);
    expect(chat!.messages).toHaveLength(2);
    expect(chat!.messages[1]!.text).toBe("Hello world");
    expect(chat!.messageCount).toBe(2);
    expect(chat!.title).toBe("Stub title");

    const user = await User.findOne({ clerkId: USER });
    expect(user!.usage.count).toBe(1);
    expect(user!.usage.totalTokens).toBe(15);
  });

  it("passes history, custom instructions and safety level to the provider", async () => {
    await request(app).patch("/api/users/me/settings").set(as(USER)).send({ systemInstruction: "Be terse", safetyLevel: "low" });
    const first = events((await request(app).post("/api/chats").set(as(USER)).send({ text: "first" })).text);
    const chatId = (first[0]!.data as { chatId: string }).chatId;

    const res = await request(app).post(`/api/chats/${chatId}/messages`).set(as(USER)).send({ text: "second" });
    expect(res.status).toBe(200);
    expect(lastParams!.history.map((h) => h.text)).toEqual(["first", "Hello world"]);
    expect(lastParams!.message.text).toBe("second");
    expect(lastParams!.systemInstruction).toContain("Be terse");
    expect(lastParams!.safetyLevel).toBe("low");
  });

  it("regenerates by discarding the old answer and edits by truncating", async () => {
    const first = events((await request(app).post("/api/chats").set(as(USER)).send({ text: "q1" })).text);
    const chatId = (first[0]!.data as { chatId: string }).chatId;
    await request(app).post(`/api/chats/${chatId}/messages`).set(as(USER)).send({ text: "q2" });
    let chat = await Chat.findById(chatId);
    expect(chat!.messages.map((m) => m.text)).toEqual(["q1", "Hello world", "q2", "Hello world"]);

    const answerId = String(chat!.messages[3]!._id);
    const regen = await request(app).post(`/api/chats/${chatId}/messages/${answerId}/regenerate`).set(as(USER)).send({});
    expect(regen.status).toBe(200);
    chat = await Chat.findById(chatId);
    expect(chat!.messages).toHaveLength(4);
    expect(String(chat!.messages[3]!._id)).not.toBe(answerId);

    const firstUserId = String(chat!.messages[0]!._id);
    const edit = await request(app).put(`/api/chats/${chatId}/messages/${firstUserId}`).set(as(USER)).send({ text: "q1 edited" });
    expect(edit.status).toBe(200);
    chat = await Chat.findById(chatId);
    expect(chat!.messages.map((m) => m.text)).toEqual(["q1 edited", "Hello world"]);
    expect(chat!.messages[0]!.edited).toBe(true);
  });

  it("reports provider failures as an SSE error event and keeps the user message", async () => {
    behaviour = "throw";
    const res = await request(app).post("/api/chats").set(as(USER)).send({ text: "boom" });
    expect(res.status).toBe(200);
    const evs = events(res.text);
    expect(evs.map((e) => e.event)).toEqual(["meta", "error"]);
    expect((evs[1]!.data as { message: string }).message).toContain("rejected");
    const chatId = (evs[0]!.data as { chatId: string }).chatId;
    const chat = await Chat.findById(chatId);
    expect(chat!.messages).toHaveLength(1);
  });

  it("keeps the partial answer when the client disconnects mid-stream", async () => {
    behaviour = "slow";
    const created = events((await request(app).post("/api/chats").set(as(USER)).send({ text: "start" })).text);
    const chatId = (created[0]!.data as { chatId: string }).chatId;

    const controller = new AbortController();
    const req = request(app).post(`/api/chats/${chatId}/messages`).set(as(USER)).send({ text: "long one" });
    setTimeout(() => req.abort(), 120);
    await req.catch(() => undefined);
    controller.abort();

    await vi.waitFor(async () => {
      const chat = await Chat.findById(chatId);
      expect(chat!.messages).toHaveLength(4);
      expect(chat!.messages[3]!.text).toBe("Hello ");
    });
  });

  it("rejects image paths outside the upload folder", async () => {
    const res = await request(app).post("/api/chats").set(as(USER)).send({ text: "look", images: [{ filePath: "http://169.254.169.254/latest" }] });
    expect(res.status).toBe(400);
    const res2 = await request(app).post("/api/chats").set(as(USER)).send({ text: "look", images: [{ filePath: "/other-folder/x.png" }] });
    expect(res2.status).toBe(400);
  });

  it("enforces the daily quota atomically under concurrency", async () => {
    await User.create({ clerkId: "user_quota", dailyQuota: 2 });
    const results = await Promise.all(Array.from({ length: 5 }, () => request(app).post("/api/chats").set(as("user_quota")).send({ text: "hi" })));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 200, 429, 429, 429]);
  });
});
