/**
 * Seed script for static reference data.
 * Run after migrations: pnpm --filter @workspace/db seed
 *
 * Inserts Mexican states only. Events, round types, and formats come from
 * the WCA export via the Flask backend (/update-database).
 * Uses onConflictDoNothing() — safe to re-run at any time.
 */

import { loadEnv } from "./load-env";

loadEnv();

const { db } = await import("./index");
const { state, group } = await import("./schema");
const { MEXICAN_STATES } = await import("./states");

async function seed() {
  console.log("🌱 Seeding reference data...");

  await db.insert(state).values(MEXICAN_STATES).onConflictDoNothing();
  console.log("  ✅ States seeded");

  await db
    .insert(group)
    .values([
      {
        id: "vallarta",
        kind: "community",
        name: "Vallarta Speed",
        description:
          "Comunidad de speedcubing de la zona metropolitana de Puerto Vallarta.",
        regionLabel: "Zona metropolitana de Puerto Vallarta",
        isActive: true,
        sponsorshipStatus: "inactive",
        publicityEnabled: false,
      },
      {
        id: "cubos-dany",
        kind: "sponsor",
        name: "Cubos Dany",
        description: "Equipo patrocinado por Cubos Dany.",
        regionLabel: "Ciudad de México, CDMX",
        isActive: true,
        sponsorshipStatus: "active",
        publicityEnabled: true,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✅ Groups seeded");

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
