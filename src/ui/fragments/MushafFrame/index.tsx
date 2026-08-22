import { ReactNode } from "react"
import Frame from "../Frame"

interface MushafFrameProps {
  children?: ReactNode
}

export default function MushafFrame({ children }: MushafFrameProps) {
  return (
    <Frame
      cornerSrc="/frames/mushaf-madinah/corner.png"
      edgeTopSrc="/frames/mushaf-madinah/edge-top.png"
      edgeLeftSrc="/frames/mushaf-madinah/edge-left.png"
    >
      {children}
    </Frame>
  )
}
