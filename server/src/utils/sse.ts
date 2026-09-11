import type { Request, Response } from "express";

/**
 * Small helper for Server-Sent Events responses.
 * Aborts the generation when the client disconnects before the response is finished.
 */
export class SseWriter {
  readonly abort = new AbortController();

  constructor(
    _req: Request,
    private readonly res: Response,
  ) {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    // `res` emits close when the socket goes away; `req` would fire as soon as the body is read.
    res.on("close", () => {
      if (!res.writableEnded) this.abort.abort();
    });
  }

  /** True once the client went away or the response was ended. */
  get isClosed(): boolean {
    return this.abort.signal.aborted || this.res.writableEnded;
  }

  send(event: string, data: unknown): void {
    if (this.isClosed) return;
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  end(): void {
    if (!this.res.writableEnded) this.res.end();
  }
}
