import { badRequest } from "../utils/errors.js";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXT = 20_000;

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/** Validates a URL and refuses local / private destinations (SSRF protection). */
async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw badRequest("Invalid URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw badRequest("Only http and https URLs are supported");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw badRequest("URL not allowed");
  const ip = isIP(host) ? host : (await lookup(host).catch(() => null))?.address;
  if (!ip || isPrivateIp(ip)) throw badRequest("URL not allowed");
  return url;
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  let body = html.replace(/<(script|style|noscript|svg|iframe|nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ");
  body = body.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<(br|p|div|li|h[1-6]|tr|section|article)[^>]*>/gi, "\n");
  body = body.replace(/<[^>]+>/g, " ");
  body = body
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  body = body.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { title, text: body.slice(0, MAX_TEXT) };
}

export async function fetchUrlText(raw: string): Promise<{ url: string; title: string; text: string; truncated: boolean }> {
  const url = await assertSafeUrl(raw);
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "KoalaAI-Bot/2.0 (+https://github.com/ZahaAnass/KOALA-AI)", Accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
  });
  if (!res.ok) throw badRequest(`Could not fetch URL (status ${res.status})`);
  const type = res.headers.get("content-type") ?? "";
  if (!/text\/|application\/(xhtml|json)/.test(type)) throw badRequest("URL does not point to a text or HTML page");

  const reader = res.body?.getReader();
  if (!reader) throw badRequest("Empty response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total > MAX_BYTES) {
      reader.cancel().catch(() => undefined);
      break;
    }
  }
  const html = Buffer.concat(chunks).toString("utf8");
  const parsed = type.includes("html") ? htmlToText(html) : { title: url.hostname, text: html.slice(0, MAX_TEXT) };
  return { url: url.toString(), title: parsed.title || url.hostname, text: parsed.text, truncated: total > MAX_BYTES || html.length > MAX_TEXT };
}
