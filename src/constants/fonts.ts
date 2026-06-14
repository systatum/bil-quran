import { ComboboxOption } from "@systatum/coneto/combobox"

export const ShaddaStyle = {
  AlwaysStacked: "0",
  AllowSeparation: "1",
} as const

export type ShaddaStyle = (typeof ShaddaStyle)[keyof typeof ShaddaStyle]

export interface FontAsset {
  id?: string
  name: string
  relativePath: string
  shaddaStyle: ShaddaStyle
}

export const ArabicFontId = {
  AdwaAssalaf: "AdwaAssalaf",
  DroidNaskh: "DroidNaskh",
  MeQuranFull: "MeQuranFull",
} as const

/**
 * List of fonts that the app supports. The "key" acts as the font ID,
 * so it should have never changed once it enters this dictionary.
 * ID of the font should not contains a space, as it also functions as
 * registered CSS name for the font.
 */

export const ArabicFonts = {
  // weird rendering at 2:5
  // Albayan: {
  //   name: "Albayan",
  //   relativePath: "albayan/albayan",
  // },
  /**
   * This fonts has no WOFF variant yet
   */
  [ArabicFontId.AdwaAssalaf]: {
    name: "Adwa Assalaf",
    relativePath: "adwa-assalaf/adwa-assalaf",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  Almushaf: {
    name: "Almushaf",
    relativePath: "almushaf/almushaf",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  // good but not sure, existing fonts cover just as well
  // Alqalam: {
  //   name: "Alqalam",
  //   relativePath: "alqalam/alqalam",
  //   shaddaStyle: ShaddaStyle.AllowSeparation,
  // },
  AlquranWbw: {
    name: "AlquranWBW",
    relativePath: "alquranwbw/QuranWBW(1)",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  // AmiriColor: {
  //   name: "Amiri Color",
  //   relativePath: "amiri-color/amiri-quran-colored",
  // },
  Amiri: {
    name: "Amiri",
    relativePath: "amiri/amiri_arabic-400-normal",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  // weird rendering at 2:5
  // Bahij: {
  //   name: "Bahij",
  //   relativePath: "bahij/bahij",
  // },
  [ArabicFontId.DroidNaskh]: {
    name: "Droid Naskh",
    relativePath: "droid-naskh/droid-naskh-regular",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  FarsiSimple: {
    name: "Farsi Simple",
    relativePath: "farsi-simple/farsi-simple-bold",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  // Hard to read
  // Kitab: {
  //   name: "Kitab",
  //   relativePath: "kitab/Kitab",
  //   shaddaStyle: ShaddaStyle.AllowSeparation,
  // },
  /**
   * This fonts has no WOFF equivalent converted yet
   */
  MeQuran: {
    name: "MeQuran",
    relativePath: "mequran/MeQuran",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  [ArabicFontId.MeQuranFull]: {
    name: "MeQuran (Full)",
    relativePath: "mequran-sep/mq2-f",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  Noorehuda: {
    name: "Noorehuda",
    relativePath: "noorehuda/noorehuda",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  NotoNaskhArabic: {
    name: "Noto Naskh Arabic",
    relativePath: "notonaskh/NotoNaskhArabic-Regular",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  NotoNastaqUrdu: {
    name: "Noto Nastaliq Urdu",
    relativePath: "notonastaq-urdu/notonastaq-urdu",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  SahlNaskh: {
    name: "Sahl Naskh",
    relativePath: "warsh/mequ2",
    shaddaStyle: ShaddaStyle.AllowSeparation,
  },
  TahaNaskh: {
    name: "Taha Naskh",
    relativePath: "taha-naskh/taha-naskh",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  Ubuntu: {
    name: "Ubuntu Arabic",
    relativePath: "ubuntu/Ubuntu-Arabic_R",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  // no WOFF yet
  UthTaha: {
    name: "KFGQPC Uthman Taha Naskh",
    relativePath: "uthtaha/uthtaha",
    shaddaStyle: ShaddaStyle.AlwaysStacked,
  },
  // version 13 and 14 of this font can't render word like فِیْهِ
  // UthHafs: {
  //   name: "KFGQPC Uthmanic Script HAFS",
  //   relativePath: "uthafs/uthafs",
  //   shaddaStyle: ShaddaStyle.AllowSeparation,
  // },
} satisfies Record<string, FontAsset>

export type ArabicFontFamily = keyof typeof ArabicFonts

export const ArabicFontSizes = [
  15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 40, 42.5, 45, 47.5, 50,
]

export function isLearningFont(fontId: string): boolean {
  return fontId === ArabicFontId.MeQuranFull
}

export function getAllPossibleFontSizeOptions(): ComboboxOption[] {
  return ArabicFontSizes.map((s) => ({
    text: s.toString(),
    value: s.toString(),
  }))
}
