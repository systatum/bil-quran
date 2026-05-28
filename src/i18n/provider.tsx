import { Locale } from "@constants/settings"
import { ReactNode } from "react"
import { IntlProvider } from "react-intl"

interface Props {
  locale: string
  messages: Record<string, string>
  children: ReactNode
}

export function I18nProvider({ locale, messages, children }: Props) {
  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      defaultLocale={Locale.IntEnglish}
    >
      {children}
    </IntlProvider>
  )
}
