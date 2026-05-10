export interface ChapterRecord {
  /**
   * Starts from 1, the numbering of the surat in the Qur'an.
   */
  id: number
  /**
   * The original arabic name of the quran
   */
  ar: string
  /**
   * The english name of the quran
   */
  en: string
  /**
   * The proper translation of the chapter's name
   */
  enMeaning: string
}
