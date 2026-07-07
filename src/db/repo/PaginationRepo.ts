import { IPCResponse } from "@constants/IPC"
import { PaginationRecord } from "@constants/records/Pagination"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { paginations as schema } from "./tables"

class PaginationRepo extends Repository<typeof schema, PaginationRecord> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    name,
  }: {
    name?: string
  }): Promise<IPCResponse<PaginationRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(...conditional(name, eq(schema.name, name ?? ""))),
        ),
    )
  }
}

export const paginations = new PaginationRepo()
