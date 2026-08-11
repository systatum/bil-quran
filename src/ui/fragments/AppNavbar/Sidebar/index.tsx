import useAppState from "@hooks/states/AppState"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import { useLayoutEffect, useRef, useState } from "react"
import styled from "styled-components"
import BookmarkList from "./BookmarkList"
import Title from "./Title"
import UserSettingsForm from "./UserSettingsForm"

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
    <Aside>
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
              goToScreen={async (screen) => {
                await setIsSearchOpen(false)
                await goToScreen?.(screen as Screen)
              }}
            />
          </>
        )}
        {contentType === ContentType.Bookmarks && (
          <BookmarkList height={contentHeight} />
        )}
      </Content>
    </Aside>
  )
}

// `display: contents` keeps this an invisible layout passthrough (identical
// to the fragment it replaces) while giving the sidebar an addressable
// `<aside>` landmark in the DOM.
const Aside = styled.aside`
  display: contents;
`

const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;

  /* allow vertical scrolling but hide the scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const ContentType = {
  Settings: "settings",
  Bookmarks: "bookmarks",
  Export: "export",
  Import: "import",
  ExegesisDetail: "exegesis-detail",
  ProstrationVersesDetail: "prostverses-detail",
  PrivacyPolicy: "privacy-policy",
} as const

export type ContentType = (typeof ContentType)[keyof typeof ContentType]
