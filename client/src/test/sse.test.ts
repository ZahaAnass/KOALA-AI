import { describe, expect, it } from "vitest";
import { parseSseBlock, readSse } from "@/lib/sse";

describe("parseSseBlock", () => {
  it("parses event and data", () => {
    expect(parseSseBlock('event: chunk\ndata: {"text":"hi"}')).toEqual({ event: "chunk", data: '{"text":"hi"}' });
  });

  it("defaults the event name to message", () => {
    expect(parseSseBlock("data: plain")).toEqual({ event: "message", data: "plain" });
  });

  it("joins multi-line data with newlines", () => {
    expect(parseSseBlock("data: a\ndata: b")).toEqual({ event: "message", data: "a\nb" });
  });

  it("ignores comments and returns null without data", () => {
    expect(parseSseBlock(": keep-alive\nevent: ping")).toBeNull();
    expect(parseSseBlock("")).toBeNull();
  });

  it("tolerates CRLF line endings", () => {
    expect(parseSseBlock("event: done\r\ndata: 1\r\n")).toEqual({ event: "done", data: "1" });
  });
});

describe("readSse", () => {
  it("reassembles frames split across chunks", async () => {
    const encoder = new TextEncoder();
    const chunks = ['event: meta\ndata: {"m":1}\n\nevent: chunk\ndata: {"te', 'xt":"hello"}\n\nevent: done\ndata: {}\n\n'];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });

    const received = [];
    for await (const msg of readSse(new Response(stream))) received.push(msg);

    expect(received).toEqual([
      { event: "meta", data: '{"m":1}' },
      { event: "chunk", data: '{"text":"hello"}' },
      { event: "done", data: "{}" },
    ]);
  });
});
