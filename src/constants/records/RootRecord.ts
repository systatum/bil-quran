/**
 * Represents a record of root characters
 */
export interface RootRecord {
  id: number
  root: string
}

export type NewRootRecord = Omit<RootRecord, "id">
