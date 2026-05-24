import { ArabicFontFamily, ArabicFonts } from "@constants/assets"
import useUserSettingsState from "../../hooks/states/UserSettingsState"
import { Combobox } from "./Combobox"

export default function FontSettings() {
  const { userSettings, setFont } = useUserSettingsState()

  return (
    <Combobox
      value={userSettings.font.arabic.family}
      onChange={(e) => {
        e.preventDefault()
        setFont({ arabic: { family: e.target.value as ArabicFontFamily } })
      }}
    >
      {Object.entries(ArabicFonts).map(([fontId, font]) => {
        return (
          <option key={fontId} value={fontId}>
            {font.name}
          </option>
        )
      })}
    </Combobox>
  )
}
