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
const { state } = await import("./schema");
const { MEXICAN_STATES } = await import("./states");

async function seed() {
  console.log("🌱 Seeding reference data...");

  await db.insert(state).values(MEXICAN_STATES).onConflictDoNothing();

  console.log("  ✅ States seeded");
  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
