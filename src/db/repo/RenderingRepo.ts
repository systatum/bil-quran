import { IPCResponse } from "@constants/IPC"
import { RenderingRecord } from "@constants/records/RenderingRecord"
import { withDb } from "@db/driver"
import { and, eq } from "drizzle-orm"
import { conditional, Repository } from "./Repository"
import { renderings as schema } from "./tables"

// this file contains module to do such as such.

class RenderingRepo extends Repository<typeof schema, RenderingRecord> {
  constructor() {
    super(schema)
  }

  async findAllBy({
    name,
  }: {
    name: string
  }): Promise<IPCResponse<RenderingRecord[]>> {
    return withDb(
      async (db) =>
        await this.findBy(
          db,
          and(...conditional(name, eq(schema.name, name ?? ""))),
        ),
    )
  }
}

export const renderings = new RenderingRepo()
