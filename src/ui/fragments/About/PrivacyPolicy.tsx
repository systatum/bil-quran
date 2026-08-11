import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import Title from "../AppNavbar/Sidebar/Title"
import { ContentType } from "../AppNavbar/Sidebar"
import { useEffect, useState } from "react"

type PrivacyPolicy = Partial<ScreenProps<Screen>>

export default function PrivacyPolicy({ goBack }: PrivacyPolicy) {
  const [privacyPolicy, setPrivacyPolicy] = useState("")

  useEffect(() => {
    fetch("/PrivacyPolicy.md")
      .then((response) => response.text())
      .then(setPrivacyPolicy)
  }, [])

  return (
    <>
      <Title
        onClosingSidebarRequested={() => goBack?.()}
        contentType={ContentType.PrivacyPolicy}
        withAction={false}
      />
      {privacyPolicy}
    </>
  )
}
