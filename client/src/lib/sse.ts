/**
 * Minimal Server-Sent Events parser over `fetch` streams.
 * The native EventSource API only supports GET, so we parse POST responses by hand.
 */

export interface SseMessage {
  event: string;
  data: string;
}

/** Parses one SSE text block (lines separated by "\n", block by blank line). */
export function parseSseBlock(block: string): SseMessage | null {
  let event = "message";
  const data: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  return { event, data: data.join("\n") };
}

/** Reads a streaming response and yields parsed SSE messages. */
export async function* readSse(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const msg = parseSseBlock(block);
        if (msg) yield msg;
        boundary = buffer.indexOf("\n\n");
      }
    }
    const tail = parseSseBlock(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
