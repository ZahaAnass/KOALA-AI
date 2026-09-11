import { describe, expect, it } from "vitest";
import PDFDocument from "pdfkit";
import { OTHER, USER, app, as, request } from "./helpers.js";
import { KnowledgeDocument } from "../src/models/Document.js";

describe("documents (knowledge base)", () => {
  it("ingests a text file, lists it, retrieves by keyword and deletes it", async () => {
    const body = "Koalas sleep up to 20 hours a day.\nThey eat eucalyptus leaves.\n".repeat(30);
    const upload = await request(app).post("/api/documents").set(as(USER)).attach("file", Buffer.from(body), { filename: "koalas.txt", contentType: "text/plain" });
    expect(upload.status).toBe(201);
    expect(upload.body.name).toBe("koalas.txt");
    expect(upload.body.chunkCount).toBeGreaterThan(0);

    const list = await request(app).get("/api/documents").set(as(USER));
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].chunks).toBeUndefined();

    const search = await request(app).post("/api/documents/search").set(as(USER)).send({ query: "eucalyptus leaves" });
    expect(search.status).toBe(200);
    expect(search.body.results.length).toBeGreaterThan(0);
    expect(search.body.results[0].text).toContain("eucalyptus");

    const notMine = await request(app).delete(`/api/documents/${upload.body._id}`).set(as(OTHER));
    expect(notMine.status).toBe(404);
    const del = await request(app).delete(`/api/documents/${upload.body._id}`).set(as(USER));
    expect(del.status).toBe(204);
    expect(await KnowledgeDocument.countDocuments()).toBe(0);
  });

  it("rejects unsupported types and missing files", async () => {
    const noFile = await request(app).post("/api/documents").set(as(USER));
    expect(noFile.status).toBe(400);
    const exe = await request(app).post("/api/documents").set(as(USER)).attach("file", Buffer.from("MZ..."), { filename: "virus.exe", contentType: "application/octet-stream" });
    expect(exe.status).toBe(400);
  });

  it("parses PDF files", async () => {
    const pdf = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.text("Hello PDF from koala tests");
      doc.end();
    });
    const res = await request(app).post("/api/documents").set(as(USER)).attach("file", pdf, { filename: "hello.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    const doc = await KnowledgeDocument.findById(res.body._id);
    expect(doc!.chunks[0]!.text).toContain("Hello PDF");
  });
});
