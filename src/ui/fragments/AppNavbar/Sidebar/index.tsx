// import * as Coneto from "@systatum/coneto/sidebar"
// import { css } from "styled-components"
// export default function Sidebar() {
//   return (
//     <>
//       <Coneto.Sidebar.Spacer />

import { ThemeMode } from "@constants/theme"
import { useState } from "react"
import styled from "styled-components"
import Title from "./Title"
import UserSettingsForm from "./UserSettingsForm"

//       <Coneto.Sidebar
//         position="right"
//         styles={{
//           mobileStyle: css`
//             min-width: 80vw;
//           `,
//           desktopStyle: css`
//             min-width: 60vw;
//           `,
//         }}
//       >
//         <Coneto.Sidebar.Item isFixed>
//           <div>Fixed content</div>
//         </Coneto.Sidebar.Item>
//       </Coneto.Sidebar>
//     </>
//   )
// }

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
  const [contentType, setContentType] = useState<ContentType>(
    ContentType.Settings,
  )

  return (
    <SidebarContainer theme={theme} $visible={visible}>
      <Title
        contentType={contentType}
        onClosingSidebarRequested={onClosingSidebarRequested}
        onActionClicked={(c) => setContentType(c)}
      />
      <div style={{ padding: "24px" }}>
        {contentType === ContentType.Settings && <UserSettingsForm />}
      </div>
    </SidebarContainer>
  )
}

const SidebarContainer = styled.aside<{
  theme: ThemeMode
  $visible: boolean
}>`
  background: ${({ theme }) => (theme === "dark" ? "#202b24" : "#e1dfda")};
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 40vw;
  min-width: 350px;
  max-width: 400px;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  transform: translateX(${(p) => (p.$visible ? "0%" : "100%")});
  transition: transform 0.22s ease;
  z-index: 9992999;

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

export const ContentType = {
  Settings: "settings",
  Bookmarks: "bookmarks",
} as const

export type ContentType = (typeof ContentType)[keyof typeof ContentType]
