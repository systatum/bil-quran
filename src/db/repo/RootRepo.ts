import { RootRecord } from "@constants/records/RootRecord"
import { withDb } from "@db/driver"
import { and, inArray } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { roots as schema } from "./tables"

class RootRepo extends Repository<typeof schema, RootRecord> {
  constructor() {
    super(schema)
  }

  /**
   * Find root records.
   * - if roots[] is provided, will find those roots
   */
  async findAllBy({ roots = [] }: { roots?: string[] }) {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(...conditional(roots.length > 0, inArray(schema.root, roots))),
        ),
    )
  }
}

export const roots = new RootRepo()
