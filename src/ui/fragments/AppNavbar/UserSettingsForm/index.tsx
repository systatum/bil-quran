import { ArabicFonts, ArabicFontSizes } from "@constants/fonts"
import { Locale } from "@constants/settings"
import { isProperThemeValue, messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { useTheme } from "@systatum/coneto/theme"
import { useState } from "react"
import { useIntl } from "react-intl"
import useUserSettingsState from "../../../hooks/states/UserSettingsState"
export default function UserSettingsForm() {
  const intl = useIntl()
  const { mode } = useTheme()
  const { setTheme, setFont, setLocale, userSettings } = useUserSettingsState()

  const [formValues, setFormValues] = useState({
    theme: mode,
    arabicFontFamily: userSettings.font.arabic.family,
    arabicFontSize: String(userSettings.font.arabic.size),
    locale: userSettings.locale,
  })

  const FIELDS: FormFieldGroup[] = [
    {
      name: "theme",
      title: intl.formatMessage({ id: messages.theme.title }),
      type: "combo",
      combobox: {
        options: ["light", "dark"]
          .filter((t) => isProperThemeValue(t))
          .map(
            (t) =>
              ({
                text: intl.formatMessage({
                  id: messages.theme[t],
                }),
                value: t,
              }) satisfies ComboboxOption,
          ),
      },
    },

    [
      {
        name: "arabicFontFamily",
        title: intl.formatMessage({ id: messages.font }),
        type: "combo",
        combobox: {
          options: Object.entries(ArabicFonts).map(([fontId, font]) => {
            return {
              text: font.name,
              value: fontId,
            }
          }),
        },
      },
      {
        name: "arabicFontSize",
        type: "combo",
        placeholder: "Size of the font",
        width: "50%",
        combobox: {
          options: ArabicFontSizes.map((s) => ({
            text: s.toString(),
            value: s.toString(),
          })),
        },
      },
    ],

    {
      name: "locale",
      title: intl.formatMessage({ id: messages.lang }),
      type: "combo",
      combobox: {
        options: Object.values(Locale).map((l) => ({
          text: intl.formatMessage({ id: messages.locale[l] }),
          value: l,
        })),
      },
    },
  ]

  return (
    <StatefulForm
      fields={FIELDS}
      formValues={formValues}
      onChange={({ currentState }) => {
        if ("theme" in currentState) {
          setTheme(currentState.theme)
        } else if ("arabicFontFamily" in currentState) {
          setFont({ arabic: { family: currentState.arabicFontFamily } })
        } else if ("arabicFontSize" in currentState) {
          setFont({ arabic: { size: Number(currentState.arabicFontSize) } })
        } else if ("locale" in currentState) {
          setLocale(currentState.locale)
        }

        setFormValues((s) => ({
          ...s,
          ...currentState,
        }))
      }}
    />
  )
}
