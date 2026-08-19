import { PaperDialog } from "@systatum/coneto/paper-dialog"
import { css } from "styled-components"
import {
  ExegesisPreviewContent,
  ExegesisPreviewShellProps,
} from "./Content"

/**
 * Read-only preview of the exegesis dialog, fed by direct asset fetches
 * instead of the seeded DB. Shown while the real app bootstraps.
 *
 * Wraps the actual content in the same sheet chrome the real dialog uses, so
 * swapping to the real dialog once bootstrap finishes doesn't visibly jump.
 */
export default function ExegesisPreviewShell(props: ExegesisPreviewShellProps) {
  return (
    <PaperDialog
      mobile
      height="55dvh"
      width="100dvw"
      initialDialogState="restored"
      skipInitialAnimation
      closable={false}
      controls={[]}
      styles={{
        containerStyle: css`
          border: none;
        `,
        indicatorStyle: css`
          height: 40px;
        `,
        contentStyle: css`
          gap: 0px;
          padding: 0px;
        `,
      }}
    >
      <ExegesisPreviewContent {...props} />
    </PaperDialog>
  )
}
