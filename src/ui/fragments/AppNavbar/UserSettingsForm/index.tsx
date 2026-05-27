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
  const [formValues, setFormValues] = useState({
    theme: mode,
  })
  const { setTheme, setLocale, userSettings } = useUserSettingsState()

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
        }
      }}
    />
  )
}
