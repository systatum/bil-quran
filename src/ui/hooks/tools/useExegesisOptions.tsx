import { Asset } from "@constants/assets"
import { Locale } from "@constants/settings"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { ComboboxOption } from "@systatum/coneto/combobox"
import { useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import styled from "styled-components"

/** A simple hook to retrieve exegesis options, containing name and description */
export default function useExegesisOptions(): ComboboxOption[] {
  const { formatMessage } = useIntl()
  const { getShortDesc } = useExegesisState()
  const { userSettings } = useUserSettingsState()
  const [descs, setDescs] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const entries = await Promise.all(
        Asset.exegesisSources.flatMap((s) =>
          s.availableLocales.map(async (loc) => {
            const slug = s.path.split("/").pop() ?? ""
            const id = `${slug}/${loc}`
            const desc = await getShortDesc(id, userSettings.locale as Locale)
            return [id, desc] as const
          }),
        ),
      )
      setDescs(Object.fromEntries(entries))
    }
    load()
  }, [userSettings.locale])

  return useMemo(() => {
    const byLocale = new Map<Locale, typeof Asset.exegesisSources>()
    for (const source of Asset.exegesisSources) {
      for (const locale of source.availableLocales) {
        const group = byLocale.get(locale) ?? []
        group.push(source)
        byLocale.set(locale, group)
      }
    }

    return Array.from(byLocale.entries()).map(([locale, sources]) => ({
      text: formatMessage({ id: messages.locale[locale] }),
      value: `locale:${locale}`,
      groupOptions: sources.map((s) => {
        const slug = s.path.split("/").pop() ?? ""
        const id = `${slug}/${locale}`
        const desc = descs[id]
        return {
          text: s.name,
          value: id,
          render: desc ? (
            <ExegesisOptionLabel>
              {s.name}
              <ExegesisOptionDesc>{desc}</ExegesisOptionDesc>
            </ExegesisOptionLabel>
          ) : undefined,
        } satisfies ComboboxOption
      }),
    }))
  }, [descs, formatMessage])
}

const ExegesisOptionLabel = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.77em;
`

const ExegesisOptionDesc = styled.span`
  font-size: 11px;
  opacity: 0.65;
  line-height: 1.4;
  white-space: normal;
`
