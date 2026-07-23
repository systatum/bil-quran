import useExegesisState from "@hooks/states/ExegesisState"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { Screen } from "@ui/index"
import Title from "../AppNavbar/Sidebar/Title"
import { H2, H3, Item, SubItem, Text, Wrapper } from ".."
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { resolveLocale } from "@i18n"
import { css } from "styled-components"
import { StatefulForm } from "@systatum/coneto/stateful-form"

export default function ExegesisDetail({
  goBack,
}: Partial<ScreenProps<Screen>>) {
  const {
    userSettings: { theme, locale: rawLocale },
  } = useUserSettingsState()
  const { exegesisDetail, selectedExegesisId, setSelectedExegesisId } =
    useExegesisState()

  const locale = resolveLocale(rawLocale)
  const detail = selectedExegesisId ? exegesisDetail[selectedExegesisId] : null

  const authorName = detail?.authors.map((a) => a.name).join(", ")
  const descriptionParagraphs = detail?.longDescription?.[locale] ?? []

  return (
    <Wrapper
      $theme={theme}
      $style={css`
        min-height: max-content;
        justify-content: start;
      `}
    >
      <Title
        contentType="exegesis-detail"
        onClosingSidebarRequested={() => {
          goBack?.()
          setTimeout(() => {
            setSelectedExegesisId(null)
          }, 300)
        }}
        withAction={false}
      />

      <StatefulForm
        mobile
        styles={{
          containerStyle: css`
            padding: 10px 20px 40px 20px;
            gap: 20px;
          `,
          mobileFieldGroupStyle: css`
            gap: 20px;
            border-radius: 10px;
            padding-top: 20px;
            padding-bottom: 20px;

            background: ${theme === "dark" ? "#1a211d" : "#ededed"};
          `,
        }}
        formValues={{}}
        fields={[
          {
            name: "longDesc",
            type: "custom",

            render: (
              <SubItem
                $style={css`
                  gap: 14px;
                `}
              >
                {authorName && (
                  <H3
                    $style={css`
                      font-weight: 600;
                    `}
                  >
                    {authorName}
                  </H3>
                )}
                {descriptionParagraphs.map((paragraph, i) => (
                  <Text key={i}>{paragraph}</Text>
                ))}
              </SubItem>
            ),
          },
          {
            name: "longDesc",
            type: "custom",
            render: detail && (
              <SubItem>
                <H3
                  $style={css`
                    font-weight: 600;
                  `}
                >
                  Source
                </H3>
                <Text>{detail.source}</Text>
              </SubItem>
            ),
          },
        ]}
      />
    </Wrapper>
  )
}
