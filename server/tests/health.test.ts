import { describe, expect, it } from "vitest";
import { app, request } from "./helpers.js";

describe("health & docs", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /ready reports degraded when no AI provider is configured", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe("up");
    expect(res.body.checks.aiProvider).toBe("missing");
  });

  it("serves the OpenAPI document", async () => {
    const res = await request(app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(res.body.paths["/api/chats"]).toBeDefined();
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("omits CORS headers for disallowed origins without failing the request", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();

    const ok = await request(app).get("/health").set("Origin", "http://localhost:5173");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
