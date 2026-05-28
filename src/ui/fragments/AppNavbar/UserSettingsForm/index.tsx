import {
  getAllPossibleFontOptions,
  getAllPossibleFontSizeOptions,
} from "@constants/fonts"
import { BasmalaPosition, Locale } from "@constants/settings"
import { isProperThemeValue, messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { useTheme } from "@systatum/coneto/theme"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import useUserSettingsState from "../../../hooks/states/UserSettingsState"
export default function UserSettingsForm() {
  const { formatMessage } = useIntl()
  const { mode } = useTheme()
  const { setTheme, setFont, setLocale, setBasmalaPosition, userSettings } =
    useUserSettingsState()

  const [formValues, setFormValues] = useState({
    theme: userSettings.theme ?? mode,
    arabicFontFamily: userSettings.font.arabic.family,
    arabicFontSize: String(userSettings.font.arabic.size),
    locale: userSettings.locale,
    basmalaPosition: userSettings.basmalaPosition,
  })

  const arabicFontOptions = useMemo(getAllPossibleFontOptions, [])
  const arabicFontSizeOptions = useMemo(getAllPossibleFontSizeOptions, [])

  const FIELDS: FormFieldGroup[] = [
    {
      name: "theme",
      title: formatMessage({ id: messages.theme.title }),
      type: "combo",
      combobox: {
        options: ["light", "dark"]
          .filter((t) => isProperThemeValue(t))
          .map(
            (t) =>
              ({
                text: formatMessage({
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
        title: formatMessage({ id: messages.font }),
        type: "combo",
        combobox: { options: arabicFontOptions },
      },
      {
        name: "arabicFontSize",
        type: "combo",
        placeholder: "Size of the font",
        width: "50%",
        combobox: { options: arabicFontSizeOptions },
      },
    ],

    {
      name: "locale",
      title: formatMessage({ id: messages.lang }),
      type: "combo",
      combobox: {
        options: Object.values(Locale).map((l) => ({
          text: formatMessage({ id: messages.locale[l] }),
          value: l,
        })),
      },
    },

    {
      name: "basmalaPosition",
      title: formatMessage({ id: messages.basmalaPosition.title }),
      type: "combo",
      combobox: {
        options: Object.values(BasmalaPosition).map((p) => ({
          text: formatMessage({ id: messages.basmalaPosition[p] }),
          value: p,
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
        } else if ("basmalaPosition" in currentState) {
          setBasmalaPosition(currentState.basmalaPosition)
        }

        setFormValues((s) => ({
          ...s,
          ...currentState,
        }))
      }}
    />
  )
}
