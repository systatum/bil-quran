import { ArabicFontId, ArabicFonts, ShaddaStyle } from "@constants/fonts"
import { messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { useIntl } from "react-intl"

export default function useFonts() {
  return { arabicFontOptions: gatherArabicFontOptions() }
}

function ExampleText({
  fontId,
  fontName,
}: {
  fontId: string
  fontName: string
}) {
  return (
    <p style={{ padding: "5px 0px" }}>
      <p>{fontName}</p>
      <p style={{ direction: "rtl", fontFamily: fontId, marginTop: "2px" }}>
        وَٱلَّذِينَءَامَنُوٓاأَشَدُّحُبًّۭالِّلَّهِ
      </p>
    </p>
  )
}

function gatherArabicFontOptions() {
  const { formatMessage } = useIntl()
  const SKIPPED_FONTS = [ArabicFonts.MeQuranFull.name]

  const shaddaStackedFonts: ComboboxOption[] = Object.entries(ArabicFonts)
    .filter(([_, font]) => font.shaddaStyle === ShaddaStyle.AlwaysStacked)
    .filter(([_, font]) => !SKIPPED_FONTS.includes(font.name))
    .map(([fontId, font]) => ({
      text: font.name,
      value: fontId,
      render: <ExampleText fontId={fontId} fontName={font.name} />,
    }))

  const shaddaFlexFonts: ComboboxOption[] = Object.entries(ArabicFonts)
    .filter(([_, font]) => font.shaddaStyle === ShaddaStyle.AllowSeparation)
    .filter(([_, font]) => !SKIPPED_FONTS.includes(font.name))
    .map(([fontId, font]) => ({
      text: font.name,
      value: fontId,
      render: <ExampleText fontId={fontId} fontName={font.name} />,
    }))

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
      value: ArabicFontId.MeQuranFull,
      render: (
        <ExampleText
          fontId={ArabicFontId.MeQuranFull}
          fontName={formatMessage({ id: messages.fontOptions.meQuranLearner })}
        />
      ),
    },
  ]
}
