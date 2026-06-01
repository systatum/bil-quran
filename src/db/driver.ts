import LOGGER from "@services/Logger"
import { isAssetsRecent } from "@services/fingerprinter"
import { drizzle } from "drizzle-orm/sql-js"
import { get, set } from "idb-keyval"
import initSqlJs, { Database, SqlJsStatic } from "sql.js"
import { repo } from "./repo"

// This module handles raw database creation and setup
// and connection handling.

/**
 * Where shall the data be stored
 */
const DATABASE_KEY = `bilquran.systatum`

let SQL: SqlJsStatic | null = null
let client: Database | null = null
export async function initDbDriver(): Promise<SqlJsStatic> {
  SQL ??= await initSqlJs({
    locateFile: (file) => `/db/sqlite/${file}`,
  })
  return SQL
}

export async function getClient(): Promise<Database> {
  if (client) return client
  const SQL = await initDbDriver()
  const canRestoreSnapshot = await isAssetsRecent()
  const snapshot = canRestoreSnapshot
    ? await get<Uint8Array>(DATABASE_KEY)
    : null
  LOGGER.debug(
    "Database snapshot size: " + String(snapshot?.byteLength ?? 0) + " bytes",
  )
  client = snapshot != null ? new SQL.Database(snapshot) : new SQL.Database()
  return client
}

export async function persistDb(): Promise<void> {
  if (!client) return

  LOGGER.debug("Persisting database changes")
  await set(DATABASE_KEY, client.export())
  LOGGER.debug("Database changes persisted to: " + DATABASE_KEY)
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
      const sqlite = await getClient()
      db = drizzle(sqlite, {
        schema: repo,
        casing: "snake_case",
      })
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
