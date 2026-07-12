import { DialogAction } from "@systatum/coneto/dialog"
import { ReactNode } from "react"

/**
 * What a dialog type needs to drive the single `<Dialog>` rendered by
 * `ModalDialog` — each dialog type defines its own config in its own
 * file/hook.
 */
export interface ModalDialogConfig {
  title: string
  actions: DialogAction[]
  body: ReactNode
  onAction: (buttonId: string) => void
}
