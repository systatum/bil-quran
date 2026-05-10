import { WordRecord } from "@constants/records/words"
import { Repository } from "./repository"
import { words as schema } from "./tables"

class WordRepo extends Repository<typeof schema, WordRecord> {
  constructor() {
    super(schema)
  }
}

export const words = new WordRepo()
