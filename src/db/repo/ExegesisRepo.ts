import { IPCResponse } from "@constants/IPC"
import { ExegesisRecord } from "@constants/records/ExegesisRecord"
import { Locale } from "@constants/settings"
import { withDb } from "@db/driver"
import { sql } from "drizzle-orm"
import { and, eq, like, or } from "drizzle-orm/sql/expressions/conditions"
import { conditional, Repository } from "./Repository"
import { exegesis as schema } from "./tables"

/**
 * Repository for Exegesis, which maintains tafsirs and commentaries of the
 * Holy Quran.
 */
class ExegesisRepo extends Repository<typeof schema, ExegesisRecord> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    id,
    name,
  }: {
    id?: string
    name?: string
  }): Promise<IPCResponse<ExegesisRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(
            ...conditional(id, eq(schema.id, id ?? "")),
            ...conditional(
              name,
              or(
                eq(schema.oriName, name ?? ""),
                ...Object.values(Locale).map((locale) =>
                  like(
                    sql`json_extract(${schema.locNames}, ${`$.${locale}`})`,
                    `%${name ?? ""}%`,
                  ),
                ),
              ),
            ),
          ),
        ),
    )
  }
}

export const exegesis = new ExegesisRepo()
