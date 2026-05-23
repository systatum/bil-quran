import { DEFAULT_LOCALE, Locale } from "@constants/locales"
import { create } from "zustand"

const useUserSettingsState = create<UserSettings>((set, get) => ({
  locale: DEFAULT_LOCALE,
}))

export default useUserSettingsState

export interface UserSettings {
  locale: Locale
}
