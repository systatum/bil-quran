export interface WordRecord {
  /**
   * Which chapter (or surah/surat) this word belongs to
   */
  chapterId: number
  /**
   * The rendering/print style
   */
  renderingId: number
  lexemeId: number
  /**
   * Which verse (or ayat, or sentence) this word belongs to
   */
  verse: number
  /**
   * In which order this word is
   */
  order: number
  /**
   * The Qur'an is divided into 30 parts (juz). Indicates which juz this
   * word belongs to. A chapter may span multiple juz, so this shall be
   * tracked at the word level.
   */
  partNumber: number
}

export interface WordWithLexemeRecord {
  chapterId: number
  verse: number
  order: number

  partNumber: number

  lexemeId: number
  renderingId: number

  token: string
  root: string
  enReading: string
}
