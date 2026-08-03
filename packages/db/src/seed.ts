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

async function seed() {
  console.log("🌱 Seeding reference data...");

  await db
    .insert(state)
    .values([
      { id: "AGU", name: "Aguascalientes" },
      { id: "BCN", name: "Baja California" },
      { id: "BCS", name: "Baja California Sur" },
      { id: "CAM", name: "Campeche" },
      { id: "CHP", name: "Chiapas" },
      { id: "CHH", name: "Chihuahua" },
      { id: "COA", name: "Coahuila" },
      { id: "COL", name: "Colima" },
      { id: "CMX", name: "Ciudad de México" },
      { id: "DUR", name: "Durango" },
      { id: "GUA", name: "Guanajuato" },
      { id: "GRO", name: "Guerrero" },
      { id: "HID", name: "Hidalgo" },
      { id: "JAL", name: "Jalisco" },
      { id: "MEX", name: "Estado de México" },
      { id: "MIC", name: "Michoacán" },
      { id: "MOR", name: "Morelos" },
      { id: "NAY", name: "Nayarit" },
      { id: "NLE", name: "Nuevo León" },
      { id: "OAX", name: "Oaxaca" },
      { id: "PUE", name: "Puebla" },
      { id: "QUE", name: "Querétaro" },
      { id: "ROO", name: "Quintana Roo" },
      { id: "SLP", name: "San Luis Potosí" },
      { id: "SIN", name: "Sinaloa" },
      { id: "SON", name: "Sonora" },
      { id: "TAB", name: "Tabasco" },
      { id: "TAM", name: "Tamaulipas" },
      { id: "TLA", name: "Tlaxcala" },
      { id: "VER", name: "Veracruz" },
      { id: "YUC", name: "Yucatán" },
      { id: "ZAC", name: "Zacatecas" },
    ])
    .onConflictDoNothing();

  console.log("  ✅ States seeded");
  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
