# Cubing México

A comprehensive web platform for managing and displaying WCA (World Cube Association) competitions, rankings, records, and community information.

## Features

- **Competitions** - Browse WCA competitions
- **Rankings** - View cuber rankings across different events
- **Records** - Track national and regional records
- **Community** - Delegates, organizers, members, and state teams
- **Statistics** - Kinch scores and SOR (Sum of Ranks)
- **Maps** - Interactive maps with Leaflet
- **File Uploads** - UploadThing for team media
- **Authentication** - Better Auth with WCA OAuth
- **Theming** - Dark mode support
- **Responsive** - Mobile-friendly design

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 10.4.1 or higher
- PostgreSQL database

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# WCA OAuth
WCA_CLIENT_ID="..."
WCA_CLIENT_SECRET="..."

# UploadThing
UPLOADTHING_TOKEN="..."
```

### Installation

From the monorepo root:

```bash
pnpm install
```

### Database Setup

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

### Development

```bash
# From the monorepo root
pnpm --filter web dev

# Or from this directory
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quality checks

```bash
pnpm lint
pnpm check-types
pnpm test
```

### Build

```bash
pnpm --filter web build
pnpm start
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Better Auth (WCA OAuth)
- **UI Components:** Radix UI, shadcn/ui, @workspace/ui
- **Styling:** Tailwind CSS
- **Tables:** TanStack Table
- **File Uploads:** UploadThing
- **Maps:** Leaflet, React Leaflet
- **Charts/Motion:** Motion
- **State Management:** nuqs (URL state)
- **Icons:** Lucide React, @cubing/icons
- **Analytics:** Vercel Analytics & Speed Insights
- **Data Processing:** PapaParse, JSZip
- **Validation:** Zod

## Project Structure

```
apps/web/
├── app/                 # Next.js App Router pages and API routes
├── components/          # Shared UI components
├── db/                  # App-level database queries
├── lib/                 # Auth, cache tags, validations, helpers
└── config/              # App configuration
```

## License

Private — Cubing México
