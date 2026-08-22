import { ReactNode } from "react"
import styled, { type CSSProp } from "styled-components"

interface FrameProps {
  /** Corner ornament, reused (mirrored) for all 4 corners. */
  cornerSrc: string
  /** Repeatable strip tiled along the top/bottom edges. */
  edgeTopSrc: string
  /** Repeatable strip tiled along the left/right edges. */
  edgeLeftSrc: string
  /** Border thickness as a share of the frame's own width/height. */
  thicknessX?: string
  thicknessY?: string
  children?: ReactNode
  style?: CSSProp
}

export default function Frame({
  cornerSrc,
  edgeTopSrc,
  edgeLeftSrc,
  thicknessX = "15.5%",
  thicknessY = "11%",
  children,
  style,
}: FrameProps) {
  return (
    <Grid $thicknessX={thicknessX} $thicknessY={thicknessY} $style={style}>
      <Corner src={cornerSrc} style={{ gridArea: "1 / 1" }} />
      <EdgeX $src={edgeTopSrc} style={{ gridArea: "1 / 2" }} />
      <Corner $flipX src={cornerSrc} style={{ gridArea: "1 / 3" }} />

      <EdgeY $src={edgeLeftSrc} style={{ gridArea: "2 / 1" }} />
      <Content style={{ gridArea: "2 / 2" }}>{children}</Content>
      <EdgeY $flipX $src={edgeLeftSrc} style={{ gridArea: "2 / 3" }} />

      <Corner $flipY src={cornerSrc} style={{ gridArea: "3 / 1" }} />
      <EdgeX $flipY $src={edgeTopSrc} style={{ gridArea: "3 / 2" }} />
      <Corner $flipX $flipY src={cornerSrc} style={{ gridArea: "3 / 3" }} />
    </Grid>
  )
}

const Grid = styled.div<{
  $thicknessX: string
  $thicknessY: string
  $style?: CSSProp
}>`
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns:
    ${({ $thicknessX }) => $thicknessX} 1fr
    ${({ $thicknessX }) => $thicknessX};
  grid-template-rows:
    ${({ $thicknessY }) => $thicknessY} 1fr
    ${({ $thicknessY }) => $thicknessY};

  ${({ $style }) => $style}
`

const Corner = styled.img<{ $flipX?: boolean; $flipY?: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(
    ${({ $flipX }) => ($flipX ? -1 : 1)},
    ${({ $flipY }) => ($flipY ? -1 : 1)}
  );
`

const EdgeX = styled.div<{ $src: string; $flipY?: boolean }>`
  width: 100%;
  height: 100%;
  background-image: url(${({ $src }) => $src});
  background-repeat: repeat-x;
  background-size: auto 100%;
  transform: scaleY(${({ $flipY }) => ($flipY ? -1 : 1)});
`

const EdgeY = styled.div<{ $src: string; $flipX?: boolean }>`
  width: 100%;
  height: 100%;
  background-image: url(${({ $src }) => $src});
  background-repeat: repeat-y;
  background-size: 100% auto;
  transform: scaleX(${({ $flipX }) => ($flipX ? -1 : 1)});
`

const Content = styled.div`
  width: 100%;
  height: 100%;
  /* without these, a 1fr grid track can grow to fit overflowing content
     instead of respecting its share, pushing the border rows/columns */
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.6) transparent;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.6);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`
