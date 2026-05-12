import { PGlite } from "@electric-sql/pglite"
import { getPostgresDriver } from "./driver"

/**
 * Table to take note which migrations have been applied in the database
 */
const RECORD_KEEPER_TABLE_NAME = "__sequelore_migrations"
const RECORD_KEEPER_TABLE_SQL_CREATION_CODE = `
  CREATE TABLE IF NOT EXISTS ${RECORD_KEEPER_TABLE_NAME} (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);`

export async function applyMigrations() {
  try {
    console.debug("Applying migrations...")
    const client = await getPostgresDriver()
    if (!client) throw new Error("Cannot get PGlite client")

    // check which migrations have been applied
    await createRecordKeepingTable(client)
    let applied = await listAppliedMigrations(client)
    console.debug("Applied migrations thus far", applied)

    let migrations = await getMigrationFiles()
    let executedMigrations = 0
    for (const m of migrations) {
      if (applied.has(m.filename)) continue
      console.debug(`Applying migration ${executedMigrations + 1}`, m.filename)
      await client.transaction(async (tx) => {
        await tx.exec(m.sqlContent)
        await tx.exec(
          `INSERT INTO ${RECORD_KEEPER_TABLE_NAME} (id) VALUES ('${m.filename}')`,
        )
      })
      executedMigrations++
    }
  } catch (e) {
    console.error("Failed applying migrations", e)
  }
}

async function createRecordKeepingTable(client: PGlite) {
  try {
    await client.exec(RECORD_KEEPER_TABLE_SQL_CREATION_CODE)
  } catch (e) {
    console.error("Failed creating the record-keeping table", e)
    throw e
  }
}

/**
 * Find out which migrations have been applied
 */
async function listAppliedMigrations(client: PGlite): Promise<Set<string>> {
  console.debug("Listing applied migrations...")

  let applied = new Set<string>()
  try {
    const appliedMigrations = await client.query(
      `SELECT id FROM ${RECORD_KEEPER_TABLE_NAME}`,
    )
    applied = new Set(appliedMigrations.rows.map((row: any) => row.id))
  } catch (e) {
    console.error("Cannot list applied migrations", e)
    console.debug("Migrations table does not exist, creating...")
    await createRecordKeepingTable(client)
  }
  return applied
}

/**
 * Find and retrieve all SQL migrations to be applied
 */
async function getMigrationFiles(): Promise<MigrationFile[]> {
  const isDev = process.env.NODE_ENV === "development"
  const base = `${window.location.origin}${process.env.PUBLIC_URL}/table_migrations`
  console.debug("Route base", base, process.env)

  const journalPath = `${base}/meta/${isDev ? "_journal.json" : "journal.json"}`
  const journal: Journal = await fetch(journalPath).then((r) => r.json())
  console.debug("Migration journal:", journal)
  return Promise.all(
    journal.entries.map(({ tag }) =>
      fetch(`${base}/${tag}.sql`).then(async (r) => ({
        filename: `${tag}.sql`,
        sqlContent: await r.text(),
      })),
    ),
  )
}

interface Journal {
  entries: {
    tag: string
  }[]
}

interface MigrationFile {
  filename: string
  sqlContent: string
}
