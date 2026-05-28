// i18n/index.ts

import { Locale } from "@constants/settings"
import { flattenObject } from "@services/Converter"
import LOGGER from "@services/Logger"

async function importMessages(locale: Locale) {
  let raw
  switch (locale) {
    case Locale.IntArabic:
      raw = (await import("./locales/ar-IQ.json")).default
      break

    case Locale.IntEnglish:
      raw = (await import("./locales/en-US.json")).default
      break

    case Locale.Indonesian:
      raw = (await import("./locales/id-ID.json")).default
      break

    default:
      raw = (await import("./locales/en-US.json")).default
  }

  return flattenObject(raw)
}

/**
 * Load user's locale messages alongside the default locale messages,
 * such that if there's key that doesn't exist in the user's locale,
 * it'll be derived from the default's locale
 */
export async function loadMessages(locale: Locale) {
  // don't remove this line, so we know if the app is inefficient, that is
  // when we see in console loadMessages is being called incredibly many times
  // in a second
  LOGGER.debug("Loading locale to: " + locale)

  try {
    const defaultMessages = await importMessages(Locale.IntEnglish)
    const userLocaleMessages = await importMessages(locale)
    return {
      ...defaultMessages,
      ...userLocaleMessages,
    }
  } catch (e) {
    LOGGER.error("Error at loading messages", e)
    return {}
  }
}

export function resolveLocale(locale: string): Locale {
  if (locale === Locale.Indonesian) return Locale.Indonesian
  else if (locale === Locale.IntArabic) return Locale.IntArabic
  else return Locale.IntEnglish
}
