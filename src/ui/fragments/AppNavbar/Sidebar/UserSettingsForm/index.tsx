import { Asset } from "@constants/assets"
import { ArabicFonts, getAllPossibleFontSizeOptions } from "@constants/fonts"
import { WordTranslationOption } from "@constants/records/WordTranslationRecord"
import { BasmalaPosition, Locale } from "@constants/settings"
import { ThemeMode } from "@constants/theme"
import useExegesisOptions from "@hooks/tools/useExegesisOptions"
import useFonts from "@hooks/tools/useFonts"
import { isProperThemeValue, messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { FormFieldGroup, StatefulForm } from "@systatum/coneto/stateful-form"
import { useTheme } from "@systatum/coneto/theme"
import { useMemo } from "react"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import useUserSettingsState from "../../../../hooks/states/UserSettingsState"
import useAppState from "@hooks/states/AppState"
import { Screen } from "@ui/index"
import { RiArrowRightSLine, RiBookOpenLine } from "@remixicon/react"

export default function UserSettingsForm() {
  const { setActiveScreens } = useAppState()

  const { formatMessage } = useIntl()
  const { mode } = useTheme()
  const {
    setTheme,
    setFont,
    setLocale,
    setBasmalaPosition,
    setWordByWordTranslations,
    setShowPageIndicator,
    setAlphabeticalChaptersSorting,
    setExegesis,
    userSettings,
  } = useUserSettingsState()

  // Derived fresh from the store on every render — userSettings is the sole
  // source of truth, so this can never go stale relative to it (unlike a
  // useState snapshot would).
  const formValues: FormState = {
    theme: userSettings.theme ?? mode,
    arabicFontFamily: userSettings.font.arabic.family,
    arabicFontSize: String(userSettings.font.arabic.size),
    locale: userSettings.locale,
    basmalaPosition: userSettings.basmalaPosition,
    wbwTranslations: userSettings.wbwTranslations,
    showPageIndicator: userSettings.showPageIndicator ?? true,
    alphabeticalChaptersSorting:
      userSettings.alphabeticalChaptersSorting ?? false,
    exegesis: userSettings.exegesis,
  }

  const { arabicFontOptions } = useFonts()
  const arabicFontSizeOptions = useMemo(getAllPossibleFontSizeOptions, [])
  const exegesisOptions = useExegesisOptions()

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
        title: "Size",
        type: "combo",
        placeholder: "Size of the font",
        combobox: { mobile: true, options: arabicFontSizeOptions },
      },
    ],

    [
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
        name: "exegesis",
        title: formatMessage({ id: messages.exegesis }),
        type: "combo",
        combobox: {
          mobile: true,
          multiple: true,
          options: exegesisOptions,
        },
      },
    ],

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

    [
      {
        name: "showPageIndicator",
        title: formatMessage({ id: messages.showPageIndicator.title }),
        helper: formatMessage({ id: messages.showPageIndicator.helper }),
        type: "toggle",
        toggle: {
          mobile: true,
        },
      },

      {
        name: "alphabeticalChaptersSorting",
        title: formatMessage({
          id: messages.alphabeticalChaptersSorting.title,
        }),
        helper: formatMessage({
          id: messages.alphabeticalChaptersSorting.helper,
        }),
        type: "toggle",
        toggle: {
          mobile: true,
        },
      },
    ],
    {
      type: "button",
      name: "backup",
      button: {
        icon: {
          image: RiBookOpenLine,
          size: 18,
        },
        "aria-label": "settings-backup-button",
        styles: {
          self: css`
            background: ${mode === "dark" ? "#1a211d" : "#ededed"} !important;
            flex-direction: row-reverse;
            justify-content: space-between;
          `,
        },
      },
      title: formatMessage({ id: messages.backup.title }),
      onClick: () => {
        setActiveScreens([Screen.Export])
      },
    },
    {
      type: "button",
      name: "about",
      button: {
        icon: {
          image: RiArrowRightSLine,
          size: 18,
        },
        "aria-label": "settings-about-button",
        styles: {
          self: css`
            background: ${mode === "dark" ? "#1a211d" : "#ededed"} !important;
            flex-direction: row-reverse;
            justify-content: space-between;
          `,
        },
      },
      title: formatMessage({ id: messages.about }),
      onClick: () => {
        setActiveScreens([Screen.About])
      },
    },
  ]

  return (
    <StatefulForm
      mobile
      fields={FIELDS}
      formValues={formValues}
      styles={{
        containerStyle: css`
          padding: 24px;
        `,
        mobileFieldGroupStyle: css`
          background: ${mode === "dark" ? "#1a211d" : "#ededed"} !important;
          min-height: fit-content;
        `,
        mobileFieldGroupRowDividerStyle: css`
          background: ${mode === "dark" ? "#1e3c2b" : "#dfdfdf"} !important;
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
          if (!values.every((v) => WordTranslationOption.values().includes(v)))
            return

          setWordByWordTranslations(currentState.wbwTranslations)
        } else if (FormState.ShowPageIndicator in currentState) {
          const value = currentState.showPageIndicator
          setShowPageIndicator(value)
        } else if (FormState.AlphabeticalChaptersSorting in currentState) {
          const value = currentState.alphabeticalChaptersSorting
          setAlphabeticalChaptersSorting(value)
        } else if (FormState.Exegesis in currentState) {
          const values: string[] = currentState.exegesis
          if (!Array.isArray(values)) return
          const validIds = Asset.exegesisSources.flatMap((s) =>
            s.availableLocales.map((l) => `${s.path.split("/").pop()}/${l}`),
          )
          if (!values.every((v) => validIds.includes(v))) return
          setExegesis(values)
        }
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
  AlphabeticalChaptersSorting: "alphabeticalChaptersSorting",
  Exegesis: "exegesis",
} as const

type FormState = {
  [FormState.Theme]: ThemeMode
  [FormState.ArabicFontFamily]: string
  [FormState.ArabicFontSize]: string
  [FormState.Locale]: string
  [FormState.BasmalaPosition]: BasmalaPosition
  [FormState.WordByWordTranslations]: WordTranslationOption[]
  [FormState.ShowPageIndicator]: boolean
  [FormState.AlphabeticalChaptersSorting]: boolean
  [FormState.Exegesis]: string[]
}
