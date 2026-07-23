import { useLayoutEffect, useRef, useState } from "react"
import styled, { css } from "styled-components"
import BookmarkList from "./BookmarkList"
import Title from "./Title"
import UserSettingsForm from "./UserSettingsForm"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import useAppState from "@hooks/states/AppState"

export default function Sidebar({
  goBack,
  goToScreen,
}: Partial<ScreenProps<Screen>>) {
  const { setIsSearchOpen } = useAppState()

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
    <>
      <div ref={titleRef}>
        <Title
          contentType={contentType}
          onClosingSidebarRequested={() => goBack?.()}
          onActionClicked={(c) => setContentType(c)}
        />
      </div>

      <Content>
        {contentType === ContentType.Settings && (
          <>
            <UserSettingsForm
              goToScreen={async (key) => {
                await setIsSearchOpen(false)
                await goToScreen?.(key as Screen)
              }}
            />
          </>
        )}
        {contentType === ContentType.Bookmarks && (
          <BookmarkList height={contentHeight} />
        )}
      </Content>
    </>
  )
}

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
