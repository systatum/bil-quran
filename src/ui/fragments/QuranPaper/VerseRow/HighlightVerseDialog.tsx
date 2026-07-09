import { HighlightColor } from "@constants/highlight"
import { ModalDialogConfig } from "@constants/modalDialog"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { Combobox, ComboboxOption } from "@systatum/coneto/combobox"
import { useTheme } from "@systatum/coneto/theme"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useIntl } from "react-intl"
import styled from "styled-components"

const HIGHLIGHT_COLORS = [
  HighlightColor.Primary,
  HighlightColor.Secondary,
  HighlightColor.Tertiary,
]

/**
 * Config for the "Highlight this verse" dialog. `verseKey` is only passed
 * in while this is the active dialog — see `ModalDialog`.
 */
export function useHighlightVerseDialog(
  verseKey: string | undefined,
): ModalDialogConfig {
  const { formatMessage } = useIntl()
  const { mode: theme } = useTheme()
  const { userSettings, highlightVerse, removeHighlight } =
    useUserSettingsState()

  const existingColor = verseKey
    ? userSettings.highlightedVerses[verseKey]
    : undefined

  const [selectedColor, setSelectedColor] = useState<HighlightColor>(
    existingColor ?? HighlightColor.Primary,
  )

  // this hook stays mounted, so reset on verse change or it'd leak selection
  useEffect(() => {
    setSelectedColor(existingColor ?? HighlightColor.Primary)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKey])

  const colorOptions: ComboboxOption[] = useMemo(() => {
    const hexForTheme = HighlightColor.on(theme)

    return HIGHLIGHT_COLORS.map((color) => {
      const text = formatMessage({
        id: messages.highlightColor[String(color) as "1" | "2" | "3"],
      })

      return {
        value: color,
        text,
        render: (
          <ColorOptionRow>
            <ColorSwatch style={{ backgroundColor: hexForTheme[color] }} />
            {text}
          </ColorOptionRow>
        ),
      } satisfies ComboboxOption
    })
  }, [formatMessage, theme])

  // memoized to avoid an infinite loop in ModalDialog's report-up effect
  return useMemo<ModalDialogConfig>(
    () => ({
      title: formatMessage({ id: messages.dialog.highlightVerse.title }),
      actions: [
        { id: "cancel", caption: formatMessage({ id: messages.cancel }) },
        ...(existingColor != null
          ? [
              {
                id: "remove",
                caption: formatMessage({ id: messages.removeHighlight }),
                variant: "danger" as const,
              },
            ]
          : []),
        {
          id: "apply",
          caption: formatMessage({ id: messages.highlightAction }),
          variant: "primary" as const,
        },
      ],
      body: (
        <Combobox
          key={`${verseKey}-highlight`}
          mobile
          label={formatMessage({
            id: messages.dialog.highlightVerse.colorLabel,
          })}
          selectedOptions={selectedColor}
          onChange={(value) =>
            setSelectedColor(Number(value) as HighlightColor)
          }
          options={colorOptions}
        />
      ),
      onAction(buttonId) {
        if (verseKey == null) return
        if (buttonId === "remove") removeHighlight(verseKey)
        if (buttonId === "apply") {
          if (!highlightVerse(verseKey, selectedColor))
            toast.error("Failed highlighting verse")
        }
      },
    }),
    [
      formatMessage,
      existingColor,
      colorOptions,
      selectedColor,
      verseKey,
      highlightVerse,
      removeHighlight,
    ],
  )
}

const ColorOptionRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const ColorSwatch = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
`
