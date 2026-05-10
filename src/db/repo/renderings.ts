import { RenderingRecord } from "@constants/records/renderings"
import { Repository } from "./repository"
import { renderings as schema } from "./tables"

class RenderingRepo extends Repository<typeof schema, RenderingRecord> {
  constructor() {
    super(schema)
  }
}

export const renderings = new RenderingRepo()
