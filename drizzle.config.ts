import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/repo/tables.ts",
  out: "./public/table_migrations",
  dialect: "postgresql",
  casing: "snake_case",
})
