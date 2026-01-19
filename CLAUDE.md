# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev              # Start dev server with Turbopack (http://localhost:3000)
bun run build        # Production build
bun run lint         # Run ESLint

# Database (Drizzle)
bun run db:push      # Push schema directly to DB (development)
bun run db:generate  # Generate migrations from schema changes
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio GUI
bun run db:seed      # Seed admin user (requires DATABASE_URL in .env.local)
```

Note: No test suite is currently configured.

## Architecture

### Tech Stack
- **Next.js 15** with App Router and Turbopack
- **Tailwind CSS v4** + shadcn/ui components
- **Drizzle ORM** with Neon Postgres (serverless HTTP driver)
- **Bun** as package manager and script runner
- **Gemini API** with tool-calling for AI assistant

### Key Patterns

**Database Connection (`lib/db.ts`)**: Uses a lazy-initialized proxy pattern to avoid build-time errors when DATABASE_URL isn't available. Import as `import { db, schema } from "@/lib/db"`. Drizzle config loads credentials from `.env.local`.

**Authentication (`lib/auth.ts`)**: PIN-based auth with bcrypt hashing. Sessions stored in DB with 12-hour expiration. Key functions:
- `getCurrentUser()` - Get user from session cookie
- `requireAuth()` / `requireAdmin()` - Auth guards for API routes
- `authenticateByPin(pin)` - Login flow

**Middleware (`middleware.ts`)**: Edge middleware handles route protection. Public paths: `/lock`, `/api/auth/pin`. Admin role checks happen at page/API level (not in middleware) since edge middleware can't do async DB calls.

**Schema (`drizzle/schema.ts`)**: Core tables:
- `users` - PIN auth, roles (admin/user)
- `sessions` - Token-based sessions
- `parts` - Catalog with partId, name, color, category, plus extended fields (jobNumber, sizeW/sizeL, thickness, brand, pallet, unit)
- `locations` - Storage locations with type/zone
- `inventory` - Quantities per part+location (unique constraint)
- `inventoryMoves` - Audit trail of all movements
- `settings` - App configuration key/value store

**Page/Client Component Pattern**: Pages are server components that delegate to `*-client.tsx` for interactivity (e.g., `app/kiosk/page.tsx` renders `<KioskClient />`). Client components handle state, effects, and user interactions.

### Route Structure
- `/lock` - PIN entry (public)
- `/kiosk` - Main search interface
- `/item/[partId]` - Part detail with TAKE/RETURN
- `/admin` - User management, Excel import
- `/api/ai/chat` - AI assistant with Gemini tool-calling (searchParts, filterParts, getPartDetails, getRecentMoves, getLastMoveForPart, listLocations, listCategories, listBrands, getInventoryByLocation, getLowStockParts, getInventorySummaryByJob, getInventorySummaryByBrand)

### Environment Variables
Required: `DATABASE_URL`, `SESSION_SECRET`
Optional: `GEMINI_API_KEY`, `GEMINI_MODEL` (defaults to gemini-1.5-flash)

### Excel Import Format
The admin import expects workbooks with these sheets:
- **Parts**: `Part_ID`, `Part_Name`, `Color`, `Category`
- **Locations**: `Location_ID`, `Type`, `Zone`
- **Inventory sheets** (any of: `Extrusion_Inventory`, `ACM_Inventory`, `SPL_inventory`, `HPL_Inventory`, `Rivet_Inventory`, `Misc_Inventory`): `Part_ID`, `Part_Name`, `Color`, `Location_ID`, `Quantity`

### Styling
UI follows `STYLE_GUIDE.md` - a warm sand/beige theme with Tailwind CSS v4 custom properties and shadcn/ui components. Key colors: `--accent-primary` (warm orange for CTAs), `--accent-secondary` (blue).

### Conventions
- TypeScript with 2-space indentation
- Commits use conventional prefixes: `feat:`, `fix:`, `style:`, `docs:`
- Components: PascalCase; files: kebab-case
- Use path aliases: `@/lib/...`, `@/components/...`
