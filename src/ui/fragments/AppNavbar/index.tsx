import { ThemeMode } from "@constants/theme"
import usePositioningObserver from "@hooks/tools/usePositioningObserver"
import { RiMenuLine, RiSearchLine } from "@remixicon/react"
import { Title, TitleSection } from "@systatum/coneto/title"
import { useMemo, useRef } from "react"
import { css } from "styled-components"
import JuzProgressBar from "./JuzProgressBar"
import { SearchSheet } from "./SearchSheet"
import useAppState from "@hooks/states/AppState"
import { Screen } from "@ui/index"

interface AppNavbarProps {
  theme: ThemeMode
  title: string
}

/**
 * Component that shows the navbar and the relevant sidebar
 * attached to it, which can be revealed by clicking the
 * burger menu on the navbar.
 */
export default function AppNavbar({ theme, title }: AppNavbarProps) {
  const { isSearchOpen, setIsSearchOpen, setActiveScreens } = useAppState()

  const fontColor = theme === "dark" ? "#6e9370" : "#fff0d3"
  const bgColor = theme === "dark" ? "#22271b" : "rgb(117 95 77)"

  const titleRef = useRef<HTMLDivElement>(null)
  const navbarPositioning = usePositioningObserver(titleRef)

  const actions: TitleSection[] = useMemo(
    () => [
      {
        type: "actions",
        actions: [
          {
            icon: { image: RiSearchLine, color: fontColor },
            onClick: () => setIsSearchOpen((x) => !x),
          },
          {
            icon: { image: RiMenuLine, color: fontColor },
            onClick: async () => {
              await setIsSearchOpen(false)
              await setActiveScreens([Screen.Sidebar])
            },
          },
        ],
      },
    ],
    [theme],
  )

  return (
    <>
      <div ref={titleRef} style={{ position: "relative" }}>
        <Title
          size="sm"
          text={title}
          styles={{
            containerStyle: css`
              padding: 10px;
              background-color: ${bgColor};
              color: ${fontColor};
              align-items: center;
            `,
            titleStyle: css`
              color: ${fontColor};
            `,
          }}
          rightSection={actions}
        />
        <JuzProgressBar theme={theme} />
      </div>

      <SearchSheet
        isOpen={isSearchOpen}
        navbarPositioning={navbarPositioning}
        onAfterSearch={() => setIsSearchOpen(false)}
      />
    </>
  )
}
