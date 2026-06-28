import { ThemeMode } from "@constants/theme"
import usePositioningObserver from "@hooks/tools/usePositioningObserver"
import { RiMenuLine, RiSearchLine } from "@remixicon/react"
import {
  OverlayBlocker,
  OverlayBlockerRef,
} from "@systatum/coneto/overlay-blocker"
import { Title, TitleSection } from "@systatum/coneto/title"
import { Ref, useMemo, useRef, useState } from "react"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import { SearchSheet } from "./SearchSheet"
import Sidebar from "./Sidebar"

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
  const intl = useIntl()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const fontColor = theme === "dark" ? "#6e9370" : "#fff0d3"
  const bgColor = theme === "dark" ? "#22271b" : "rgb(117 95 77)"

  const titleRef = useRef<HTMLDivElement>(null)
  const overlayBlockerRef: Ref<OverlayBlockerRef> = useRef(null)
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
            onClick: () => setIsSidebarOpen((x) => !x),
          },
        ],
      },
    ],
    [theme],
  )

  return (
    <>
      <div ref={titleRef}>
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
      </div>

      {(isSidebarOpen || isSearchOpen) && (
        <OverlayBlocker
          ref={overlayBlockerRef}
          exemptRegions={["#combo-list", "#bookmark-list"]}
          show={isSidebarOpen || isSearchOpen}
          onClick={({ close }) => {
            setIsSidebarOpen(false)
            setIsSearchOpen(false)
            close()
          }}
        />
      )}

      <Sidebar
        theme={theme}
        visible={isSidebarOpen}
        onClosingSidebarRequested={() => {
          overlayBlockerRef?.current?.close()
          setIsSidebarOpen(false)
          setIsSearchOpen(false)
        }}
      />

      <SearchSheet
        isOpen={isSearchOpen}
        navbarPositioning={navbarPositioning}
        onAfterSearch={() => setIsSearchOpen(false)}
      />
    </>
  )
}
