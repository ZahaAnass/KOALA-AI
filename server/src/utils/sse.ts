import type { Request, Response } from "express";

/** Small helper for Server-Sent Events responses. */
export class SseWriter {
  private closed = false;
  readonly abort = new AbortController();

  constructor(
    private readonly req: Request,
    private readonly res: Response,
  ) {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    req.on("close", () => {
      this.closed = true;
      this.abort.abort();
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  send(event: string, data: unknown): void {
    if (this.closed) return;
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  end(): void {
    if (this.closed) return;
    this.closed = true;
    this.res.end();
  }
}
