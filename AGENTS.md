# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router pages and API routes (e.g., `app/api/auth`, `app/kiosk`, `app/item/[partId]`).
- `components/` holds shared UI components and shadcn/ui building blocks.
- `lib/` provides core utilities like auth and database access (`lib/auth.ts`, `lib/db.ts`).
- `drizzle/` defines database schema and migration setup.
- `hooks/` contains client hooks such as toast helpers.
- `middleware.ts` enforces route protection at the edge.
- `scripts/` includes one-off tooling like `scripts/seed-admin.ts`.

## Build, Test, and Development Commands
- `bun dev` starts the local dev server with Turbopack at `http://localhost:3000`.
- `bun run build` creates a production build; `bun run start` serves it.
- `bun run lint` runs Next.js ESLint checks.
- Database tasks: `bun run db:push` (dev schema push), `bun run db:generate` (migrations),
  `bun run db:migrate` (apply), and `bun run db:studio` (GUI).
- Seed admin user: `bun run db:seed` (requires `DATABASE_URL` in `.env.local`).

## Coding Style & Naming Conventions
- TypeScript + React with 2-space indentation and double quotes (match existing files).
- Components use PascalCase; files typically use kebab-case (`lock-client.tsx`).
- Prefer path aliases like `@/lib/db` where already used.
- Styling is Tailwind CSS v4 + shadcn/ui; follow the patterns in `STYLE_GUIDE.md`.

## Testing Guidelines
- No automated test suite is configured yet; validate changes manually.
- When adding tests, colocate near the feature (e.g., `app/.../__tests__`), and document the runner.

## Commit & Pull Request Guidelines
- Recent commits use conventional prefixes like `feat:`, `style:`, `docs:`—follow that pattern.
- Keep commit messages short and imperative (e.g., `feat: add inventory filter`).
- PRs should include: a clear summary, test/verification notes, and screenshots for UI changes.
- Link related issues or tickets when available.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `SESSION_SECRET`.
- `GEMINI_API_KEY` and `GEMINI_MODEL` are optional for the AI assistant.
