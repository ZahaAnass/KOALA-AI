# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [Unreleased]

## [2.0.0] - 2026-09-11

Complete rewrite of both applications.

### Added

- Streaming answers over SSE with stop, regenerate and edit-and-resend
- Follow-up question suggestions and AI-generated chat titles
- Markdown rendering with GFM, KaTeX math, highlighted code with copy buttons and Mermaid diagrams
- Multi-image attachments (drag, drop, paste), image generation with Gemini
- Voice input and read-aloud
- Web search grounding with cited sources
- Function-calling tools: calculator, weather (Open-Meteo), current date/time
- Knowledge base: upload PDF/TXT/MD/CSV/JSON, chunking, Gemini embeddings, retrieval-augmented answers
- URL summarization with SSRF protection
- Rolling memory summaries for long conversations
- Model selector (Gemini 2.5 Flash, Flash-Lite, Pro; optional GPT-4o / GPT-4o mini)
- Global and per-chat custom instructions, temperature, max tokens and safety level
- Prompt template library (built-in and personal)
- Chat search, pin, archive, tags, folders, bulk delete, clear history
- Public share links and export to Markdown, JSON and PDF
- Per-user daily quotas, usage analytics with charts, account deletion
- Admin dashboard: platform stats, user search, role and quota management
- Clerk webhook sync, health and readiness endpoints, OpenAPI docs at `/api/docs`
- Progressive web app (manifest, service worker, install prompt), dark/light/system themes, English and French
- Keyboard shortcuts, command palette, onboarding tour
- Server test suite (Vitest + Supertest + in-memory MongoDB), client unit tests, Playwright e2e config
- Docker images for both apps and a Compose stack, GitHub Actions CI, Dependabot, issue and PR templates
- Monorepo tooling: npm workspaces, Prettier, Husky, lint-staged, EditorConfig

### Changed

- Client rewritten in TypeScript with React 19 stable, Vite 7 and Tailwind CSS 4
- Server restructured into config, middleware, models, routes, services and utils with zod validation
- Chats now store their title and messages in one document; the separate `UserChats` collection is gone
- Documentation moved to `docs/`; the French specification became `docs/SPECIFICATION.md`

### Fixed

- Conversation history was never sent to the model (a hardcoded stub was used)
- Answers were saved with a 2-second timer instead of after the stream completed
- Upload endpoint used a hardcoded `localhost` URL
- `default: Date.now()` evaluated once at startup for chat timestamps
- Error states rendered as "No chats found"; failed mutations triggered success handlers
- React key placement on message fragments, stale image state on submit, unguarded ref access

### Security

- Session JWTs are now verified with `@clerk/express` instead of being base64-decoded without a signature check
- The Gemini API key no longer ships in the browser bundle; all generation is proxied by the server
- ImageKit upload credentials require authentication
- CORS no longer falls open when `CLIENT_URL` is unset; helmet, rate limiting and body-size limits added
- Uploads are validated by type and size on both client and server

## [1.0.0] - 2025-11-30

Original student project: React + Vite client calling Gemini directly, Express + Mongoose backend storing chats, Clerk sign-in, ImageKit image uploads.
