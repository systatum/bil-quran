import { Locale } from "@constants/settings"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { resolveLocale } from "@i18n"
import { messages } from "@i18n/message"
import { safePick } from "@services/picker"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { useNavigate } from "@tanstack/react-router"
import { SubItem, Text, Wrapper } from "@ui/fragments"
import { Screen } from "@ui/index"
import { useIntl } from "react-intl"
import { css } from "styled-components"
import Title from "../AppNavbar/Sidebar/Title"
import Headings from "../Headings"

export default function ExegesisDetail({
  goBack,
}: Partial<ScreenProps<Screen>>) {
  const navigate = useNavigate()
  const { formatMessage } = useIntl()
  const {
    userSettings: { theme, locale: rawLocale },
  } = useUserSettingsState()
  const { exegesisDetail, selectedExegesisId, setSelectedExegesisId } =
    useExegesisState()

  const locale = resolveLocale(rawLocale)
  const detail = selectedExegesisId ? exegesisDetail[selectedExegesisId] : null

  const bookName = safePick(detail?.name, locale, Locale.IntEnglish) ?? ""
  const descriptionParagraphs: string[] =
    safePick(detail?.longDescription, locale, Locale.IntEnglish) ?? []

  return (
    <>
      <Title
        contentType="exegesis-detail"
        onClosingSidebarRequested={() => {
          goBack?.()
          navigate({
            to: "/about",
            replace: true,
          })
          // only clear if nothing reopened a (possibly different) exegesis
          // detail in the meantime, or this stale timeout would clobber it
          const closingId = selectedExegesisId
          setTimeout(() => {
            if (useExegesisState.getState().selectedExegesisId === closingId) {
              setSelectedExegesisId(null)
            }
          }, 300)
        }}
        withAction={false}
      />

      <Wrapper
        $theme={theme}
        $style={css`
          justify-content: start;
          overflow: auto;
          min-height: 0;
          padding: 40px 20px;

          /* Firefox */
          scrollbar-width: thin;
          scrollbar-color: ${theme === "dark" ? "#555" : "#bbb"} transparent;

          /* Chrome, Edge, Safari */
          &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          &::-webkit-scrollbar-track {
            background: transparent;
          }

          &::-webkit-scrollbar-thumb {
            background: ${theme === "dark" ? "#555" : "#bbb"};
            border-radius: 999px;
          }

          &::-webkit-scrollbar-thumb:hover {
            background: ${theme === "dark" ? "#777" : "#999"};
          }
        `}
      >
        <div style={{ gap: "20px" }}>
          <div
            style={{
              gap: "20px",
              borderRadius: "10px",
              paddingTop: "20px",
              paddingBottom: "20px",
              background: theme === "dark" ? "#1a211d" : "#ededed",
            }}
          >
            <SubItem
              $style={css`
                gap: 14px;
              `}
            >
              {bookName && (
                <Headings.Third
                  $style={css`
                    font-weight: 600;
                  `}
                >
                  {bookName}
                </Headings.Third>
              )}
              {descriptionParagraphs.map((paragraph, i) => (
                <Text key={i}>{paragraph}</Text>
              ))}
            </SubItem>

            {detail && (
              <SubItem>
                <Headings.Third $fontWeight="600">
                  {formatMessage({ id: messages.about.source })}
                </Headings.Third>
                <Text>{detail.source}</Text>
              </SubItem>
            )}
          </div>
        </div>
      </Wrapper>
    </>
  )
}
