import { ArabicFonts, ArabicFontSizes } from "@constants/fonts"
import { ThemeMode } from "@constants/theme"
import { isProperThemeValue, messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { useTheme } from "@systatum/coneto/theme"
import { useCallback, useMemo, useState } from "react"
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
  })

  const FIELDS: FormFieldGroup[] = useMemo(
    () => [
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
    ],
    [],
  )

  const changeTheme = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault()
    const value = e.target.value
    setTheme(value as ThemeMode)
  }, [])

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
        }
      }}
    />
  )
}
