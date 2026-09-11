# Deployment

Three parts need a home: the MongoDB database, the API server and the static client. Pick one of the layouts below.

## Prerequisites (all layouts)

### MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Database Access: add a user with read/write on the `koala-ai` database.
3. Network Access: allow your server's IP (or `0.0.0.0/0` while testing).
4. Copy the connection string into `MONGO_URI`, for example `mongodb+srv://user:pass@cluster.mongodb.net/koala-ai?retryWrites=true&w=majority`.

Text search uses a standard text index that Mongoose creates automatically on first run.

### Clerk (production instance)

1. In the Clerk dashboard create a production instance and add your domain.
2. Copy the production `pk_live_…` and `sk_live_…` keys into `VITE_CLERK_PUBLISHABLE_KEY` (client) and `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (server).
3. Optional user sync: Webhooks → Add endpoint `https://<api-domain>/api/webhooks/clerk`, subscribe to `user.created`, `user.updated`, `user.deleted`, and put the signing secret in `CLERK_WEBHOOK_SECRET`.
4. Add your admin email(s) to `ADMIN_EMAILS`.

### Gemini

Create a key at https://aistudio.google.com/app/apikey and set `GEMINI_API_KEY`. Enable billing if you expect real traffic; the default quota is small.

### CORS

`CLIENT_URL` must list every browser origin that will call the API, comma-separated, without trailing slashes:

```
CLIENT_URL=https://koala.example.com,https://www.koala.example.com
```

### Health checks

- `GET /health` → `200 { status: "ok" }` (liveness)
- `GET /ready` → `200` when MongoDB is connected and a model provider is configured, otherwise `503` (readiness)

## Option A: Docker Compose on a VPS

Works on any Linux host with Docker.

```bash
git clone https://github.com/ZahaAnass/KOALA-AI.git && cd KOALA-AI
cp .env.docker.example .env         # build args for the client image
cp server/.env.example server/.env  # runtime config for the API
# edit both files, then:
docker compose up -d --build
```

- Client: port `8080` (nginx serving `client/dist`, proxying `/api` to the `server` container)
- API: port `3000`
- Mongo: internal service `mongo` with a named volume `mongo-data`

`docker-compose.yml` overrides `MONGO_URI` and `CLIENT_URL` for the container network; everything else comes from `server/.env`. Put a reverse proxy (Caddy, Traefik, nginx) with TLS in front of port 8080, and set `VITE_API_URL` to the public API URL (or leave it empty and let nginx proxy `/api`).

Update:

```bash
git pull && docker compose up -d --build
```

## Option B: Vercel (client) + Render or Railway (server)

### Server on Render / Railway

| Setting        | Value                                   |
| -------------- | --------------------------------------- |
| Root directory | `server`                                |
| Build command  | `npm ci && npm run build`               |
| Start command  | `npm start`                             |
| Health check   | `/health`                               |
| Node version   | 20                                      |

Environment variables: `NODE_ENV=production`, `PORT` (Render sets it), `MONGO_URI`, `CLIENT_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` (optional), `GEMINI_API_KEY`, `OPENAI_API_KEY` (optional), `IMAGE_KIT_*` (optional), `ADMIN_EMAILS`, `DAILY_MESSAGE_QUOTA`.

From the monorepo root the equivalent commands are `npm run build -w server` and `npm start -w server`.

Streaming note: Render and Railway pass SSE through unchanged. If you put Cloudflare in front, disable response buffering for `/api/chats*` or use a "bypass cache" rule.

### Client on Vercel

| Setting          | Value                    |
| ---------------- | ------------------------ |
| Root directory   | `client`                 |
| Framework preset | Vite                     |
| Build command    | `npm run build`          |
| Output directory | `dist`                   |

Environment variables: `VITE_API_URL=https://<your-api-domain>`, `VITE_CLERK_PUBLISHABLE_KEY`.

Add a rewrite so client-side routes resolve (`client/vercel.json`):

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Then add the Vercel domain to `CLIENT_URL` on the server and to the Clerk allowed origins.

## Option C: single Node host

Build both workspaces and serve `client/dist` from any static host or CDN; run the API with a process manager:

```bash
npm ci
npm run build
pm2 start server/dist/server.js --name koala-api
```

## Post-deploy checklist

- [ ] `GET /ready` returns `200`
- [ ] Sign in works and `GET /api/users/me` returns your profile
- [ ] Sending a message streams an answer
- [ ] Image upload works (requires ImageKit) or is disabled gracefully
- [ ] Clerk webhook deliveries show `200` in the Clerk dashboard
- [ ] `ADMIN_EMAILS` account sees the Admin page
