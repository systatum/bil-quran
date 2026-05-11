import { ChapterRecord } from "@constants/records/chapters"
import { Repository } from "./repository"
import { chapters as schema } from "./tables"

class ChapterRepo extends Repository<typeof schema, ChapterRecord> {
  constructor() {
    super(schema)
  }
}

export const chapters = new ChapterRepo()
