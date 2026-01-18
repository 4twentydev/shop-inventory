# Shop Inventory

A fast, kiosk-friendly inventory management system with PIN authentication, Excel import, and AI assistant.

## Features

- **Fast Search**: Quick search across parts by name, ID, color, or category
- **2-Click TAKE/RETURN**: Simple inventory movements with quantity chips (1, 2, 5, 10, custom)
- **PIN Authentication**: Secure access with 4-6 digit PINs and auto-lock after inactivity
- **Excel Import**: Seed inventory data from Excel workbooks
- **AI Assistant**: Natural language queries powered by Gemini ("Where is X?", "What changed today?")
- **Audit Trail**: Full history of all inventory movements with user tracking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Neon Postgres
- **ORM**: Drizzle ORM
- **Package Manager**: Bun
- **AI**: Gemini API with tool-calling
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Neon Postgres database
- Gemini API key (for AI assistant)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/4twentydev/shop-inventory.git
cd shop-inventory
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
DATABASE_URL=postgres://user:password@host/database?sslmode=require
SESSION_SECRET=your-random-secret-key-at-least-32-characters
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-1.5-flash
```

4. Run database migrations:
```bash
bun run db:push
```

5. Create an admin user (using Drizzle Studio or a seed script):
```bash
bun run db:studio
```

6. Start the development server:
```bash
bun dev
```

Visit `http://localhost:3000` to access the application.

## Database Schema

### Tables

- **users**: User accounts with PIN authentication and roles (admin/user)
- **sessions**: Active login sessions
- **parts**: Parts catalog with ID, name, color, category
- **locations**: Storage locations with type and zone
- **inventory**: Part quantities by location (unique part+location)
- **inventory_moves**: Audit log of all movements
- **settings**: Application configuration

### Migrations

Generate migrations after schema changes:
```bash
bun run db:generate
```

Apply migrations:
```bash
bun run db:migrate
```

Push schema directly (development):
```bash
bun run db:push
```

## Excel Import

Admin users can import inventory data from Excel workbooks. The workbook should include:

### Required Sheets

- **Parts**: `Part_ID`, `Part_Name`, `Color`, `Category`
- **Locations**: `Location_ID`, `Type`, `Zone`

### Inventory Sheets (any of these)

- `Extrusion_Inventory`
- `ACM_Inventory`
- `SPL_inventory`
- `HPL_Inventory`
- `Rivet_Inventory`
- `Misc_Inventory`

Each inventory sheet should have: `Part_ID`, `Part_Name`, `Color`, `Location_ID`, `Quantity`

## API Endpoints

### Authentication
- `POST /api/auth/pin` - Login with PIN
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Parts
- `GET /api/parts?query=...` - Search parts
- `GET /api/parts/:partId` - Get part details with inventory

### Inventory
- `POST /api/move` - Record inventory movement (TAKE/RETURN)

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `POST /api/admin/import` - Import Excel file

### AI
- `POST /api/ai/chat` - Chat with AI assistant

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel project settings:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional, defaults to gemini-1.5-flash)

3. Deploy!

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `SESSION_SECRET` | Yes | Random string for session encryption (32+ chars) |
| `GEMINI_API_KEY` | No | Gemini API key (for AI assistant) |
| `GEMINI_MODEL` | No | Gemini model (default: gemini-1.5-flash) |

## Project Structure

```
shop-inventory/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── parts/         # Parts search and details
│   │   ├── move/          # Inventory movements
│   │   ├── admin/         # Admin endpoints
│   │   └── ai/            # AI chat endpoint
│   ├── admin/             # Admin page
│   ├── item/[partId]/     # Part detail page
│   ├── kiosk/             # Main search page
│   └── lock/              # PIN entry page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── kiosk-header.tsx   # Header with menu and lock
│   └── ai-assistant.tsx   # AI chat widget
├── drizzle/
│   └── schema.ts          # Database schema
├── hooks/
│   └── use-toast.ts       # Toast notifications
├── lib/
│   ├── auth.ts            # Authentication utilities
│   ├── db.ts              # Database connection
│   └── utils.ts           # General utilities
└── middleware.ts          # Route protection
```

## License

MIT
