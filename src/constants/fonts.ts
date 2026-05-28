import { ComboboxOption } from "@systatum/coneto/combobox"

export interface FontAsset {
  name: string
  relativePath: string
}
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
  Almushaf: {
    name: "Almushaf",
    relativePath: "almushaf/almushaf",
  },
  AlquranWbw: {
    name: "AlquranWBW",
    relativePath: "alquranwbw/QuranWBW(1)",
  },
  // AmiriColor: {
  //   name: "Amiri Color",
  //   relativePath: "amiri-color/amiri-quran-colored",
  // },
  Amiri: {
    name: "Amiri",
    relativePath: "amiri/amiri_arabic-400-normal",
  },
  // weird rendering at 2:5
  // Bahij: {
  //   name: "Bahij",
  //   relativePath: "bahij/bahij",
  // },
  DroidNaskh: {
    name: "Droid Naskh",
    relativePath: "droid-naskh/droid-naskh-regular",
  },
  FarsiSimple: {
    name: "Farsi Simple",
    relativePath: "farsi-simple/farsi-simple-bold",
  },
  NotoNaskhArabic: {
    name: "Noto Naskh Arabic",
    relativePath: "notonaskh/NotoNaskhArabic-Regular",
  },
  TahaNaskh: {
    name: "Taha Naskh",
    relativePath: "taha-naskh/taha-naskh",
  },
  Ubuntu: {
    name: "Ubuntu Arabic",
    relativePath: "ubuntu/Ubuntu-Arabic_R",
  },
} satisfies Record<string, FontAsset>

export type ArabicFontFamily = keyof typeof ArabicFonts

export const ArabicFontSizes = [
  15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 40, 42.5, 45, 47.5, 50,
]

export function getAllPossibleFontOptions(): ComboboxOption[] {
  return Object.entries(ArabicFonts).map(([fontId, font]) => {
    return {
      text: font.name,
      value: fontId,
    }
  })
}

export function getAllPossibleFontSizeOptions(): ComboboxOption[] {
  return ArabicFontSizes.map((s) => ({
    text: s.toString(),
    value: s.toString(),
  }))
}
