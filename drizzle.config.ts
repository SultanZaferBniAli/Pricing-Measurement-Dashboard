import { defineConfig } from "drizzle-kit";

/** `npx drizzle-kit generate` writes a new SQL migration from server/db/schema.ts. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
});
