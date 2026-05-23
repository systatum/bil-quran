import {
  newErrIPCResponse,
  newIPCResponse,
  type IPCResponse,
} from "@constants/IPC"
import { DbConn, withDb } from "@db/driver"
import { unpackIPC } from "@services/Converter"
import { asc, count, desc, eq, type SQL } from "drizzle-orm"
import {
  type AnyPgColumn,
  type AnyPgTable,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core"

type SelectOf<T extends AnyPgTable> = T["$inferSelect"]
type InsertOf<T extends PgTableWithColumns<any>> = T["$inferInsert"]
type OrderingMode = "asc" | "desc"
type OrderDict<T> = {
  [K in keyof T]?: OrderingMode
}

/**
 * Repository wraps the raw ORM layer into a class that can easily be
 * extended and used by various different table domains.
 */
export abstract class Repository<
  T extends PgTableWithColumns<any>,
  R extends SelectOf<T> = SelectOf<T>,
> {
  public readonly schema: T

  constructor(schema: T) {
    this.schema = schema
  }

  /**
   * Send a query to find or retrieve a set of data matching
   * given clauses and parameters
   */
  protected async findBy(
    db: DbConn,
    clauses?: SQL,
    orderBy?: OrderDict<R>,
    limit?: number,
  ): Promise<IPCResponse<R[]>> {
    try {
      const qrySelect = db.select().from(this.schema as AnyPgTable)
      const qryFilter = clauses ? qrySelect.where(clauses) : qrySelect
      const qryOrder = orderBy
        ? qryFilter.orderBy(
            ...Object.entries(orderBy).map(([col, dir]) => {
              const column = this.schema[col as keyof typeof this.schema]
              return dir === "asc" ? asc(column) : desc(column)
            }),
          )
        : qryFilter
      const qryLimit =
        typeof limit === "number" ? qryOrder.limit(limit) : qryOrder
      const rows = (await qryLimit) as R[]
      return newIPCResponse({ data: rows })
    } catch (e) {
      console.error("Record fetching failed", e)
      return newErrIPCResponse(e)
    }
  }

  /**
   * Create data in bulk
   */
  async createBulk(data: Partial<R>[]): Promise<IPCResponse<R[]>> {
    try {
      const records = await withDb(async (db: DbConn) => {
        const now = new Date()

        const insertData = data.map((item) => {
          const row = {
            ...item,
          } satisfies InsertOf<T>

          if (this.schema["createdAt"]) {
            ;(row as any)["createdAt"] = now
          }

          if (this.schema["updatedAt"]) {
            ;(row as any)["updatedAt"] = now
          }

          return row as InsertOf<T>
        })

        const rows = await db.insert(this.schema).values(insertData).returning()

        return rows as unknown as R[]
      })

      return newIPCResponse({
        data: records,
      })
    } catch (e) {
      console.error("Bulk record creation failed", e)

      return newErrIPCResponse(e)
    }
  }

  /**
   * Create an individual data persisted to the database
   */
  async create(data: Partial<R>): Promise<IPCResponse<R>> {
    const result = await this.createBulk([data])
    if (!result.succeed) {
      return newErrIPCResponse<R>(result.errors)
    }

    const [record] = unpackIPC(result)
    return newIPCResponse({
      data: record,
    })
  }

  /**
   * Update a data given the column that an update is planned for
   */
  async updateBy<C extends AnyPgColumn>(
    keyColumn: C,
    value: C["_"]["data"],
    data: Partial<R>,
  ): Promise<IPCResponse<R>> {
    try {
      const rec = await withDb(async (db: DbConn) => {
        const now = new Date()
        const updateData = { ...data } satisfies InsertOf<T>

        if (this.schema["updatedAt"]) (updateData as any)["updatedAt"] = now

        const rows = (await db
          .update(this.schema)
          .set(updateData as InsertOf<T>)
          .where(eq(keyColumn, value))
          .returning()) as R[]

        return rows[0]
      })
      return newIPCResponse<R>({ data: rec })
    } catch (e) {
      console.error("Update record failed", e)
      return newErrIPCResponse(e)
    }
  }

  /**
   * Update select columns of a row identified by a given ID
   *
   * @param id the id of the row
   * @param data patches of data to be applied
   * @returns full row data
   */
  async update(id: any, data: Partial<R>) {
    return this.updateBy(this.schema["id"], id, data)
  }

  async deleteBy<C extends AnyPgColumn>(
    keyColumn: C,
    value: C["_"]["data"],
  ): Promise<IPCResponse<R>> {
    try {
      const rec = await withDb(async (db: DbConn) => {
        const rows = await db
          .delete(this.schema)
          .where(eq(keyColumn, value))
          .returning()

        return rows[0] as R
      })
      return newIPCResponse({ data: rec })
    } catch (e) {
      console.error("Record removal failed", e)
      return newErrIPCResponse(e)
    }
  }

  async delete(id: any) {
    return this.deleteBy(this.schema["id"], id)
  }

  async count(): Promise<IPCResponse<number>> {
    try {
      return await withDb(async (db: DbConn) => {
        const rows = await db
          .select({ count: count() })
          .from(this.schema as AnyPgTable)
        return newIPCResponse({ data: rows[0]?.count ?? 0 })
      })
    } catch (e) {
      console.error("Counting record failed", e)
      return newErrIPCResponse(e)
    }
  }
}

//====== HELPER FUNCTIONS =========================================================

/**
 * Conditionally includes SQL expressions based on a value check.
 *
 * Behavior:
 * - If `check` is a boolean:
 *   - `true` -> returns `truthyResult`
 *   - `false` -> returns `falsyResult`
 * - If `check` is not a boolean:
 *   - `null` or `undefined` -> returns `falsyResult`
 *   - `NaN` -> returns `falsyResult`
 *   - any other value -> returns `truthyResult`
 *
 * @param check value used to determine whether arg1 or arg2 is returned
 * @param truthyResult expression or array of expressions if the check passed
 * @param falsyResult expression or array of expressions if the check failed
 * @returns an array containing the selected expression(s)
 */
export function conditional<T>(
  check: unknown,
  truthyResult: T | T[],
  falsyResult: T | T[] = [],
): T[] {
  const valid =
    typeof check === "boolean"
      ? check
      : check != null && !(typeof check === "number" && Number.isNaN(check))

  if (!valid) return Array.isArray(falsyResult) ? falsyResult : [falsyResult]
  return Array.isArray(truthyResult) ? truthyResult : [truthyResult]
}
