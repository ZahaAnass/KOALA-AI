import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { badRequest } from "../utils/errors.js";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXT = 20_000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10_000;

/** Normalises IPv4-mapped IPv6 addresses (::ffff:1.2.3.4) to plain IPv4. */
function normaliseIp(ip: string): string {
  return ip.toLowerCase().replace(/^::ffff:/, "");
}

function isPrivateIp(raw: string): boolean {
  const ip = normaliseIp(raw);
  if (ip === "::1" || ip === "::" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Validates a URL and refuses local / private destinations on every resolved address (SSRF protection). */
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

  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateIp)) throw badRequest("URL not allowed");
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

/** Follows redirects manually so every hop is validated against private networks. */
async function fetchWithSafeRedirects(start: URL): Promise<{ res: Response; url: URL }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "KoalaAI-Bot/2.0 (+https://github.com/ZahaAnass/KOALA-AI)", Accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      url = await assertSafeUrl(new URL(location, url).toString());
      continue;
    }
    return { res, url };
  }
  throw badRequest("Too many redirects");
}

async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) throw badRequest("Empty response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total > MAX_BYTES) {
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

export async function fetchUrlText(raw: string): Promise<{ url: string; title: string; text: string; truncated: boolean }> {
  const { res, url } = await fetchWithSafeRedirects(await assertSafeUrl(raw));
  if (!res.ok) throw badRequest(`Could not fetch URL (status ${res.status})`);
  const type = res.headers.get("content-type") ?? "";
  if (!/text\/|application\/(xhtml|json)/.test(type)) throw badRequest("URL does not point to a text or HTML page");

  const { text: html, truncated } = await readCapped(res);
  const parsed = type.includes("html") ? htmlToText(html) : { title: url.hostname, text: html.slice(0, MAX_TEXT) };
  return { url: url.toString(), title: parsed.title || url.hostname, text: parsed.text, truncated: truncated || html.length > MAX_TEXT };
}
