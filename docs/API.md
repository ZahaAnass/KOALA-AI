# API reference

Base URL: `http://localhost:3000` in development. Interactive Swagger UI is served at `/api/docs`; the raw OpenAPI 3.1 document at `/api/openapi.json` (source: `server/src/docs/openapi.ts`).

## Authentication

Every `/api/*` route except `share`, `webhooks`, `health` and `ready` requires a Clerk session JWT:

```
Authorization: Bearer <clerk-session-token>
```

Errors are JSON:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Unauthenticated" }, "requestId": "…" }
```

Codes: `BAD_REQUEST`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

Rate limiting applies to `/api` (default 120 requests per minute per token/IP) and a daily message quota applies to generation endpoints (`429 RATE_LIMITED`).

## Endpoints

### Health

| Method | Path      | Description                                     |
| ------ | --------- | ----------------------------------------------- |
| GET    | `/health` | Liveness                                        |
| GET    | `/ready`  | Readiness: database up and an AI provider set   |

### Models

| Method | Path          | Description                                  |
| ------ | ------------- | -------------------------------------------- |
| GET    | `/api/models` | Available models and server feature flags    |

### Chats

| Method | Path                        | Description                                                                 |
| ------ | --------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/chats`                | List/search. Query: `q`, `archived`, `pinned`, `tag`, `folder`, `limit`, `offset` |
| POST   | `/api/chats`                | Create a chat from a first message; **streams** the answer                  |
| DELETE | `/api/chats`                | Delete all of the caller's chats                                            |
| GET    | `/api/chats/meta`           | Distinct tags and folders                                                   |
| POST   | `/api/chats/bulk-delete`    | Body `{ ids: string[] }`                                                    |
| GET    | `/api/chats/:id`            | Chat with paginated messages. Query: `limit` (default 60), `before` (index) |
| PATCH  | `/api/chats/:id`            | `title`, `pinned`, `archived`, `tags`, `folder`, `model`, `systemInstruction` |
| DELETE | `/api/chats/:id`            | Delete one chat                                                             |
| GET    | `/api/chats/:id/export`     | Query `format=md|json|pdf`; returns a file download                         |

### Messages

| Method | Path                                              | Description                                                   |
| ------ | ------------------------------------------------- | ------------------------------------------------------------- |
| POST   | `/api/chats/:id/messages`                         | Send a message; **streams** the answer                        |
| PUT    | `/api/chats/:id/messages/:messageId`              | Edit a user message, discard later ones, **stream** new answer |
| POST   | `/api/chats/:id/messages/:messageId/regenerate`   | Regenerate a model answer; **streams**                        |
| POST   | `/api/chats/:id/messages/:messageId/feedback`     | Body `{ feedback: "up" | "down" | null, note? }`              |

Message body for send/create:

```json
{
  "text": "Explain closures",
  "images": [{ "filePath": "/koala-ai/uploads/x.png", "mimeType": "image/png" }],
  "options": {
    "model": "gemini-2.5-flash",
    "webSearch": false,
    "tools": true,
    "useDocuments": false,
    "documentIds": [],
    "temperature": 0.7,
    "maxOutputTokens": 4096
  }
}
```

### Share

| Method | Path                    | Auth | Description                          |
| ------ | ----------------------- | ---- | ------------------------------------ |
| POST   | `/api/chats/:id/share`  | yes  | Create or return `{ shareToken }`    |
| DELETE | `/api/chats/:id/share`  | yes  | Revoke the link                      |
| GET    | `/api/share/:token`     | no   | Public read-only view of the chat    |

### Documents (knowledge base)

| Method | Path                     | Description                                                  |
| ------ | ------------------------ | ------------------------------------------------------------ |
| GET    | `/api/documents`         | List the caller's documents                                  |
| POST   | `/api/documents`         | Multipart field `file`: PDF, TXT, MD, CSV or JSON, max 10 MB |
| POST   | `/api/documents/search`  | Body `{ query, topK? }`; preview retrieval                   |
| DELETE | `/api/documents/:id`     | Delete a document                                            |

### Users

| Method | Path                        | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| GET    | `/api/users/me`             | Profile, settings, quota                      |
| PATCH  | `/api/users/me/settings`    | Partial settings update                       |
| POST   | `/api/users/me/onboarded`   | Mark the onboarding tour as done              |
| GET    | `/api/users/me/usage`       | Query `days` (7–365); per-day series + totals |
| DELETE | `/api/users/me`             | Delete account and all data                   |

### Admin (role `admin`)

| Method | Path                    | Description                                  |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/api/admin/stats`      | Platform totals, daily activity, feedback    |
| GET    | `/api/admin/users`      | Query `q`, `limit`, `offset`                 |
| PATCH  | `/api/admin/users/:id`  | `{ role?, dailyQuota? }`                     |
| DELETE | `/api/admin/users/:id`  | Delete a user and their data                 |

### Prompts

| Method | Path                | Description                                |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/api/prompts`      | `{ builtin: [], items: [] }`               |
| POST   | `/api/prompts`      | `{ title, content, category?, icon? }`     |
| PUT    | `/api/prompts/:id`  | Update a personal template                 |
| DELETE | `/api/prompts/:id`  | Delete a personal template                 |

### Tools, images, upload

| Method | Path                    | Description                                                     |
| ------ | ----------------------- | --------------------------------------------------------------- |
| POST   | `/api/tools/url`        | `{ url }` → `{ url, title, text, truncated }` (SSRF-protected)  |
| POST   | `/api/tools/calculate`  | `{ expression }` → `{ result }`                                 |
| POST   | `/api/images/generate`  | `{ prompt, chatId? }` → `{ url, filePath, mimeType }`           |
| GET    | `/api/upload`           | Signed ImageKit upload parameters                               |
| GET    | `/api/upload/config`    | Whether uploads are enabled, allowed types, size limit          |

### Webhooks

| Method | Path                   | Description                                              |
| ------ | ---------------------- | -------------------------------------------------------- |
| POST   | `/api/webhooks/clerk`  | svix-signed Clerk events: `user.created/updated/deleted` |

## Streaming contract

Generation endpoints respond with `200 text/event-stream`. Each frame is `event: <name>\ndata: <json>\n\n`.

| Event     | Payload                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `meta`    | `{ chatId, userMessageId, model, webSearch, tools, useDocuments }`       |
| `chunk`   | `{ text }` incremental answer text                                        |
| `sources` | `{ sources: [{ title, uri }] }` web or `document:<id>` references         |
| `tool`    | `{ name, args, result }` after a function call executes                   |
| `done`    | `{ chatId, message, title, followUps, usage }` final persisted message     |
| `error`   | `{ message }`                                                             |

Close the connection to stop generation; the partial answer is not persisted as "done", so the client refetches the chat.

## Examples

List chats:

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/chats?limit=10"
```

Send a message and stream the reply:

```bash
curl -N -X POST "http://localhost:3000/api/chats/$CHAT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"What is the weather in Casablanca?","options":{"tools":true}}'
```

Upload a document:

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@notes.pdf"
```
