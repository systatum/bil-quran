import {
  ArabicFontFamily,
  ArabicFonts,
  ArabicFontSizes,
} from "@constants/fonts"
import useUserSettingsState from "../../hooks/states/UserSettingsState"
import { Combobox } from "./Combobox"
import { FlexContainer } from "./Container"

export default function FontSettings() {
  const { userSettings, setFont } = useUserSettingsState()

  return (
    <FlexContainer>
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

      <Combobox
        value={userSettings.font.arabic.size.toString()}
        onChange={(e) => {
          e.preventDefault()
          setFont({ arabic: { size: Number(e.target.value) } })
        }}
        style={{ width: "50%" }}
      >
        {ArabicFontSizes.map((s) => (
          <option key={s} value={s.toString()}>
            {s}
          </option>
        ))}
      </Combobox>
    </FlexContainer>
  )
}
