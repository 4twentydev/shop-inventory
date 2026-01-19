# Shop Inventory

A fast, kiosk-friendly inventory management system with PIN authentication, Excel import, and an AI assistant for quick answers.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Tutorial PDFs](#tutorial-pdfs)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Run the App](#run-the-app)
- [Roles & Access](#roles--access)
- [Daily Workflows](#daily-workflows)
  - [Admins](#admins)
  - [Users](#users)
- [Excel Import Guide](#excel-import-guide)
- [AI Assistant](#ai-assistant)
- [API Endpoints](#api-endpoints)
- [Operational Notes](#operational-notes)
  - [Security & Session Behavior](#security--session-behavior)
  - [Data Quality Checklist](#data-quality-checklist)
  - [Troubleshooting](#troubleshooting)
- [Scripts & Maintenance](#scripts--maintenance)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [License](#license)

## Overview

Shop Inventory helps teams track parts in real time from a kiosk-friendly UI. Users can search and record TAKE/RETURN movements in seconds. Admins can onboard users, import inventory from Excel, and review audit history.

## Features

- **Fast Search**: Query by part name, ID, color, or category.
- **2-Click TAKE/RETURN**: Record inventory movements with quantity chips (1, 2, 5, 10, custom).
- **PIN Authentication**: Secure access with 4-6 digit PINs and auto-lock after inactivity.
- **Excel Import**: Seed parts, locations, and counts from workbooks.
- **AI Assistant**: Natural language queries powered by Gemini ("Where is X?", "What changed today?").
- **Audit Trail**: Full history of all inventory movements with user tracking.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Neon Postgres
- **ORM**: Drizzle ORM
- **Package Manager**: Bun
- **AI**: Gemini API with tool-calling
- **Deployment**: Vercel

## Tutorial PDFs

- **Admin Tutorial**: `docs/tutorials/admin-tutorial.pdf`
- **User Tutorial**: `docs/tutorials/user-tutorial.pdf`

These PDFs provide printable quick-start instructions for both roles.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Neon Postgres database
- Gemini API key (optional, for AI assistant)

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

3. Copy the environment template:

```bash
cp .env.example .env.local
```

### Environment Variables

Fill in `.env.local` with your credentials:

```env
DATABASE_URL=postgres://user:password@host/database?sslmode=require
SESSION_SECRET=your-random-secret-key-at-least-32-characters
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-1.5-flash
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `SESSION_SECRET` | Yes | Random string for session encryption (32+ chars) |
| `GEMINI_API_KEY` | No | Gemini API key (for AI assistant) |
| `GEMINI_MODEL` | No | Gemini model (default: gemini-1.5-flash) |

### Database Setup

Push the schema to your database:

```bash
bun run db:push
```

Optional workflows:

- Generate migrations:
  ```bash
  bun run db:generate
  ```
- Apply migrations:
  ```bash
  bun run db:migrate
  ```

### Run the App

```bash
bun dev
```

Open `http://localhost:3000` to use the kiosk.

## Roles & Access

- **Admins** can manage users, import Excel files, and review audit data.
- **Users** can search parts and record inventory movements.
- **Sessions** auto-lock after inactivity to protect shared kiosks.

## Daily Workflows

### Admins

1. **Sign in** with an admin PIN at `/lock`.
2. **Open Admin** from the header menu.
3. **Users**: create or update user accounts and roles.
4. **Import**: upload the latest Excel workbook for bulk updates.
5. **Validate**: spot-check inventory counts and locations.
6. **Audit**: review the movement history to resolve discrepancies.

### Users

1. **Sign in** with your PIN at `/lock`.
2. **Search** by part name, ID, color, or category.
3. **Select a part** to see details and available locations.
4. **Choose TAKE or RETURN** and a quantity chip.
5. **Confirm** to update the inventory immediately.

## Excel Import Guide

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

Each inventory sheet should have: `Part_ID`, `Part_Name`, `Color`, `Location_ID`, `Quantity`.

### Import Tips

- Ensure Part IDs and Location IDs match the required sheets.
- Keep categories consistent to improve search results.
- Run a small test import first if you are adding new sheets.

## AI Assistant

When enabled, the AI assistant can answer questions such as:

- "Where is part A123 stored?"
- "What inventory moved today?"
- "Show low-stock items in Zone B."

The assistant uses tool-calling with the Gemini API. If you do not set a Gemini API key, the app runs without the AI features.

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

## Operational Notes

### Security & Session Behavior

- PINs are required for both admins and users.
- Sessions auto-lock after inactivity to protect kiosk devices.
- Use a strong `SESSION_SECRET` in production.

### Data Quality Checklist

- Verify a sample of imports after each Excel update.
- Keep categories, zones, and colors consistent.
- Review audit logs weekly to detect anomalies.

### Troubleshooting

- **Login issues**: Confirm the user exists and PIN length is 4-6 digits.
- **Missing parts**: Validate that the part exists in the Parts sheet.
- **Incorrect counts**: Check recent moves in the audit log.
- **AI errors**: Ensure `GEMINI_API_KEY` is configured and the model name is valid.

## Scripts & Maintenance

- `bun run lint` - Run ESLint.
- `bun run db:push` - Push schema changes (development).
- `bun run db:generate` - Generate migrations.
- `bun run db:migrate` - Apply migrations.
- `bun run db:studio` - Open Drizzle Studio UI.
- `bun run db:seed` - Seed an admin user (requires `DATABASE_URL`).

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
├── docs/
│   └── tutorials/         # Printable admin/user tutorial PDFs
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

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel.
2. Add environment variables in Vercel project settings.
3. Deploy.

### Production Checklist

- Set `DATABASE_URL` and `SESSION_SECRET`.
- Configure `GEMINI_API_KEY` (optional).
- Verify the database migrations are applied.
- Validate kiosk devices auto-lock as expected.

## License

MIT
