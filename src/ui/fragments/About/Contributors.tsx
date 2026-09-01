import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import { ContentType } from "../AppNavbar/Sidebar"
import Title from "../AppNavbar/Sidebar/Title"
import WrappedPoints from "./WrappedPoints"

const CONTRIBUTORS = ["Adam Noto Hakarsa", "Alim Naufal"]

type ContributorsProps = Partial<ScreenProps<Screen>>

export default function Contributors({ goBack }: ContributorsProps) {
  return (
    <>
      <Title
        onClosingSidebarRequested={() => goBack?.()}
        contentType={ContentType.Contributors}
        withAction={false}
      />
      <WrappedPoints
        points={[
          {
            title: "",
            content: CONTRIBUTORS.join(", "),
          },
        ]}
      />
    </>
  )
}
