# Organización — product roadmap

Living plan for [`apps/organizer`](../apps/organizer): evolve from a certificates/badges app into **Organización**, Cubing México’s organizer suite (printables, competition desk, and Groupifier-class tools).

This is a product backlog, not a committed schedule. Adjust phase boundaries after validating groups scope with Mexican organizers.

## Product framing

| Layer                 | Direction                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| **Product name (ES)** | Organización                                                               |
| **Package / folder**  | `apps/organizer`                                                           |
| **Feature routes**    | Keep specific paths: `/certificates`, `/badges`, `/desk`, later `/groups` |
| **WCIF**              | **Read-only** (public GET) until Phase 3 write gate                        |

Umbrella brand describes the job (competition ops). Modules stay named after features.

## Current baseline (what already ships)

- WCA OAuth via Better Auth (`manage_competitions`)
- Home: competitions managed by the signed-in user
- **Certificados**: podium + participation PDFs (TipTap + pdfmake), including age / newcomer templates
- **Gafetes**: canvas designer + ZIP/PDF export (jsPDF)
- Competition module nav (Certificados \| Gafetes \| Mesa)
- Mexico state enrichment on badges and desk
- Public WCIF read (`…/wcif/public`)
- Shared 1-month availability window based on `results_posted_at`
- Cloud design save/load (Neon `designs`) + Cubing México certificate templates + co-organizer ACL
- **Mesa**: staff roles roster + registration overview (CSV export)
- Tent / table-card canvas presets inside Gafetes

Known gaps (later phases):

- Editors: desktop-only
- Groups module not started

Relevant code:

- App: [`apps/organizer`](../apps/organizer)
- WCIF fetch: [`apps/organizer/db/queries.ts`](../apps/organizer/db/queries.ts)
- Tools catalog: [`apps/web/app/(root)/tools/page.tsx`](<../apps/web/app/(root)/tools/page.tsx>)

---

## Phases

### Phase 0 — Foundation

**Goal:** Rename + harden what exists so certificates/badges sit under Organización branding.

| Feature                                | Module       | Status | Why                                               | Implementation                                                                                        | Depends |
| -------------------------------------- | ------------ | ------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| Rename to Organización                 | Shell        | done   | App already ships badges; roadmap is a full suite | Package `apps/organizer`; header/domain copy; tools page + README; keep `/certificates` and `/badges` | —       |
| Enable age + newcomer podium templates | Certificados | done   | API already filtered; UI was disabled             | Enabled SelectItems; clearer CSV copy; shared `results_posted_at` cutoff                              | —       |
| Dead code & dep cleanup                | Shell        | done   | Less confusion before new modules                 | Removed unused TipTap badge data, fake-result helpers, unused deps                                    | —       |
| WCIF type accuracy (read path)         | Data         | done   | Local types drifted from WCIF stable 1.1          | Aligned types + documented consumed fields; public GET only                                           | —       |
| Competition hub nav                    | Shell        | done   | Suite needs a module switcher                     | `CompetitionModuleNav` on certificate/badge pages                                                     | rename  |

### Phase 1 — Persistence & sharing

**Goal:** Designs that survive the browser — shared templates, competition-scoped saves.

| Feature                                    | Module     | Status | Why                                                       | Implementation                                                                                          | Depends      |
| ------------------------------------------ | ---------- | ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| Cloud save for certificate & badge designs | Data       | done   | JSON download/upload does not scale for multi-staff comps | Neon via `@workspace/db`: `designs(competitionId, userId, module, json, updatedAt)`; list/load/save API | home-hub     |
| Org / Mexico template library              | Printables | done   | Reuse AMS / Cubing México branded defaults                | `isPublic` + `ownerScope` (`user` \| `org` \| `global`); clone-to-competition; JSON schema version      | save-designs |
| Co-organizer access                        | Shell      | done   | All managers of a comp should see designs                 | Authorize via WCA organizers/delegates; share by `competitionId`, not only `userId`                     | save-designs |

### Phase 2 — Competition desk

**Goal:** Day-of operations without writing WCIF yet.

Mesa lives at `/desk/[competitionId]` with tabs **Staff** | **Inscripciones**. Tent cards are canvas presets inside Gafetes (`module: badges`).

| Feature                           | Module  | Status | Why                                                      | Implementation                                                  | Depends      |
| --------------------------------- | ------- | ------ | -------------------------------------------------------- | --------------------------------------------------------------- | ------------ |
| Staff & roles roster              | Mesa    | done   | WCIF `roles` only used for badge grouping/mentions today | Table by role; CSV export; Mexico state column                  | home-hub     |
| Station / table tent cards        | Gafetes | done   | Natural extension of badge canvas                        | Size presets + starter tent layouts; same export pipeline       | home-hub     |
| Registration overview (read-only) | Mesa    | done   | Day-of snapshot without replacing WCA registration       | Persons table: competing, events, country, state; no WCIF PATCH | staff-roster |

