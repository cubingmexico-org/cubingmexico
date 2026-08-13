# Organización — product roadmap

Living plan for [`apps/organizer`](../apps/organizer): evolve from a certificates/badges app into **Organización**, Cubing México’s organizer suite (printables, competition desk, and an **ultimate groups app** that combines [Groupifier](https://github.com/jonatanklosko/groupifier) and [Delegate Dashboard](https://github.com/coder13/delegateDashboard) strengths).

This is a product backlog, not a committed schedule. Adjust phase boundaries after validating groups scope with Mexican organizers.

## Product framing

| Layer                 | Direction                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| **Product name (ES)** | Organización                                                               |
| **Package / folder**  | `apps/organizer`                                                           |
| **Feature routes**    | Keep specific paths: `/certificates`, `/badges`, `/desk`, `/groups` |
| **WCIF**              | **Read-only** (public GET) until Phase 3b write gate                       |

Umbrella brand describes the job (competition ops). Modules stay named after features.

**Grupos thesis:** Replace the common organizer loop of **Delegate Dashboard (edit/assign) → Groupifier (print)** with one in-house module — not a clone of either tool. Reuse Mesa, Gafetes, and Certificados where they already cover staff views and nametags.

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
- **Grupos (3a)**: local WCIF draft, round workspace, group creation, assignment engine, stations, CSV/JSON export (no WCA write yet)

Known gaps (later phases):

- Editors: desktop-only
- Grupos 3b/3c: WCIF write, troubleshooting views, scorecards / task cards

Relevant code:

- App: [`apps/organizer`](../apps/organizer)
- WCIF fetch: [`apps/organizer/db/queries.ts`](../apps/organizer/db/queries.ts)
- Tools catalog: [`apps/web/app/(root)/tools/page.tsx`](<../apps/web/app/(root)/tools/page.tsx>)

---

## Competitive inspiration

Sources: [Groupifier](https://github.com/jonatanklosko/groupifier) ([grouping goals](https://github.com/jonatanklosko/groupifier/blob/master/docs/groups.md), [site](https://groupifier.jonatanklosko.com/)) and [Delegate Dashboard](https://github.com/coder13/delegateDashboard) ([spec](https://github.com/coder13/delegateDashboard/blob/main/spec.md), [group generation](https://github.com/coder13/delegateDashboard/blob/main/docs/group-generation-logic.md)). Algorithms inspire Organización; do not copy source verbatim.

| Capability | Groupifier | Delegate Dashboard | Organización target |
| ---------- | ---------- | ------------------ | ------------------- |
| **Grouping / assignments** | Schedule-aware; one activity at a time; seed by results; keep key staff coverage | Round-centric UX; composable generators (staff → delegates → field → judges); station numbers | **Grupos 3a:** DD-style round workspace + Groupifier conflict/staff goals |
| **Rooms & stages** | Multi-room / simultaneous stages; configurable group counts | Child activities; time-split across groups; multi-stage spread or per-room counts | **Grupos 3a:** create/edit child activities; multi-stage |
| **Staff / roles** | Special handling for staff kinds during assignment | Staff toggles, non-competing staff, person timeline | **Mesa (shipped):** read-only roster; **Grupos 3b:** write-path staffing views |
| **Printables & CSV** | Scorecards, competitor/task cards, nametags | Nametags/scorecards/registrations CSV; Round-1 assignment CSV import; links out to Groupifier for print | **Gafetes (shipped):** nametags/tents; **Grupos 3c:** scorecards + task cards; **3b:** Round-1 CSV import |
| **WCIF write / extensions** | Writes WCIF + `groupifier.*` extensions | Full WCIF save; reads Groupifier extensions; `delegateDashboard.groups` | **Grupos 3b:** subset PATCH behind check gate; read foreign extensions; Organización extension only if needed |
| **Scrambles** | — | Scrambler schedule by room/day; scramble set picks | **Grupos 3b:** scrambler-by-room view; **3c:** TNoodle handoff (not a scrambler rewrite) |

### Already covered vs still needed

- **Mesa** covers DD-style staff roster + registration overview (read-only).
- **Gafetes** covers nametags / tent cards (partial Groupifier printing).
- **Grupos 3a** covers group creation, assignment engine, conflict checks, stations, local CSV/JSON export.
- **Still needed:** WCIF write, scorecards/task docs, assignment troubleshooting views, Round-1 CSV import.

### Non-goals (Grupos v1–v2)

- Full schedule / event editor (WCA website)
- Danger JSON WCIF editor
- WCIF JSONPath explorer
- First-timer exact-name matching tool
- Rewriting TNoodle

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

Mesa lives at `/desk/[competitionId]` with tabs **Staff** | **Inscripciones**. Tent cards are canvas presets inside Gafetes (`module: badges`). Overlaps DD Staff page in read-only form; write-path staffing stays in Grupos.

| Feature                           | Module  | Status | Why                                                      | Implementation                                                  | Depends      |
| --------------------------------- | ------- | ------ | -------------------------------------------------------- | --------------------------------------------------------------- | ------------ |
| Staff & roles roster              | Mesa    | done   | WCIF `roles` only used for badge grouping/mentions today | Table by role; CSV export; Mexico state column                  | home-hub     |
| Station / table tent cards        | Gafetes | done   | Natural extension of badge canvas                        | Size presets + starter tent layouts; same export pipeline       | home-hub     |
| Registration overview (read-only) | Mesa    | done   | Day-of snapshot without replacing WCA registration       | Persons table: competing, events, country, state; no WCIF PATCH | staff-roster |

### Phase 3 — Grupos (ultimate groups)

**Goal:** In-house grouping, staffing, printables, and optional WCIF write — the DD → Groupifier loop in one module. Ship as milestones **3a → 3b → 3c**.

#### Phase 3a — Core assignment workspace

**Goal:** Round-centric local draft (DD UX) with Groupifier-quality constraints. No WCA write yet.

| Feature                          | Module | Status  | Why                                              | Implementation                                                                                                                         | Depends                  |
| -------------------------------- | ------ | ------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Groups route + nav               | Grupos | done    | Suite needs a groups entry point                  | `/groups/[competitionId]`; add to `CompetitionModuleNav`                                                                               | home-hub, competition-nav |
| Local WCIF draft                 | Grupos | done    | Edit safely before any PATCH                      | Public GET → in-memory draft; unsaved-changes affordance                                                                               | wcif-types               |
| Round workspace + group creation | Grupos | done    | DD round UX is the mental model organizers know   | Round selector; group count; create child activities; multi-stage spread / per-room; time-split                                        | local-draft              |
| Assignment generation engine     | Grupos | done    | Core organizer pain; MX workflows                 | Pipeline inspired by DD order (staff → delegates → field → judges) + Groupifier goals (no double-booking; seed by results; key staff) | round-workspace          |
| Manual edit + conflicts          | Grupos | done    | Auto-assign is a start, not the finish            | Drag/edit assignments; surface overlaps / overfull groups; reset group or assignment scopes                                            | groups-engine            |
| Stations + export                | Grupos | done    | Day-of needs stations; write comes later          | Station numbers once assignments exist; JSON/CSV export                                                                                | groups-engine            |

#### Phase 3b — Day-of staffing views + WCIF write gate

**Goal:** Troubleshooting views, Round-1 CSV import, and optional push to WCA behind schema check.

| Feature                              | Module | Status  | Why                                         | Implementation                                                                                                                   | Depends                    |
| ------------------------------------ | ------ | ------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Person timeline + troubleshooting    | Grupos | planned | Find orphan / unknown assignments fast      | Person assignment timeline by start time; assignments list by stage/group; flag unmatched activity IDs                           | groups-engine              |
| Scrambler schedule view              | Grupos | planned | DD scrambler-by-room is useful day-of       | Group scrambler assignments by room and day; link to person detail                                                               | groups-engine              |
| Round-1 CSV import                   | Grupos | planned | Many comps pre-plan R1 in spreadsheets      | Validate CSV → generate missing groups → import assignments (R1 only)                                                            | round-workspace            |
| Optional WCIF PATCH                  | Data   | planned | Push groups/assignments back to WCA         | Subset PATCH: `persons[].assignments` + child activities; preflight `PUT …/wcif/check`; surface JSON `error`                     | groups-engine, 3a-export   |
| Extension compatibility              | Data   | planned | Interop with comps already in Groupifier/DD | Read `groupifier.ActivityConfig` / `delegateDashboard.groups` when present; write Organización-owned extension only if required | wcif-write                 |

#### Phase 3c — Printables & handoff

**Goal:** Close Groupifier’s document moat; light scramble handoff; demote external tools once parity lands.

| Feature                         | Module  | Status  | Why                                      | Implementation                                                                                          | Depends           |
| ------------------------------- | ------- | ------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| Scorecards PDF                  | Grupos  | planned | Groupifier’s main remaining reason to use | pdfmake (patterns from Certificados); per-round / blank later-round flows                               | groups-engine     |
| Competitor task cards / sheets  | Grupos  | planned | Staff + compete assignments on paper     | Group sheets and per-person task cards                                                                  | groups-engine     |
| Gafetes group/station wiring    | Gafetes | planned | Nametags already ship; need group data   | Feed group + station into badge export (existing competition-groups QR hooks)                           | groups-engine     |
| Scramble set / TNoodle handoff  | Grupos  | planned | Light integration, not a scrambler       | Export metadata aligned with `rounds.scrambleSetCount`; deep-link TNoodle                               | groups-engine     |
| External tool demotion          | Web     | planned | Tools page still lists only Groupifier   | Keep Groupifier/DD links until print parity; then mark Organización Grupos as in-house (Phase 4 tools) | scorecards, 3b    |

#### WCIF write gate

WCA applies stricter WCIF schema checks on save (no unknown keys, correct types). Any assignments / activities PATCH must:

1. Send only the allowed subset of WCIF
2. Preflight with `PUT /api/v0/competitions/wcif/check`
3. Display the API `error` field to the user on failure

### Phase 4 — Platform

**Goal:** Suite maturity — mobile desk, permissions, Mexico differentiation, public catalog, onboarding.

| Feature                       | Module | Status  | Why                                                    | Implementation                                                                                                                                                                                                                                                                                                                                                          | Depends                        |
| ----------------------------- | ------ | ------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Guided product tour           | Shell  | planned | New organizers need a path through hub + modules       | [Dice UI Tour](https://diceui.com/docs/components/radix/tour) via `pnpm dlx shadcn@latest add @diceui/tour` into `@workspace/ui`; shell-wide steps on hub + `CompetitionModuleNav`; per-module steps (Certificados / Gafetes / Mesa / **Grupos**); first-run + skip/replay (localStorage first; Spanish copy) | home-hub, competition-nav      |
| Mobile-friendly desk views    | Shell  | planned | Heavy editors block mobile; desk needs phones          | Keep designers desktop; make read/select/export flows responsive                                                                                                                                                                                                                                                                                                        | checkin-read                   |
| Fine-grained roles            | Shell  | planned | Helpers print badges without editing groups            | Map WCA roles + optional local grants; per-module route guards                                                                                                                                                                                                                                                                                                          | collab, wcif-write             |
| Mexico-specific packs         | México | planned | Differentiate vs global Groupifier/Badgifier           | State teams branding; bilingual templates (incl. scorecard / task-card copy); AMS cross-links from web                                                                                                                                                                                                                                                                  | shared-templates, scorecards   |
| Update cubingmexico.net/tools | Web    | planned | Stale certs repo link; only external Groupifier listed | List Organización modules (incl. Grupos); correct monorepo GitHub link; mark in-house vs external Groupifier / Delegate Dashboard                                                                                                                                                                                                                                       | rename, grupos-print-parity    |

> Note: Phase 4 “Update tools” partially started in Phase 0 (Organización entry + monorepo link). Remaining: mark in-house vs external more clearly as modules ship. Guided tour can ship in parallel with Phase 3a (no write/print dependency).

---

## Suggested build order

1. ~~**Phase 0** — rename + enable age/newcomer + hub nav~~
2. ~~**Phase 1** — DB-backed design save + shared templates~~
3. ~~**Phase 2** — staff roster + tent cards + desk overview~~
4. ~~**Phase 3a** — groups route + local draft + round workspace + assignment engine + CSV/JSON export~~
5. **Phase 3b** — troubleshooting views + Round-1 CSV import + WCIF check/PATCH
6. **Phase 3c** — scorecards / task cards + Gafetes wiring + TNoodle handoff
7. **Phase 4** — guided tour (can land in parallel with 3a), mobile desk, RBAC, MX packs, tools page polish

## Architecture sketch

```
Organización (shell)
├── Auth          Better Auth + WCA OAuth (manage_competitions)
├── Hub           Managed competitions + module nav + shared WCIF cache
│                 (+ guided tour anchors: hub cards, CompetitionModuleNav;
│                  per-module step sets: Certificados / Gafetes / Mesa / Grupos)
├── Certificados  TipTap + pdfmake
├── Gafetes       Canvas 2D + jsPDF / ZIP (+ tent-card presets;
│                 group/station fields from Grupos in 3c)
├── Mesa (/desk)  Staff roster + registration overview (read-only WCIF;
│                 overlaps DD Staff without write)
├── Grupos (/groups)
│   ├── 3a  Round workspace, child activities, assignment engine, stations, export
│   ├── 3b  Person/scrambler views, R1 CSV import, WCIF check/PATCH
│   └── 3c  Scorecards, task cards, TNoodle handoff
└── Data
    ├── WCA public WCIF GET (today)
    ├── WCA WCIF check + subset PATCH (Phase 3b)
    ├── Cubing México API (states / competitor-states)
    └── @workspace/db designs table (Phase 1 — shipped)
```

## Related docs

- [`web-hosting-constraints.md`](./web-hosting-constraints.md) — Vercel free-tier limits for `apps/web`
- [`registros-estatales.md`](./registros-estatales.md) — state records; notes WCIF schedule for round end times (web/backend, not Organización)
- [Groupifier](https://github.com/jonatanklosko/groupifier) — task/group management + printables inspiration
- [Delegate Dashboard](https://github.com/coder13/delegateDashboard) — round/assignment UX + WCIF edit inspiration
