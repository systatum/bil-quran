/** Definite-article prefixes used in transliterated chapter names */
const ARTICLE_PREFIX_RE = /^(Ash|Adh|Asy|Al|An|Ar|As|At|Az|Ad)-/i

export function chapterNameSortKey(name: string): string {
  return name.replace(ARTICLE_PREFIX_RE, "")
}
