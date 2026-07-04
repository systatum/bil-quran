import { ArabicFonts, getAllPossibleFontSizeOptions } from "@constants/fonts"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { BasmalaPosition, Locale } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import useFonts from "@hooks/tools/useFonts"
import { isProperThemeValue, messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { useTheme } from "@systatum/coneto/theme"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import useUserSettingsState from "../../../../hooks/states/UserSettingsState"
export default function UserSettingsForm() {
  const { formatMessage } = useIntl()
  const { mode } = useTheme()
  const {
    setTheme,
    setFont,
    setLocale,
    setBasmalaPosition,
    setWordByWordTranslations,
    setShowPageIndicator,
    userSettings,
  } = useUserSettingsState()

  const [formValues, setFormValues] = useState<FormState>({
    theme: userSettings.theme ?? mode,
    arabicFontFamily: userSettings.font.arabic.family,
    arabicFontSize: String(userSettings.font.arabic.size),
    locale: userSettings.locale,
    basmalaPosition: userSettings.basmalaPosition,
    wbwTranslations: userSettings.wbwTranslations,
    showPageIndicator: userSettings.showPageIndicator ?? true,
  })

  const { arabicFontOptions } = useFonts()
  const arabicFontSizeOptions = useMemo(getAllPossibleFontSizeOptions, [])

  const FIELDS: FormFieldGroup[] = [
    {
      name: "theme",
      title: formatMessage({ id: messages.theme.title }),
      type: "combo",
      combobox: {
        mobile: true,
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
        helper: formatMessage({ id: messages.fontCategory.helper }),
        type: "combo",
        combobox: {
          mobile: true,
          drawerHeight: "70dvh",
          options: arabicFontOptions,
        },
      },
      {
        name: "arabicFontSize",
        type: "combo",
        placeholder: "Size of the font",
        width: "50%",
        combobox: { mobile: true, options: arabicFontSizeOptions },
      },
    ],

    {
      name: "locale",
      title: formatMessage({ id: messages.lang }),
      type: "combo",
      combobox: {
        mobile: true,
        options: Object.values(Locale).map((l) => ({
          text: formatMessage({ id: messages.locale[l] }),
          value: l,
        })),
      },
    },

    {
      name: "wbwTranslations",
      title: "Word-by-word translations",
      type: "combo",
      combobox: {
        mobile: true,
        multiple: true,
        options: WordTranslationOption.values().map((l) => ({
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
        mobile: true,
        options: Object.values(BasmalaPosition).map((p) => ({
          text: formatMessage({ id: messages.basmalaPosition[p] }),
          value: p,
        })),
      },
    },

    {
      name: "showPageIndicator",
      title: formatMessage({ id: messages.showPageIndicator.title }),
      helper: formatMessage({ id: messages.showPageIndicator.helper }),
      type: "toggle",
      toggle: {
        mobile: true,
      },
    },
  ]

  return (
    <StatefulForm
      fields={FIELDS}
      formValues={formValues}
      styles={{
        containerStyle: css`
          padding: 24px;
        `,
      }}
      onChange={({ currentState }) => {
        if (currentState == null) return
        const key = Object.keys(currentState)[0]
        if (currentState[key] === "") return
        console.log(`State ${key} value:`, currentState[key])

        // note: do not forget to return early if value is invalid,
        // so that we are not updating the form's state.
        if (FormState.Theme in currentState) {
          const value: ThemeMode = currentState.theme
          if (value === "dark" || value === "light")
            setTheme(currentState.theme)
          else return
        } else if (FormState.ArabicFontFamily in currentState) {
          const value: string = currentState.arabicFontFamily
          if (!Object.keys(ArabicFonts).includes(value)) return

          setFont({ arabic: { family: currentState.arabicFontFamily } })
        } else if (FormState.ArabicFontSize in currentState) {
          const value = currentState.arabicFontSize
          if (Number.isNaN(value)) return

          setFont({ arabic: { size: Number(currentState.arabicFontSize) } })
        } else if (FormState.Locale in currentState) {
          const value = currentState.locale
          if (!Object.values(Locale).includes(value)) return

          setLocale(currentState.locale)
        } else if (FormState.BasmalaPosition in currentState) {
          const value = currentState.basmalaPosition
          if (!Object.values(BasmalaPosition).includes(value)) return

          setBasmalaPosition(currentState.basmalaPosition)
        } else if (FormState.WordByWordTranslations in currentState) {
          const values: WordTranslationOption[] = currentState.wbwTranslations

          if (!Array.isArray(values)) return
          const validValues = WordTranslationOption.values()
          const allValidValues = values.map((v) => validValues.includes(v))

          setWordByWordTranslations(currentState.wbwTranslations)
        } else if (FormState.ShowPageIndicator in currentState) {
          const value = currentState.showPageIndicator
          setShowPageIndicator(value)
        }

        // update the form state
        setFormValues((s) => ({
          ...s,
          ...currentState,
        }))
      }}
    />
  )
}

export const FormState = {
  Theme: "theme",
  ArabicFontFamily: "arabicFontFamily",
  ArabicFontSize: "arabicFontSize",
  Locale: "locale",
  BasmalaPosition: "basmalaPosition",
  WordByWordTranslations: "wbwTranslations",
  ShowPageIndicator: "showPageIndicator",
} as const

type FormState = {
  [FormState.Theme]: ThemeMode
  [FormState.ArabicFontFamily]: string
  [FormState.ArabicFontSize]: string
  [FormState.Locale]: string
  [FormState.BasmalaPosition]: BasmalaPosition
  [FormState.WordByWordTranslations]: WordTranslationOption[]
  [FormState.ShowPageIndicator]: boolean
}
