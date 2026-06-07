import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/repo/tables.ts",
  out: "./public/table_migrations",
  dialect: "sqlite",
  casing: "snake_case",
})
