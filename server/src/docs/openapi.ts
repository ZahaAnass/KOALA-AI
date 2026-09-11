/**
 * OpenAPI 3.1 description of the KOALA AI API, served at /api/docs.
 * Kept by hand and intentionally compact; the zod schemas in routes/ are the source of truth.
 */
const bearer = [{ bearerAuth: [] }];

const messageSchema = {
  type: "object",
  properties: {
    _id: { type: "string" },
    role: { type: "string", enum: ["user", "model"] },
    text: { type: "string" },
    images: { type: "array", items: { $ref: "#/components/schemas/Image" } },
    sources: { type: "array", items: { $ref: "#/components/schemas/Source" } },
    toolCalls: { type: "array", items: { type: "object" } },
    model: { type: "string" },
    feedback: { type: "string", enum: ["up", "down"], nullable: true },
    usage: { $ref: "#/components/schemas/Usage" },
    edited: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const sendMessageBody = {
  type: "object",
  properties: {
    text: { type: "string", maxLength: 50000 },
    images: { type: "array", maxItems: 4, items: { type: "object", properties: { filePath: { type: "string" }, mimeType: { type: "string" } }, required: ["filePath"] } },
    options: { $ref: "#/components/schemas/GenerateOptions" },
  },
};

const sseResponse = {
  description:
    "Server-Sent Events stream. Events: `meta` {model, webSearch, tools, useDocuments}, `chunk` {text}, `sources` {sources[]}, `tool` {name,args,result}, `done` {message, title, followUps[], usage}, `error` {message}. Close the connection to stop generation.",
  content: { "text/event-stream": { schema: { type: "string" } } },
};

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "KOALA AI API",
    version: "2.0.0",
    description: "Backend for KOALA AI. Authenticate with a Clerk session JWT in the `Authorization: Bearer <token>` header.",
    license: { name: "MIT" },
  },
  servers: [{ url: "/", description: "This server" }],
  tags: [
    { name: "Health" },
    { name: "Chats" },
    { name: "Messages" },
    { name: "Share" },
    { name: "Documents", description: "Knowledge base for retrieval-augmented answers" },
    { name: "Users" },
    { name: "Admin" },
    { name: "Prompts" },
    { name: "Tools" },
    { name: "Images" },
    { name: "Upload" },
    { name: "Models" },
    { name: "Webhooks" },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" }, details: {} } }, requestId: { type: "string" } } },
      Image: { type: "object", properties: { filePath: { type: "string" }, mimeType: { type: "string" }, url: { type: "string" } } },
      Source: { type: "object", properties: { title: { type: "string" }, uri: { type: "string" } } },
      Usage: { type: "object", properties: { promptTokens: { type: "integer" }, candidateTokens: { type: "integer" }, totalTokens: { type: "integer" } } },
      Message: messageSchema,
      GenerateOptions: {
        type: "object",
        properties: {
          model: { type: "string" },
          webSearch: { type: "boolean" },
          tools: { type: "boolean" },
          useDocuments: { type: "boolean" },
          documentIds: { type: "array", items: { type: "string" } },
          temperature: { type: "number", minimum: 0, maximum: 2 },
          maxOutputTokens: { type: "integer" },
        },
      },
      ChatSummary: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          model: { type: "string" },
          pinned: { type: "boolean" },
          archived: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
          folder: { type: "string" },
          shareToken: { type: "string", nullable: true },
          messageCount: { type: "integer" },
          lastMessageAt: { type: "string", format: "date-time" },
          snippet: { type: "string" },
        },
      },
      Chat: {
        allOf: [
          { $ref: "#/components/schemas/ChatSummary" },
          {
            type: "object",
            properties: {
              systemInstruction: { type: "string" },
              messages: { type: "array", items: { $ref: "#/components/schemas/Message" } },
              page: { type: "object", properties: { start: { type: "integer" }, end: { type: "integer" }, total: { type: "integer" }, hasMore: { type: "boolean" } } },
            },
          },
        ],
      },
      Settings: {
        type: "object",
        properties: {
          model: { type: "string" },
          systemInstruction: { type: "string" },
          temperature: { type: "number" },
          maxOutputTokens: { type: "integer" },
          theme: { type: "string", enum: ["system", "light", "dark"] },
          locale: { type: "string", enum: ["en", "fr"] },
          safetyLevel: { type: "string", enum: ["off", "low", "medium", "high"] },
          followUps: { type: "boolean" },
          webSearch: { type: "boolean" },
          tools: { type: "boolean" },
          useDocuments: { type: "boolean" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string" },
          imageUrl: { type: "string" },
          role: { type: "string", enum: ["user", "admin"] },
          onboarded: { type: "boolean" },
          settings: { $ref: "#/components/schemas/Settings" },
          quota: { type: "object", properties: { limit: { type: "integer", nullable: true }, usedToday: { type: "integer" }, remaining: { type: "integer", nullable: true } } },
        },
      },
      PromptTemplate: { type: "object", properties: { _id: { type: "string" }, title: { type: "string" }, content: { type: "string" }, category: { type: "string" }, icon: { type: "string" }, builtin: { type: "boolean" } } },
      Document: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, mimeType: { type: "string" }, size: { type: "integer" }, chunkCount: { type: "integer" }, createdAt: { type: "string" } } },
    },
    responses: {
      Unauthorized: { description: "Missing or invalid token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      BadRequest: { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
  paths: {
    "/health": { get: { tags: ["Health"], summary: "Liveness probe", responses: { 200: { description: "OK" } } } },
    "/ready": { get: { tags: ["Health"], summary: "Readiness probe (database + AI provider)", responses: { 200: { description: "Ready" }, 503: { description: "Degraded" } } } },

    "/api/models": { get: { tags: ["Models"], security: bearer, summary: "Available models and feature flags", responses: { 200: { description: "OK" } } } },

    "/api/chats": {
      get: {
        tags: ["Chats"],
        security: bearer,
        summary: "List, search and filter chats",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Full-text search" },
          { name: "archived", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "pinned", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "tag", in: "query", schema: { type: "string" } },
          { name: "folder", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/ChatSummary" } }, total: { type: "integer" } } } } } }, 401: { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Chats"],
        security: bearer,
        summary: "Create a chat from a first message and stream the answer",
        requestBody: { required: true, content: { "application/json": { schema: sendMessageBody } } },
        responses: { 200: sseResponse, 400: { $ref: "#/components/responses/BadRequest" }, 429: { description: "Daily quota reached" } },
      },
      delete: { tags: ["Chats"], security: bearer, summary: "Delete all chats", responses: { 200: { description: "Count deleted" } } },
    },
    "/api/chats/meta": { get: { tags: ["Chats"], security: bearer, summary: "Distinct tags and folders", responses: { 200: { description: "OK" } } } },
    "/api/chats/bulk-delete": {
      post: { tags: ["Chats"], security: bearer, summary: "Delete several chats", requestBody: { content: { "application/json": { schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } } } } } }, responses: { 200: { description: "Count deleted" } } },
    },
    "/api/chats/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["Chats"],
        security: bearer,
        summary: "Get a chat with paginated messages",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 60 } },
          { name: "before", in: "query", schema: { type: "integer" }, description: "Message index to page backwards from" },
        ],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Chat" } } } }, 404: { $ref: "#/components/responses/NotFound" } },
      },
      patch: {
        tags: ["Chats"],
        security: bearer,
        summary: "Rename, pin, archive, tag, move to folder or set per-chat model/instructions",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, pinned: { type: "boolean" }, archived: { type: "boolean" }, tags: { type: "array", items: { type: "string" } }, folder: { type: "string" }, model: { type: "string" }, systemInstruction: { type: "string" } } } } } },
        responses: { 200: { description: "OK" }, 404: { $ref: "#/components/responses/NotFound" } },
      },
      delete: { tags: ["Chats"], security: bearer, summary: "Delete a chat", responses: { 204: { description: "Deleted" }, 404: { $ref: "#/components/responses/NotFound" } } },
    },
    "/api/chats/{id}/messages": {
      post: {
        tags: ["Messages"],
        security: bearer,
        summary: "Send a message and stream the answer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: sendMessageBody } } },
        responses: { 200: sseResponse, 429: { description: "Daily quota reached" } },
      },
    },
    "/api/chats/{id}/messages/{messageId}": {
      put: {
        tags: ["Messages"],
        security: bearer,
        summary: "Edit a user message; later messages are discarded and the answer regenerated",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { text: { type: "string" }, options: { $ref: "#/components/schemas/GenerateOptions" } }, required: ["text"] } } } },
        responses: { 200: sseResponse },
      },
    },
    "/api/chats/{id}/messages/{messageId}/regenerate": {
      post: {
        tags: ["Messages"],
        security: bearer,
        summary: "Regenerate a model answer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { options: { $ref: "#/components/schemas/GenerateOptions" } } } } } },
        responses: { 200: sseResponse },
      },
    },
    "/api/chats/{id}/messages/{messageId}/feedback": {
      post: {
        tags: ["Messages"],
        security: bearer,
        summary: "Rate an answer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "messageId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { feedback: { type: "string", enum: ["up", "down"], nullable: true }, note: { type: "string" } } } } } },
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/chats/{id}/export": {
      get: {
        tags: ["Chats"],
        security: bearer,
        summary: "Export a chat as Markdown, JSON or PDF",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "format", in: "query", schema: { type: "string", enum: ["md", "json", "pdf"], default: "md" } }],
        responses: { 200: { description: "File download" } },
      },
    },
    "/api/chats/{id}/share": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      post: { tags: ["Share"], security: bearer, summary: "Create a public read-only link", responses: { 200: { description: "{ shareToken }" } } },
      delete: { tags: ["Share"], security: bearer, summary: "Revoke the public link", responses: { 204: { description: "Revoked" } } },
    },
    "/api/share/{token}": {
      get: { tags: ["Share"], summary: "Public view of a shared chat (no auth)", parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" }, 404: { $ref: "#/components/responses/NotFound" } } },
    },

    "/api/documents": {
      get: { tags: ["Documents"], security: bearer, summary: "List knowledge documents", responses: { 200: { description: "OK" } } },
      post: {
        tags: ["Documents"],
        security: bearer,
        summary: "Upload a PDF/TXT/MD/CSV/JSON document (max 10 MB)",
        requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
        responses: { 201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } } },
      },
    },
    "/api/documents/search": { post: { tags: ["Documents"], security: bearer, summary: "Preview retrieval for a query", responses: { 200: { description: "OK" } } } },
    "/api/documents/{id}": { delete: { tags: ["Documents"], security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], summary: "Delete a document", responses: { 204: { description: "Deleted" } } } },

    "/api/users/me": {
      get: { tags: ["Users"], security: bearer, summary: "Current user profile, settings and quota", responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } } },
      delete: { tags: ["Users"], security: bearer, summary: "Delete account and all data", responses: { 204: { description: "Deleted" } } },
    },
    "/api/users/me/settings": { patch: { tags: ["Users"], security: bearer, summary: "Update settings", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Settings" } } } }, responses: { 200: { description: "OK" } } } },
    "/api/users/me/onboarded": { post: { tags: ["Users"], security: bearer, summary: "Mark onboarding tour as completed", responses: { 200: { description: "OK" } } } },
    "/api/users/me/usage": { get: { tags: ["Users"], security: bearer, summary: "Usage analytics", parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 30 } }], responses: { 200: { description: "OK" } } } },

    "/api/admin/stats": { get: { tags: ["Admin"], security: bearer, summary: "Platform statistics", responses: { 200: { description: "OK" }, 403: { description: "Admin only" } } } },
    "/api/admin/users": { get: { tags: ["Admin"], security: bearer, summary: "List users", parameters: [{ name: "q", in: "query", schema: { type: "string" } }], responses: { 200: { description: "OK" } } } },
    "/api/admin/users/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      patch: { tags: ["Admin"], security: bearer, summary: "Change role or quota", responses: { 200: { description: "OK" } } },
      delete: { tags: ["Admin"], security: bearer, summary: "Delete a user", responses: { 204: { description: "Deleted" } } },
    },

    "/api/prompts": {
      get: { tags: ["Prompts"], security: bearer, summary: "Built-in and personal prompt templates", responses: { 200: { description: "OK" } } },
      post: { tags: ["Prompts"], security: bearer, summary: "Create a template", responses: { 201: { description: "Created" } } },
    },
    "/api/prompts/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      put: { tags: ["Prompts"], security: bearer, summary: "Update a template", responses: { 200: { description: "OK" } } },
      delete: { tags: ["Prompts"], security: bearer, summary: "Delete a template", responses: { 204: { description: "Deleted" } } },
    },

    "/api/tools/url": { post: { tags: ["Tools"], security: bearer, summary: "Fetch readable text from a URL", requestBody: { content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } } } } } }, responses: { 200: { description: "{ url, title, text }" } } } },
    "/api/tools/calculate": { post: { tags: ["Tools"], security: bearer, summary: "Evaluate a math expression", responses: { 200: { description: "OK" } } } },
    "/api/images/generate": { post: { tags: ["Images"], security: bearer, summary: "Generate an image with Gemini", requestBody: { content: { "application/json": { schema: { type: "object", properties: { prompt: { type: "string" }, chatId: { type: "string" } } } } } }, responses: { 201: { description: "{ url, filePath }" } } } },
    "/api/upload": { get: { tags: ["Upload"], security: bearer, summary: "Signed ImageKit upload parameters", responses: { 200: { description: "OK" } } } },
    "/api/upload/config": { get: { tags: ["Upload"], security: bearer, summary: "Upload availability and limits", responses: { 200: { description: "OK" } } } },
    "/api/webhooks/clerk": { post: { tags: ["Webhooks"], summary: "Clerk user sync (svix signed)", responses: { 200: { description: "OK" }, 401: { description: "Bad signature" } } } },
  },
} as const;
