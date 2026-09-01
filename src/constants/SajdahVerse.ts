import { ChapterRecord } from "./records/ChapterRecord"
import { Locale } from "./settings"
import { ThoughtSchool } from "./ThoughtSchool"

export const SajdahRuling = {
  Obligatory: 1,
  Recommended: 2,
} as const

export type SajdahRuling = (typeof SajdahRuling)[keyof typeof SajdahRuling]

export interface SajdahVerseEntry {
  chapterId: number
  verse: number
  rulings: Partial<Record<ThoughtSchool, SajdahRuling>>
}

export const SAJDAH_VERSES: SajdahVerseEntry[] = [
  {
    chapterId: 7,
    verse: 206,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 13,
    verse: 15,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 16,
    verse: 50,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 17,
    verse: 109,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 19,
    verse: 58,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 22,
    verse: 18,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    // second Hajj sajdah, only Shi'a Ja'fari recognizes this one
    chapterId: 22,
    verse: 77,
    rulings: {
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 25,
    verse: 60,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 27,
    verse: 26,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 32,
    verse: 15,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Obligatory,
    },
  },
  {
    // Shafi'i doesn't count this one as a sajdah tilawa verse at all
    chapterId: 38,
    verse: 24,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 41,
    verse: 38,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Obligatory,
    },
  },
  {
    chapterId: 53,
    verse: 62,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Obligatory,
    },
  },
  {
    chapterId: 84,
    verse: 21,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Recommended,
    },
  },
  {
    chapterId: 96,
    verse: 19,
    rulings: {
      [ThoughtSchool.SunniHanafi]: SajdahRuling.Obligatory,
      [ThoughtSchool.SunniShafii]: SajdahRuling.Recommended,
      [ThoughtSchool.ShiaJafari]: SajdahRuling.Obligatory,
    },
  },
]

/** The schools offered for the sajdah-marker setting. */
export const SAJDAH_SCHOOLS = [
  ThoughtSchool.SunniHanafi,
  ThoughtSchool.SunniShafii,
  ThoughtSchool.ShiaJafari,
] as const

/** Strongest ruling for a verse across given schools: obligatory wins out recommended, null otherwise */
export function getSajdahRuling(
  chapterId: number,
  verse: number,
  schools: ThoughtSchool[],
): SajdahRuling | null {
  const entry = SAJDAH_VERSES.find(
    (e) => e.chapterId === chapterId && e.verse === verse,
  )
  if (!entry) return null

  let best: SajdahRuling | null = null
  for (const school of schools) {
    const ruling = entry.rulings[school]
    if (ruling === SajdahRuling.Obligatory) return SajdahRuling.Obligatory
    if (ruling === SajdahRuling.Recommended) best = SajdahRuling.Recommended
  }
  return best
}

/** Markdown bullet list of a school's verses, each a clickable Q-marker. */
export function sajdahVerseListMarkdown(
  chapters: Record<number, ChapterRecord>,
  school: ThoughtSchool,
  ruling?: SajdahRuling,
): string {
  return SAJDAH_VERSES.filter(
    (v) =>
      v.rulings[school] != null &&
      (ruling == null || v.rulings[school] === ruling),
  )
    .map((v) => {
      const name =
        chapters[v.chapterId]?.transliterations[Locale.IntEnglish] ??
        v.chapterId
      const marker = JSON.stringify(["Q", `${v.chapterId}:${v.verse}`])
      return `- ${v.chapterId}. ${name}: <{${marker}}>`
    })
    .join("\n")
}
