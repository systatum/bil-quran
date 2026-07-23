import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"

export default function ExegesisDetail({
  goBack,
}: Partial<ScreenProps<Screen>>) {
  return (
    <div
      onClick={() => {
        goBack?.()
      }}
    >
      ExegesisDetail
    </div>
  )
}
