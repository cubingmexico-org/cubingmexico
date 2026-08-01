# Cubing México Web Frontend

A modern monorepo containing multiple web applications and shared packages for the Cubing México ecosystem.

## 📦 Monorepo Structure

This is a **Turborepo** monorepo managed with **pnpm workspaces**.

### Applications

- **[web](./apps/web)** - Main web application with competition management features (Next.js 16)
- **[backend](./apps/backend)** - Python Flask service for WCA TSV processing, state ranks, and computation endpoints
- **[wca-certificates](./apps/wca-certificates)** - Design and print participation and podium certificates for WCA competitions

### Packages

- **[@workspace/db](./packages/db)** - Shared Drizzle schema, migrations, and seed (source of truth for Postgres)
- **[@workspace/ui](./packages/ui)** - Shared UI component library built with shadcn/ui and Radix UI
- **[@workspace/icons](./packages/icons)** - Centralized icon components
- **[@workspace/eslint-config](./packages/eslint-config)** - Shared ESLint configurations
- **[@workspace/typescript-config](./packages/typescript-config)** - Shared TypeScript configurations

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** 10.4.1 (defined in `packageManager`)

### Installation

Install dependencies for all apps and packages:

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Run a specific app:

```bash
# WCA Certificates app
pnpm --filter wca-certificates dev

# Main web app
pnpm --filter web dev
```

### Build

Build all apps and packages:

```bash
pnpm build
```

Build a specific app:

```bash
pnpm --filter wca-certificates build
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5.7
- **Package Manager:** pnpm
- **Build System:** Turborepo
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Database:** Drizzle ORM (web app)
- **Authentication:** Better Auth (wca-certificates), NextAuth (web)

## 📝 Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all apps and packages
- `pnpm format` - Format code with Prettier

## 🎨 Working with UI Components

### Adding shadcn/ui Components

Add components to the shared UI package:

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

This places components in `packages/ui/src/components/ui/`.

### Using UI Components

Import components from the `@workspace/ui` package:

```tsx
import { Button } from "@workspace/ui/components/ui/button";
```

## 📚 Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Next.js Documentation](https://nextjs.org/docs)
