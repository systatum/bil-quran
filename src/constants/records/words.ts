export interface WordRecord {
  chapterId: number
  renderingId: number
  verse: number
  word: string
/**
 * The Qur'an is divided into 30 parts (juz). Indicates which juz this
 * word belongs to. A chapter may span multiple juz, so this shall be
 * tracked at the word level.
 */
  partNumber: number
}
