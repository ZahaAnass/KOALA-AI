import PDFDocument from "pdfkit";
import type { ChatDoc } from "../models/Chat.js";

const fmtDate = (d: Date | undefined) => (d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) : "");

export function chatToMarkdown(chat: ChatDoc): string {
  const lines: string[] = [`# ${chat.title}`, "", `_Exported from KOALA AI on ${fmtDate(new Date())}_`, ""];
  for (const m of chat.messages) {
    lines.push(`## ${m.role === "user" ? "You" : "KOALA AI"}  <sub>${fmtDate(m.createdAt)}</sub>`, "");
    for (const img of m.images ?? []) lines.push(`![image](${img.url || img.filePath})`, "");
    lines.push(m.text, "");
    if (m.sources?.length) {
      lines.push("**Sources**", "");
      for (const s of m.sources) lines.push(`- [${s.title}](${s.uri})`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function chatToJson(chat: ChatDoc): Record<string, unknown> {
  return {
    id: String(chat._id),
    title: chat.title,
    model: chat.model,
    tags: chat.tags,
    folder: chat.folder,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: chat.messages.map((m) => ({
      id: String(m._id),
      role: m.role,
      text: m.text,
      images: m.images,
      sources: m.sources,
      toolCalls: m.toolCalls,
      model: m.model,
      usage: m.usage,
      createdAt: m.createdAt,
    })),
  };
}

/** Renders a chat to a PDF buffer with simple, readable typography. */
export function chatToPdf(chat: ChatDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: chat.title, Author: "KOALA AI" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor("#111").text(chat.title, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#777").text(`Exported from KOALA AI · ${fmtDate(new Date())} · ${chat.messages.length} messages`);
    doc.moveDown(1);

    for (const m of chat.messages) {
      const isUser = m.role === "user";
      doc.fontSize(10).fillColor(isUser ? "#2563eb" : "#7c3aed").text(`${isUser ? "You" : "KOALA AI"} · ${fmtDate(m.createdAt)}`);
      doc.moveDown(0.2);
      for (const img of m.images ?? []) {
        doc.fontSize(9).fillColor("#555").text(`[image] ${img.url || img.filePath}`);
      }
      doc.fontSize(11).fillColor("#222").text(m.text || " ", { align: "left", lineGap: 2 });
      if (m.sources?.length) {
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor("#555").text("Sources:");
        for (const s of m.sources) doc.fontSize(9).fillColor("#2563eb").text(`• ${s.title} — ${s.uri}`, { link: s.uri });
      }
      doc.moveDown(0.8);
    }
    doc.end();
  });
}
