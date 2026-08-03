import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./src/load-env";

loadEnv();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
