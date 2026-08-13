# Organización

Cubing México organizer suite: design and export **certificates** and **badges** for WCA competitions, with more desk/ops modules planned.

Product roadmap: [`docs/organizacion-roadmap.md`](../../docs/organizacion-roadmap.md)

## Features

- Rich text certificates (TipTap + pdfmake) for podium and participation
- Badge canvas designer with ZIP / PDF export
- Age and newcomer podium filters
- WCA OAuth (`manage_competitions`) via Better Auth
- Public WCIF integration + Mexico state enrichment on badges

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 10.4.1 or higher

### Installation

From the monorepo root:

```bash
pnpm install
```

### Development

```bash
# From the monorepo root
pnpm --filter organizer dev

# Or
pnpm dev:organizer
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm --filter organizer build
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- TipTap, pdfmake, jsPDF, Zustand, SWR, Better Auth
- Shared `@workspace/ui` and `@workspace/icons`

## Project Structure

```
apps/organizer/
├── app/
│   ├── (root)/
│   │   ├── certificates/[competitionId]/
│   │   ├── badges/[competitionId]/
│   │   └── page.tsx
│   └── api/
├── components/
├── data/
├── lib/
└── types/
```
