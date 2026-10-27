import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// Read by the backend's tests/test_schema_columns.py, which checks its raw SQL against it.
const OUTPUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/schema/columns.json",
);

function schemaColumns(): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const { name, columns } = getTableConfig(value);
    tables[name] = columns.map((column) => column.name).sort();
  }
  return Object.fromEntries(
    Object.entries(tables).sort(([a], [b]) => a.localeCompare(b)),
  );
}

writeFileSync(OUTPUT, `${JSON.stringify(schemaColumns(), null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`);