### Phase 3 — Groups (Groupifier-class)

**Goal:** In-house grouping/staffing; optional WCIF write only after schema validation.

| Feature                           | Module | Status  | Why                                   | Implementation                                                                                              | Depends                    |
| --------------------------------- | ------ | ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| Group assignment engine (v1)      | Grupos | planned | Core organizer pain; MX workflows     | New module: WCIF persons/events/schedule in; generate groups; local edit; export JSON/CSV first             | staff-roster, wcif-types   |
| Schedule-aware grouping           | Grupos | planned | WCIF `schedule` typed but unused      | Parse venues/rooms/activities; conflict checks; activity ↔ group linking                                    | groups-core                |
| Optional WCIF PATCH (assignments) | Data   | planned | Push groups back to WCA               | Subset PATCH `persons[].assignments`; preflight `PUT /api/v0/competitions/wcif/check`; surface JSON `error` | groups-core, schedule-view |
| Scramble set / TNoodle handoff    | Grupos | planned | Light integration with existing tools | Export metadata aligned with `rounds.scrambleSetCount`; docs deep-link — not a scrambler rewrite            | groups-core                |

#### WCIF write gate

WCA now applies stricter WCIF schema checks on save (no unknown keys, correct types). Any assignments PATCH must:

1. Send only the allowed subset of WCIF
2. Preflight with `PUT /api/v0/competitions/wcif/check`
3. Display the API `error` field to the user on failure

### Phase 4 — Platform

**Goal:** Suite maturity — mobile desk, permissions, Mexico differentiation, public catalog, onboarding.

| Feature                       | Module | Status  | Why                                                    | Implementation                                                                                                                                                                                                                                                                                                                                 | Depends                        |
| ----------------------------- | ------ | ------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Guided product tour           | Shell  | planned | New organizers need a path through hub + modules       | [Dice UI Tour](https://diceui.com/docs/components/radix/tour) via `pnpm dlx shadcn@latest add @diceui/tour` into `@workspace/ui`; shell-wide steps on hub + `CompetitionModuleNav` (`data-tour` / `id` targets); reusable per-module step configs (Certificados / Gafetes / Mesa); first-run + skip/replay (localStorage first; Spanish copy) | home-hub, competition-nav      |
| Mobile-friendly desk views    | Shell  | planned | Heavy editors block mobile; desk needs phones          | Keep designers desktop; make read/select/export flows responsive                                                                                                                                                                                                                                                                               | checkin-read                   |
| Fine-grained roles            | Shell  | planned | Helpers print badges without editing groups            | Map WCA roles + optional local grants; per-module route guards                                                                                                                                                                                                                                                                                 | collab, wcif-write             |
| Mexico-specific packs         | México | planned | Differentiate vs global Groupifier/Badgifier           | State teams branding; bilingual templates; AMS cross-links from web                                                                                                                                                                                                                                                                            | shared-templates               |
| Update cubingmexico.net/tools | Web    | planned | Stale certs repo link; only external Groupifier listed | List Organización modules; correct monorepo GitHub link; mark in-house vs external                                                                                                                                                                                                                                                             | rename                         |

> Note: Phase 4 “Update tools” partially started in Phase 0 (Organización entry + monorepo link). Remaining: mark in-house vs external more clearly as modules ship. Guided tour can ship in parallel with Phase 3 (no Groups dependency).

---

## Suggested build order

1. ~~**Phase 0** — rename + enable age/newcomer + hub nav~~
2. ~~**Phase 1** — DB-backed design save + shared templates~~
3. ~~**Phase 2** — staff roster + tent cards + desk overview~~
4. **Phase 3** — groups engine → schedule → WCIF check/PATCH
5. **Phase 4** — guided tour (can land in parallel with Phase 3), mobile desk, RBAC, MX packs, tools page polish

## Architecture sketch

```
Organización (shell)
├── Auth          Better Auth + WCA OAuth (manage_competitions)
├── Hub           Managed competitions + module nav + shared WCIF cache
│                 (+ guided tour anchors: hub cards, CompetitionModuleNav;
│                  per-module step sets for Certificados / Gafetes / Mesa)
├── Certificados  TipTap + pdfmake
├── Gafetes       Canvas 2D + jsPDF / ZIP (+ tent-card presets)
├── Mesa (/desk)  Staff roster + registration overview (read-only WCIF)
├── Grupos        Assignment engine; write path behind wcif-check (Phase 3)
└── Data
    ├── WCA public WCIF GET (today)
    ├── Cubing México API (states / competitor-states)
    └── @workspace/db designs table (Phase 1 — shipped)
```

## Related docs

- [`web-hosting-constraints.md`](./web-hosting-constraints.md) — Vercel free-tier limits for `apps/web`
- [`registros-estatales.md`](./registros-estatales.md) — state records; notes WCIF schedule for round end times (web/backend, not Organización)
