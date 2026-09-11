# Contributing to KOALA AI

Thanks for your interest. This guide covers local setup, conventions and what a good pull request looks like.

## Setup

```bash
git clone https://github.com/<you>/KOALA-AI.git
cd KOALA-AI
npm ci                 # installs both workspaces from the root package-lock.json
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Running `npm install` (or `npm ci`) at the root installs the Husky pre-commit hook; the workspace lockfile is committed. The hook runs Prettier and ESLint on staged files.

You need Node 20+, a MongoDB connection string, Clerk keys and a Gemini key. See the README for where to get them. The server test suite does not need any of these: it uses an in-memory MongoDB and a test-only auth header.

## Branches

Branch from `main` and use a descriptive prefix:

- `feat/<short-name>` new functionality
- `fix/<short-name>` bug fixes
- `docs/<short-name>` documentation only
- `chore/<short-name>` tooling, dependencies, CI

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat(client): add voice input to the composer
fix(server): validate answer text before persisting
docs: describe the SSE contract
```

Scopes are `client`, `server`, `docs`, `ci` or omitted.

## Checks

Run these before opening a PR; CI runs the same commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Per workspace: `npm run lint -w server`, `npm test -w client`, and so on. End-to-end tests: `npm run test:e2e -w client` (requires a Clerk publishable key in `client/.env`).

## Code style

- TypeScript strict mode everywhere; avoid `any`.
- Small, focused modules. Prefer a new file over a 500-line one.
- Client: Tailwind semantic tokens (`bg-bg`, `text-fg-muted`, `border-border`) rather than raw colors so both themes work.
- Every user-facing string goes through i18n; add keys to both `en.json` and `fr.json`.
- Server: validate input with zod at the route boundary and throw `HttpError` helpers from `utils/errors.ts`.
- Add or update tests for behavior you change.

## Pull request checklist

- [ ] Branch is up to date with `main`
- [ ] `npm run lint`, `npm run typecheck`, `npm test` pass
- [ ] New env vars are documented in `.env.example` files and the README
- [ ] API changes are reflected in `server/src/docs/openapi.ts` and `docs/API.md`
- [ ] Screenshots or a short recording for UI changes
- [ ] `CHANGELOG.md` entry under "Unreleased"

## Reporting bugs and requesting features

Use the issue templates. For security problems, follow `SECURITY.md` instead of opening a public issue.
