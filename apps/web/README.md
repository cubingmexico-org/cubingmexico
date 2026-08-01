# Cubing México

A comprehensive web platform for managing and displaying WCA (World Cube Association) competitions, rankings, records, and community information.

## ✨ Features

- 🏆 **Competitions** - Browse and manage WCA competitions
- 📊 **Rankings** - View cuber rankings across different events
- 🎯 **Records** - Track national and regional records
- 👥 **Community** - Manage delegates, organizers, members, and teams
- 📈 **Statistics** - Analytics with Kinch scores and SOR (Sum of Ranks)
- 🗺️ **Maps** - Interactive maps with Leaflet integration
- 📤 **File Uploads** - UploadThing integration for file management
- 🔐 **Authentication** - Secure authentication with NextAuth
- 🌗 **Theming** - Dark mode support
- 📱 **Responsive** - Mobile-friendly design

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 10.4.1 or higher
- PostgreSQL database

### Environment Variables

Create a `.env.local` file with required environment variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true

# UploadThing
UPLOADTHING_SECRET="..."
UPLOADTHING_APP_ID="..."

# Add other required environment variables
```

### Installation

From the monorepo root:

```bash
pnpm install
```

### Database Setup

Generate database migrations:

```bash
pnpm db:generate
```

Run migrations:

```bash
pnpm db:migrate
```

Open Drizzle Studio to view/edit data:

```bash
pnpm db:studio
```

### Development

Run the development server:

```bash
# From the monorepo root
pnpm --filter web dev

# Or from this directory
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

Build for production:

```bash
# From the monorepo root
pnpm --filter web build

# Or from this directory
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** NextAuth v5
- **UI Components:** Radix UI, shadcn/ui, @workspace/ui
- **Styling:** Tailwind CSS
- **Tables:** TanStack Table
- **File Uploads:** UploadThing
- **Maps:** Leaflet, React Leaflet
- **Charts/Motion:** Motion (Framer Motion)
- **State Management:** nuqs (URL state)
- **Icons:** Lucide React, @cubing/icons
- **Analytics:** Vercel Analytics & Speed Insights
- **Data Processing:** PapaParse, JSZip
- **Markdown:** React Markdown

## 📁 Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (root)/            # Main application routes
│   │   ├── about/        # About pages
│   │   ├── competitions/ # Competition management
│   │   ├── delegates/    # Delegate information
│   │   ├── faq/          # FAQ pages
│   │   ├── kinch/        # Kinch rankings
│   │   ├── members/      # Member directory
│   │   ├── organizers/   # Organizer information
│   │   ├── persons/      # Person profiles
│   │   ├── profile/      # User profiles
│   │   ├── rankings/     # Rankings pages
│   │   ├── records/      # Records tracking
│   │   ├── sor/          # Sum of Ranks
│   │   ├── teams/        # Team information
│   │   └── tools/        # Utility tools
│   ├── api/              # API routes
│   ├── actions.ts        # Server actions
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/           # React components
├── config/              # Configuration files
├── db/                  # App-specific DB query helpers (schema lives in @workspace/db)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
├── public/              # Static assets
└── types/               # TypeScript type definitions
```

Schema, migrations, and seed live in [`packages/db`](../../packages/db) (`@workspace/db`).

## 🗄️ Database Scripts

From `apps/web` (proxies to `@workspace/db`):

```bash
# Generate new migration from schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Seed Mexican states
pnpm db:seed

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

Or from the monorepo root: `pnpm --filter @workspace/db migrate`

## 🎨 Key Features Explained

### Competition Management

Browse and manage WCA competitions with:

- Competition listings and details
- Registration information
- Results tracking
- Competition schedules

### Rankings & Records

Track performance with:

- Event-specific rankings
- National and regional records
- Historical data
- Kinch rankings
- Sum of Ranks (SOR) calculations

### Community Features

Manage community members including:

- Delegate profiles and responsibilities
- Organizer information
- Team management
- Member directory
- Personal profiles

### Interactive Maps

View competitions and locations with:

- Leaflet-powered interactive maps
- Location-based filtering
- Geocoding integration

## 🔧 Configuration

Configuration files:

- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- Shared DB schema/migrations: [`packages/db`](../../packages/db) (`@workspace/db`)
- `eslint.config.js` - ESLint rules
- `postcss.config.mjs` - PostCSS configuration
- `components.json` - shadcn/ui configuration
- `auth.ts` - NextAuth configuration

## 📦 Key Dependencies

- Next.js and React 19
- Drizzle ORM for database operations
- NextAuth for authentication
- TanStack Table for data tables
- Leaflet for maps
- UploadThing for file uploads
- Motion for animations
- Vercel Analytics and Speed Insights

See [package.json](./package.json) for the complete list.

## 🤝 Contributing

This is part of a private monorepo. Please coordinate with the team before making changes.
