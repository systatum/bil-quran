import { PGlite } from "@electric-sql/pglite"
import LOGGER from "@services/Logger"
import { drizzle } from "drizzle-orm/pglite"
import { repo } from "./repo"

// This module handles raw database creation and setup
// and connection handling.

/**
 * Where shall the data be stored
 */
const DATA_DIR = `idb://bilquran`

let pgClient: PGlite | null = null
export async function getPostgresDriver() {
  if (pgClient != null) return pgClient

  try {
    pgClient = await PGlite.create({
      dataDir: DATA_DIR,
      relaxedDurability: true,
    })
  } catch (e) {
    LOGGER.error("Error getting PGlite database instance", e)
    throw e
  }

  return pgClient
}

export type DbConn = ReturnType<typeof drizzle>
let db: DbConn | null = null
let initPromise: Promise<DbConn> | null = null
export async function getConn(): Promise<DbConn> {
  if (db) return db
  if (initPromise) return initPromise

  // if initialization fails once, do not set initPromise as
  // that would make initPromise remains a rejected promise
  initPromise = (async () => {
    try {
      if (pgClient == null) {
        pgClient = new PGlite(DATA_DIR)
      }
      db = drizzle(pgClient, { schema: repo, casing: "snake_case" })
      return db
    } finally {
      if (!db) initPromise = null
    }
  })()

  return initPromise
}

export async function withDb<T>(fn: (db: DbConn) => Promise<T>): Promise<T> {
  const db = await getConn()
  return fn(db)
}
