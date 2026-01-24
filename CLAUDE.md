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
bun run db:seed-destinations  # Seed destination locations
bun run db:seed-locations     # Seed storage locations
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
- `adminNotifications` - Daily summaries and problem reports for admins (with email tracking)
- `adminNotificationReads` - Tracks which admin users have read which notifications

**Page/Client Component Pattern**: Pages are server components that delegate to `*-client.tsx` for interactivity (e.g., `app/kiosk/page.tsx` renders `<KioskClient />`). Client components handle state, effects, and user interactions.

### Route Structure

**Public Pages:**
- `/lock` - PIN entry (public)

**User Pages:**
- `/kiosk` - Main search interface
- `/item/[partId]` - Part detail with TAKE/RETURN

**Admin Pages:**
- `/admin` - User management, Excel import, receiving workflow, inventory transfers, notifications

**API Routes:**
- `/api/auth/*` - PIN authentication, session management
- `/api/parts` - Search parts, get part details
- `/api/move` - Record inventory movements (TAKE/RETURN)
- `/api/report-problem` - Submit problem reports to admins
- `/api/admin/users` - User management (CRUD)
- `/api/admin/import` - Excel import
- `/api/admin/receiving` - Receiving workflow (bulk add to inventory)
- `/api/admin/transfer` - Transfer inventory between locations
- `/api/admin/notifications` - Admin notifications and mark as read
- `/api/admin/parts` - Admin parts management
- `/api/admin/locations` - Location management
- `/api/admin/inventory` - Direct inventory management
- `/api/admin/moves` - Inventory audit log
- `/api/cron/daily-summary` - Daily summary cron job (requires CRON_SECRET)
- `/api/ai/chat` - AI assistant with Gemini tool-calling (searchParts, filterParts, getPartDetails, getRecentMoves, getLastMoveForPart, listLocations, listCategories, listBrands, getInventoryByLocation, getLowStockParts, getInventorySummaryByJob, getInventorySummaryByBrand)

### Environment Variables

**Required:**
- `DATABASE_URL` - Neon Postgres connection string
- `SESSION_SECRET` - Random string for session encryption (32+ chars)

**Optional (AI Assistant):**
- `GEMINI_API_KEY` - Gemini API key for AI assistant
- `GEMINI_MODEL` - Gemini model (defaults to gemini-1.5-flash)

**Optional (Daily Notifications):**
- `RESEND_API_KEY` - Resend API key for email notifications
- `CRON_SECRET` - Secret for authenticating cron job requests
- `NOTIFICATION_TIMEZONE` - Timezone for daily summaries (e.g., America/New_York)
- `NOTIFICATION_EXTRA_EMAILS` - Additional email addresses for notifications (comma-separated)

### Excel Import Format
The admin import expects workbooks with these sheets:
- **Parts**: `Part_ID`, `Part_Name`, `Color`, `Category`
- **Locations**: `Location_ID`, `Type`, `Zone`
- **Inventory sheets** (any of: `Extrusion_Inventory`, `ACM_Inventory`, `SPL_inventory`, `HPL_Inventory`, `Rivet_Inventory`, `Misc_Inventory`): `Part_ID`, `Part_Name`, `Color`, `Location_ID`, `Quantity`

### Admin Features

**Receiving Workflow**: Streamlined interface for receiving new inventory. Admins can quickly add quantities to parts at specific locations with optional job numbers and notes. The form preserves values between entries for faster bulk receiving.

**Transfer Workflow**: Move inventory between locations with a simple interface. Select part, source location, destination, and quantity. System validates available quantities and prevents negative inventory.

**Notifications System**:
- Daily summary emails with inventory activity stats
- Problem reports submitted by users appear as in-app notifications
- Notifications are tracked per admin user (mark as read/unread)
- Cron job at `/api/cron/daily-summary` generates daily summaries (requires `CRON_SECRET` authentication)

**Problem Reporting**: Users can submit problem reports from any page. Reports are converted to admin notifications for review.

### Styling
UI follows `STYLE_GUIDE.md` - a warm sand/beige theme with Tailwind CSS v4 custom properties and shadcn/ui components. Key colors: `--accent-primary` (warm orange for CTAs), `--accent-secondary` (blue).

### Conventions
- TypeScript with 2-space indentation
- Commits use conventional prefixes: `feat:`, `fix:`, `style:`, `docs:`
- Components: PascalCase; files: kebab-case
- Use path aliases: `@/lib/...`, `@/components/...`
