import useUserSettingsState from "@hooks/states/UserSettingsState"
import { renderExegesisMarkdown } from "@services/markdown"
import { SubItem, Text, Wrapper } from "@ui/fragments"
import { css, styled } from "styled-components"
import Headings from "../Headings"

interface WrappedPoint {
  title: string
  content: string
}
export interface WrappedPointsProps {
  points: WrappedPoint[]
}

export default function WrappedPoints({ points }: WrappedPointsProps) {
  const {
    userSettings: { theme },
  } = useUserSettingsState()
  return (
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
      <PointsList>
        {points.map((point, index) => (
          <Point
            key={index}
            style={{
              background: theme === "dark" ? "#1a211d" : "#ededed",
            }}
          >
            <SubItem
              $style={css`
                width: 100%;
                gap: 14px;
              `}
            >
              {point.title && (
                <Headings.Third
                  $style={css`
                    font-weight: 600;
                  `}
                >
                  {point.title}
                </Headings.Third>
              )}
              <Text
                dangerouslySetInnerHTML={{
                  __html: renderExegesisMarkdown(point.content),
                }}
              />
            </SubItem>
          </Point>
        ))}
      </PointsList>
    </Wrapper>
  )
}

const PointsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 300px;
  max-width: 350px;

  @media (max-width: 370px) {
    width: 80vw;
    min-width: 300px;
  }

  @media (min-width: 370px) and (max-width: 700px) {
    width: 60vw;
    max-width: 300px;
  }
`

const Point = styled.div`
  padding: 25px;
  border-radius: 10px;
  padding-top: 20px;
  padding-bottom: 20px;

  p {
    margin-bottom: 1em;
  }
`
