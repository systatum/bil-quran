import { Database } from "sql.js"
import { getClient, persistDb } from "./driver"

// This module handles database migration, that is,
// setting up the tables, indexes, and properties
// of the database so that the database is ready to
// be meaningfully used by the app.

/**
 * Table to take note which migrations have been applied in the database
 */
const RECORD_KEEPER_TABLE_NAME = "__sequelore_migrations"
const RECORD_KEEPER_TABLE_SQL_CREATION_CODE = `
  CREATE TABLE IF NOT EXISTS ${RECORD_KEEPER_TABLE_NAME} (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`

export async function applyMigrations() {
  try {
    console.debug("Applying migrations...")
    const client = await getClient()
    if (!client) throw new Error("Cannot get PGlite client")

    // check which migrations have been applied
    createRecordKeepingTable(client)
    let applied = await listAppliedMigrations(client)
    console.debug("Applied migrations thus far", applied)

    const journal = await getMigrationJournal()
    let completelyMigrated = true
    for (const entry of journal.entries) {
      if (!applied.has(entry.tag)) {
        completelyMigrated = false
      }
    }

    if (!completelyMigrated) {
      let migrations = await getMigrationFiles(journal)
      let executedMigrations = 0
      for (const m of migrations) {
        if (applied.has(m.filename)) continue
        console.debug(
          `Applying migration ${executedMigrations + 1}`,
          m.filename,
        )
        client.exec("BEGIN")
        try {
          client.exec(m.sqlContent)
          client.exec(
            `INSERT INTO ${RECORD_KEEPER_TABLE_NAME} (id) VALUES ('${m.filename}')`,
          )
          client.exec("COMMIT")
        } catch (e) {
          client.exec("ROLLBACK")
          throw e
        }
        executedMigrations++
      }
    }

    await persistDb()
  } catch (e) {
    console.error("Failed applying migrations", e)
    throw e
  }
}

/**
 * This will create record keeping table IF it doesn't exist yet
 */
function createRecordKeepingTable(client: Database) {
  try {
    client.exec(RECORD_KEEPER_TABLE_SQL_CREATION_CODE)
  } catch (e) {
    console.error("Failed creating the record-keeping table", e)
    throw e
  }
}

/**
 * Find out which migrations have been applied
 */
function listAppliedMigrations(client: Database): Set<string> {
  console.debug("Listing applied migrations...")

  let applied = new Set<string>()
  try {
    const appliedMigrations = client.exec(
      `SELECT id FROM ${RECORD_KEEPER_TABLE_NAME}`,
    )
    if (appliedMigrations.length === 0) return new Set()
    const rows = appliedMigrations[0].values
    return new Set(rows.map((r) => String(r[0])))
  } catch (e) {
    console.error("Cannot list applied migrations", e)
    console.debug("Migrations table does not exist, creating...")
    createRecordKeepingTable(client)
    return new Set()
  }
}

const isDev = process.env.NODE_ENV === "development"
const migBasePath = `${window.location.origin}${process.env.PUBLIC_URL}/table_migrations`

async function getMigrationJournal(): Promise<Journal> {
  const journalPath = `${migBasePath}/meta/${isDev ? "_journal.json" : "journal.json"}`
  const journal: Journal = await fetch(journalPath).then((r) => r.json())
  console.debug("Migration journal:", journal)
  return journal
}

/**
 * Find and retrieve all SQL migrations to be applied
 */
async function getMigrationFiles(journal: Journal): Promise<MigrationFile[]> {
  return Promise.all(
    journal.entries.map(({ tag }) =>
      fetch(`${migBasePath}/${tag}.sql`).then(async (r) => ({
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
