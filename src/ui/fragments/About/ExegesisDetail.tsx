import { Locale } from "@constants/settings"
import useExegesisState from "@hooks/states/ExegesisState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { resolveLocale } from "@i18n"
import { messages } from "@i18n/message"
import { safePick } from "@services/picker"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { useNavigate } from "@tanstack/react-router"
import { Screen } from "@ui/index"
import { useIntl } from "react-intl"
import Title from "../AppNavbar/Sidebar/Title"
import WrappedPoints from "./WrappedPoints"

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

      <WrappedPoints
        points={[
          {
            title: bookName,
            content: descriptionParagraphs.join("\n\n"),
          },
          {
            title: formatMessage({ id: messages.about.source }),
            content: detail?.source ?? "",
          },
        ]}
      />
    </>
  )
}
