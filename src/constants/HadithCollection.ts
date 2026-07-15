/**
 * Canonical slugs for the Hadith/athar collections cited by exegesis sources
 * (e.g. inside a <{["TH", author, hadithId, arabic, meaning]}> marker).
 * Populated from names actually referenced in the source exegesis text —
 * extend this list as new collections are encountered, rather than
 * pre-guessing a "complete" set.
 *
 * This is descriptive, not enforced at runtime — content authors should
 * stick to these slugs, but the markdown renderer falls back to a
 * title-cased render of unknown slugs instead of throwing, since a single
 * unrecognized value shouldn't break rendering for an entire exegesis entry.
 */
export const HadithCollection = {
  AbuDawud: "abudawud",
  AbuYala: "abuyala",
  Ahmad: "ahmad",
  Bayhaqi: "bayhaqi",
  Bazzar: "bazzar",
  Bukhari: "bukhari",
  Daraqutni: "daraqutni",
  Darimi: "darimi",
  Hakim: "hakim",
  IbnAbiHatim: "ibnabihatim",
  IbnHibban: "ibnhibban",
  IbnJarir: "ibnjarir",
  IbnKhuzaymah: "ibnkhuzaymah",
  IbnMajah: "ibnmajah",
  Malik: "malik",
  Muslim: "muslim",
  Nasai: "nasai",
  Tabarani: "tabarani",
  Tirmidhi: "tirmidhi",
} as const

export const HadithCollectionLabel: Record<string, string> = {
  abudawud: "Sunan Abu Dawud",
  abuyala: "Musnad Abu Ya'la",
  ahmad: "Musnad Ahmad",
  bayhaqi: "Sunan al-Kubra",
  bazzar: "Musnad al-Bazzar",
  bukhari: "Sahih al-Bukhari",
  daraqutni: "Sunan ad-Daraqutni",
  darimi: "Sunan ad-Darimi",
  hakim: "Al-Mustadrak",
  ibnabihatim: "Tafsir Ibn Abi Hatim",
  ibnhibban: "Sahih Ibn Hibban",
  ibnjarir: "Tafsir At-Tabari",
  ibnkhuzaymah: "Sahih Ibn Khuzaymah",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
  muslim: "Sahih Muslim",
  nasai: "Sunan an-Nasa'i",
  tabarani: "Al-Mu'jam al-Kabir",
  tirmidhi: "Jami' at-Tirmidhi",
}
