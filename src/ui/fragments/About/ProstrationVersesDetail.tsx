import { SajdahRuling, sajdahVerseListMarkdown } from "@constants/SajdahVerse"
import { ThoughtSchool } from "@constants/ThoughtSchool"
import useChaptersState from "@hooks/states/ChaptersState"
import usePaperDialogState from "@hooks/states/PaperDialogState"
import useUserSettingsState from "@hooks/states/UserSettingsState"
import { messages } from "@i18n/message"
import { readMarker, renderExegesisMarkdown } from "@services/markdown"
import { ScreenProps } from "@systatum/coneto/screen-transition"
import { StatefulForm } from "@systatum/coneto/stateful-form"
import { SubItem, Wrapper } from "@ui/fragments"
import { Screen } from "@ui/index"
import { MouseEvent, useMemo } from "react"
import { useIntl } from "react-intl"
import styled, { css } from "styled-components"
import { ContentType } from "../AppNavbar/Sidebar"
import Headings from "../Headings"

export default function ProstrationVersesDetail({
  goBack,
}: Partial<ScreenProps<Screen>>) {
  const intl = useIntl()
  const { formatMessage } = intl
  // formatMessage would choke on the literal <{[...]}> Q-markers as ICU args
  const rawMessage = (id: string) => intl.messages[id] as string
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  const { chapters } = useChaptersState()
  const { openExegesis } = usePaperDialogState()

  const handleClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a.inline-marker")
    if (!anchor) return
    e.preventDefault()
    const marker = readMarker(anchor)
    if (!marker) return
    const [type, ...args] = marker as [string, ...unknown[]]
    if (type !== "Q") return
    const [chapterId, verse] = String(args[0]).split(":").map(Number)
    openExegesis(chapterId, verse)
  }

  const hanafiList = useMemo(
    () => sajdahVerseListMarkdown(chapters, ThoughtSchool.SunniHanafi),
    [chapters],
  )
  const shafiiList = useMemo(
    () => sajdahVerseListMarkdown(chapters, ThoughtSchool.SunniShafii),
    [chapters],
  )
  const shiaWajibList = useMemo(
    () =>
      sajdahVerseListMarkdown(
        chapters,
        ThoughtSchool.ShiaJafari,
        SajdahRuling.Obligatory,
      ),
    [chapters],
  )
  const shiaMustahabList = useMemo(
    () =>
      sajdahVerseListMarkdown(
        chapters,
        ThoughtSchool.ShiaJafari,
        SajdahRuling.Recommended,
      ),
    [chapters],
  )

  const render = (markdown: string) => ({
    __html: renderExegesisMarkdown(markdown),
  })

  return (
    <>
      <Title
        contentType={ContentType.ProstrationVersesDetail}
        onClosingSidebarRequested={() => goBack?.()}
        withAction={false}
      />

      <Wrapper
        $theme={theme}
        onClick={handleClick}
        $style={css`
          justify-content: start;
          overflow: auto;
          min-height: 0;
          padding: 40px 20px;
          scrollbar-width: thin;
          scrollbar-color: ${theme === "dark" ? "#555" : "#bbb"} transparent;
        `}
      >
        <StatefulForm
          mobile
          styles={{
            containerStyle: css`
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
              name: "general",
              type: "custom",
              render: (
                <SubItem
                  $style={css`
                    gap: 14px;
                  `}
                >
                  <Headings.Third $fontWeight="600">
                    {formatMessage({ id: messages.sajdah.about.entryTitle })}
                  </Headings.Third>
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(
                      rawMessage(messages.sajdah.about.desc.general),
                    )}
                  />
                </SubItem>
              ),
            },
            {
              name: "sunni",
              type: "custom",
              render: (
                <SubItem
                  $style={css`
                    gap: 14px;
                  `}
                >
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(
                      rawMessage(messages.sajdah.about.desc.generalSunni),
                    )}
                  />
                  <Headings.Third $fontWeight="600">
                    {formatMessage({
                      id: messages.thoughtSchool[ThoughtSchool.SunniHanafi],
                    })}
                  </Headings.Third>
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(hanafiList)}
                  />
                  <Headings.Third $fontWeight="600">
                    {formatMessage({
                      id: messages.thoughtSchool[ThoughtSchool.SunniShafii],
                    })}
                  </Headings.Third>
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(shafiiList)}
                  />
                </SubItem>
              ),
            },
            {
              name: "shia",
              type: "custom",
              render: (
                <SubItem
                  $style={css`
                    gap: 14px;
                  `}
                >
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(
                      rawMessage(messages.sajdah.about.desc.generalShia),
                    )}
                  />
                  <Headings.Third $fontWeight="600">
                    {formatMessage({ id: messages.sajdah.wajib })}
                  </Headings.Third>
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(shiaWajibList)}
                  />
                  <Headings.Third $fontWeight="600">
                    {formatMessage({ id: messages.sajdah.mustahab })}
                  </Headings.Third>
                  <Content
                    $theme={theme}
                    dangerouslySetInnerHTML={render(shiaMustahabList)}
                  />
                </SubItem>
              ),
            },
          ]}
        />
      </Wrapper>
    </>
  )
}

const Content = styled.div<{ $theme: string }>`
  font-size: 0.95em;
  line-height: 1.8;
  color: ${({ $theme }) => ($theme === "dark" ? "#ece0c8" : "#1f1f1f")};

  p {
    margin: 0 0 0.9em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  em {
    color: ${({ $theme }) => ($theme === "dark" ? "#ccae6c" : "#3a5f8a")};
  }
  ul,
  ol {
    margin: 0 0 0.9em;
    padding-left: 1.4em;
  }
  ul {
    list-style: disc;
  }
  ol {
    list-style: number;
  }
  li {
    margin-bottom: 0.3em;
  }

  a.inline-marker {
    cursor: pointer;
  }
  a.marker-type-q {
    color: ${({ $theme }) => ($theme === "dark" ? "#9b9b9b" : "#886c36")};
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
`
