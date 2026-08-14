import { ThemeMode } from "@constants/theme"
import usePositioningObserver from "@hooks/tools/usePositioningObserver"
import { RiMenuLine, RiSearchLine } from "@remixicon/react"
import {
  Title,
  TitleSection,
  TitleSectionActionStyles,
} from "@systatum/coneto/title"
import React, { useMemo, useRef } from "react"
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

  const actionStyle: TitleSectionActionStyles = {
    self: css`
      @media (max-width: 640px) {
        height: 34px;
        width: 34px;
        padding: 0px;
        border-radius: 8px;
        svg {
          height: 20px;
          width: 20px;
        }
      }
    `,
  }

  const actions: TitleSection[] = useMemo(
    () => [
      {
        type: "actions",
        actions: [
          {
            icon: { image: RiSearchLine, color: fontColor },
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              setIsSearchOpen((x) => !x)
            },
            styles: actionStyle,
          },
          {
            icon: { image: RiMenuLine, color: fontColor },
            onClick: async () => {
              await setIsSearchOpen(false)
              await setActiveScreens([Screen.Sidebar])
            },
            styles: actionStyle,
          },
        ],
      },
    ],
    [theme],
  )

  return (
    <>
      <div
        onClick={() => setIsSearchOpen(false)}
        ref={titleRef}
        style={{ position: "relative" }}
      >
        <Title
          size="sm"
          text={title}
          styles={{
            containerStyle: css`
              padding: 10px 6px 10px 14px;
              background-color: ${bgColor};
              color: ${fontColor};
              align-items: center;
            `,
            titleStyle: css`
              color: ${fontColor};
            `,
            rightSectionStyle: css`
              gap: 2px;
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
