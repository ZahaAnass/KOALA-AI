import { createRequire } from "node:module";
import { KnowledgeDocument } from "../models/Document.js";
import { gemini } from "./providers/gemini.js";
import { badRequest } from "../utils/errors.js";
import { logger } from "../config/logger.js";

const require = createRequire(import.meta.url);
// pdf-parse's package entry runs a self-test when imported as ESM; import the lib file directly.
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;

export const ALLOWED_DOC_TYPES = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json"]);
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const MAX_CHUNKS = 400;

export async function extractText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (mimeType === "application/pdf" || ext === "pdf") {
    try {
      return (await pdfParse(buffer)).text;
    } catch {
      throw badRequest("Could not read this PDF. Make sure the file is not corrupted or password protected.");
    }
  }
  if (ALLOWED_DOC_TYPES.has(mimeType) || ["txt", "md", "csv", "json"].includes(ext)) {
    return buffer.toString("utf8");
  }
  throw badRequest("Unsupported document type. Upload a PDF, TXT, MD, CSV or JSON file.");
}

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const breakAt = clean.lastIndexOf("\n", end);
      if (breakAt > start + CHUNK_SIZE / 2) end = breakAt;
    }
    chunks.push(clean.slice(start, end).trim());
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks.filter(Boolean);
}

async function embedAll(texts: string[]): Promise<number[][]> {
  if (!gemini.isConfigured()) return texts.map(() => []);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    try {
      out.push(...(await gemini.embed(batch)));
    } catch (err) {
      logger.warn({ err }, "Embedding batch failed; falling back to keyword search for these chunks");
      out.push(...batch.map(() => []));
    }
  }
  return out;
}

export async function ingestDocument(userId: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }) {
  if (file.size > MAX_DOC_BYTES) throw badRequest("Document exceeds the 10 MB limit");
  const text = await extractText(file.buffer, file.mimetype, file.originalname);
  const chunks = chunkText(text);
  if (chunks.length === 0) throw badRequest("No readable text found in the document");
  const embeddings = await embedAll(chunks);

  const doc = await KnowledgeDocument.create({
    userId,
    name: file.originalname.slice(0, 200),
    mimeType: file.mimetype,
    size: file.size,
    chunkCount: chunks.length,
    chunks: chunks.map((c, i) => ({ index: i, text: c, embedding: embeddings[i] ?? [] })),
  });
  return { _id: doc._id, name: doc.name, mimeType: doc.mimeType, size: doc.size, chunkCount: doc.chunkCount, createdAt: doc.createdAt };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function keywordScore(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (!terms.length) return 0;
  const lower = text.toLowerCase();
  return terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0) / terms.length;
}

export interface RetrievedChunk {
  documentId: string;
  documentName: string;
  text: string;
  score: number;
}

/** Retrieves the most relevant chunks across the user's documents (vector search with keyword fallback). */
export async function retrieveContext(userId: string, query: string, opts: { documentIds?: string[]; topK?: number } = {}): Promise<RetrievedChunk[]> {
  const filter: Record<string, unknown> = { userId, status: "ready" };
  if (opts.documentIds?.length) filter._id = { $in: opts.documentIds };
  const docs = await KnowledgeDocument.find(filter).lean();
  if (docs.length === 0) return [];

  let queryVec: number[] = [];
  if (gemini.isConfigured()) {
    try {
      queryVec = (await gemini.embed([query]))[0] ?? [];
    } catch {
      queryVec = [];
    }
  }

  const scored: RetrievedChunk[] = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score =
        queryVec.length && chunk.embedding.length ? cosine(queryVec, chunk.embedding) : keywordScore(query, chunk.text);
      if (score > 0) scored.push({ documentId: String(doc._id), documentName: doc.name, text: chunk.text, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.topK ?? 6);
}

export function buildRagPrompt(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "";
  const ctx = chunks.map((c, i) => `[${i + 1}] (${c.documentName})\n${c.text}`).join("\n\n");
  return `The user has uploaded documents. Use the following excerpts to answer when relevant and cite them as [n]. If the excerpts do not contain the answer, say so.\n\n${ctx}`;
}
