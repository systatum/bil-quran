export interface BookmarkCategory {
  id: string
  name: string
}

export const BookmarkType = {
  Verse: 0,
} as const

export type BookmarkType = (typeof BookmarkType)[keyof typeof BookmarkType]

export const BookmarkColor = {
  Green: 1,
  Blue: 2,
  Yellow: 3,
  Red: 4,
  Gray: 5,
}

export type BookmarkColor = (typeof BookmarkColor)[keyof typeof BookmarkColor]

export interface Bookmark {
  type: BookmarkType
  color: BookmarkColor
  /**
   * Refering to the category key
   */
  category: string
  /**
   * Key or locator to the verse, in the A:B format where A
   * is the chapter ID and B is the verse number
   */
  key: string
  note?: string
  /**
   * Timestamp of when this was added
   */
  addedAt: number
}
