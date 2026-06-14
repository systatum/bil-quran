import { ArabicFonts, ShaddaStyle } from "@constants/fonts"
import { messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { useIntl } from "react-intl"

export default function useFonts() {
  return { arabicFontOptions: gatherArabicFontOptions() }
}

function gatherArabicFontOptions() {
  const { formatMessage } = useIntl()
  const SKIPPED_FONTS = [ArabicFonts.MeQuranFull.name]

  const shaddaStackedFonts: ComboboxOption[] = Object.entries(ArabicFonts)
    .filter(([_, font]) => font.shaddaStyle === ShaddaStyle.AlwaysStacked)
    .filter(([_, font]) => !SKIPPED_FONTS.includes(font.name))
    .map(([fontId, font]) => ({ text: font.name, value: fontId }))

  const shaddaFlexFonts: ComboboxOption[] = Object.entries(ArabicFonts)
    .filter(([_, font]) => font.shaddaStyle === ShaddaStyle.AllowSeparation)
    .filter(([_, font]) => !SKIPPED_FONTS.includes(font.name))
    .map(([fontId, font]) => ({ text: font.name, value: fontId }))

  return [
    {
      text: formatMessage({ id: messages.fontCategory.shaddaStacked }),
      value: "stacked",
      groupOptions: shaddaStackedFonts,
    },
    {
      text: formatMessage({ id: messages.fontCategory.shaddaSeparable }),
      value: "flexible",
      groupOptions: shaddaFlexFonts,
    },
    {
      text: formatMessage({ id: messages.fontOptions.meQuranLearner }),
      value: "MeQuranFull",
    },
  ]
}
