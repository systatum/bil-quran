import { ThemeMode } from "@constants/theme"
import { useLayoutEffect, useRef, useState } from "react"
import styled, { css } from "styled-components"
import BookmarkList from "./BookmarkList"
import Title from "./Title"
import UserSettingsForm from "./UserSettingsForm"
import useAppState from "@hooks/states/AppState"
import { Item, Wrapper } from "@ui/fragments"

interface SidebarProps {
  theme: ThemeMode
  visible: boolean
  onClosingSidebarRequested: () => void
}

export default function Sidebar({
  theme,
  visible,
  onClosingSidebarRequested,
}: SidebarProps) {
  const titleRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [contentType, setContentType] = useState<ContentType>(
    ContentType.Settings,
  )

  useLayoutEffect(() => {
    const updateHeight = () => {
      const titleHeight = titleRef.current?.offsetHeight ?? 0
      setContentHeight(window.innerHeight - titleHeight)
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)

    return () => {
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  return (
    <SidebarContainer theme={theme} $visible={visible}>
      <div ref={titleRef}>
        <Title
          contentType={contentType}
          onClosingSidebarRequested={onClosingSidebarRequested}
          onActionClicked={(c) => setContentType(c)}
        />
      </div>

      <Content>
        {contentType === ContentType.Settings && (
          <>
            <UserSettingsForm
              key={String(visible) /* `key` forces re-mount */}
            />
          </>
        )}
        {contentType === ContentType.Bookmarks && (
          <BookmarkList height={contentHeight} />
        )}
      </Content>
    </SidebarContainer>
  )
}

const SidebarContainer = styled.aside<{
  theme: ThemeMode
  $visible: boolean
}>`
  background: ${({ theme }) => (theme === "dark" ? "#202b24" : "#e1dfda")};
  position: fixed;
  inset: 0 0 0 auto;

  top: 0;
  right: 0;
  height: 100dvh;
  width: 40vw;
  min-width: 350px;
  max-width: 400px;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  transform: translateX(${(p) => (p.$visible ? "0%" : "100%")});
  transition: transform 0.22s ease;
  z-index: 9991999;

  display: flex;
  flex-direction: column;

  /* 0-450px */
  @media (max-width: 370px) {
    width: 80vw;
    min-width: 300px;
  }

  /* 450-700px */
  @media (min-width: 370px) and (max-width: 700px) {
    width: 60vw;
    max-width: 350px;
  }
`

const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`

export const ContentType = {
  Settings: "settings",
  Bookmarks: "bookmarks",
  Export: "export",
  Import: "import",
  ExegesisDetail: "exegesis-detail",
} as const

export type ContentType = (typeof ContentType)[keyof typeof ContentType]
