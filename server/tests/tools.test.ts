import { describe, expect, it } from "vitest";
import { evaluateExpression, executeTool } from "../src/services/tools.js";
import { htmlToText } from "../src/services/urlFetch.js";
import { chunkText } from "../src/services/documents.js";
import { fallbackTitle } from "../src/services/ai.js";
import { USER, app, as, request } from "./helpers.js";

describe("calculator", () => {
  it("evaluates arithmetic with precedence", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
    expect(evaluateExpression("-4 + 10 % 3")).toBe(-3);
  });

  it("supports functions and constants", () => {
    expect(evaluateExpression("sqrt(16) + abs(-2)")).toBe(6);
    expect(evaluateExpression("round(pi * 100) / 100")).toBe(3.14);
    expect(evaluateExpression("max(1, 5, 3) - min(4, 2)")).toBe(3);
  });

  it("rejects unsafe or invalid input", () => {
    expect(() => evaluateExpression("process.exit()")).toThrow();
    expect(() => evaluateExpression("1 +")).toThrow();
    expect(() => evaluateExpression("1 / 0")).toThrow(/finite/);
    expect(() => evaluateExpression("foo(1)")).toThrow(/Unknown function/);
  });

  it("is exposed as a model tool and an HTTP endpoint", async () => {
    const tool = await executeTool("calculate", { expression: "12 * 12" });
    expect(tool).toEqual({ expression: "12 * 12", result: 144 });

    const res = await request(app).post("/api/tools/calculate").set(as(USER)).send({ expression: "3 * (4 + 1)" });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(15);
    const bad = await request(app).post("/api/tools/calculate").set(as(USER)).send({ expression: "1 +" });
    expect(bad.status).toBe(400);
  });

  it("returns the current time for a timezone", async () => {
    const out = (await executeTool("get_current_datetime", { timezone: "Europe/Paris" })) as { iso: string; timezone: string };
    expect(out.timezone).toBe("Europe/Paris");
    expect(new Date(out.iso).getTime()).toBeGreaterThan(0);
    const bad = (await executeTool("get_current_datetime", { timezone: "Mars/Olympus" })) as { error: string };
    expect(bad.error).toMatch(/Unknown timezone/);
  });
});

describe("url text extraction", () => {
  it("strips markup and keeps readable text", () => {
    const { title, text } = htmlToText(
      `<html><head><title> Hello  World </title><style>p{}</style></head><body><nav>menu</nav><h1>Heading</h1><p>First &amp; second</p><script>alert(1)</script></body></html>`,
    );
    expect(title).toBe("Hello World");
    expect(text).toContain("Heading");
    expect(text).toContain("First & second");
    expect(text).not.toContain("menu");
    expect(text).not.toContain("alert");
  });

  it("refuses private and non-http URLs", async () => {
    for (const url of ["http://localhost:3000/secret", "http://127.0.0.1/", "ftp://example.com/x", "http://169.254.169.254/latest"]) {
      const res = await request(app).post("/api/tools/url").set(as(USER)).send({ url });
      expect(res.status, url).toBe(400);
    }
  });
});

describe("document chunking", () => {
  it("splits long text into overlapping chunks", () => {
    const text = Array.from({ length: 120 }, (_, i) => `Line ${i} of the document with some words in it.`).join("\n");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1200);
    expect(chunks[1]).toContain(chunks[0]!.slice(-40).split("\n").pop()!.slice(0, 10));
  });

  it("returns nothing for blank input", () => {
    expect(chunkText("   \n\n ")).toEqual([]);
  });
});

describe("titles", () => {
  it("falls back to a trimmed first message", () => {
    expect(fallbackTitle("  what   is\nlove ")).toBe("what is love");
    expect(fallbackTitle("")).toBe("New chat");
    expect(fallbackTitle("x".repeat(100))).toHaveLength(61);
  });
});
