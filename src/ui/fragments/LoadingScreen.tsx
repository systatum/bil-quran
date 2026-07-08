import useAppState from "@hooks/states/AppState"
import { useEffect, useState } from "react"
import styled from "styled-components"

const IMAGES = Array.from({ length: 8 }, (_, i) => `/mosques/${i + 1}_1.jpg`)

/**
 * How long each image stays fully visible.
 */
const DISPLAY_DURATION = 1500

/**
 * Duration of the fade transition.
 * Must match CSS transition duration below.
 */
const FADE_DURATION = 2500

/**
 * Zoom effect duration.
 */
const KEN_BURNS_DURATION = 2500

export default function LoadingScreen() {
  const [current, setCurrent] = useState(() => {
    return Math.floor(Math.random() * IMAGES.length)
  })

  const [next, setNext] = useState(() => {
    const start = Math.floor(Math.random() * IMAGES.length)
    return (start + 1) % IMAGES.length
  })

  const [showNext, setShowNext] = useState(false)
  const { loadingText } = useAppState()

  // preload everything once
  useEffect(() => {
    IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextIndex = (current + 1) % IMAGES.length

      setNext(nextIndex)
      setShowNext(true)

      window.setTimeout(() => {
        setCurrent(nextIndex)
        setShowNext(false)
      }, FADE_DURATION)
    }, DISPLAY_DURATION)

    return () => clearInterval(interval)
  }, [current])

  return (
    <Container>
      <Background
        key={`current-${current}`}
        style={{
          backgroundImage: `url(${IMAGES[current]})`,
        }}
      />

      <Background
        key={`next-${next}`}
        $visible={showNext}
        style={{
          backgroundImage: `url(${IMAGES[next]})`,
        }}
      />

      <Overlay />

      <Content>
        <Logo src="/logo_full.png" alt="logo" />
        <Title>Bil-Quran</Title>
        <Subtitle>{loadingText}</Subtitle>
      </Content>
    </Container>
  )
}

const Container = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
`

const Background = styled.div<{
  $visible?: boolean
}>`
  position: absolute;
  inset: 0;

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  opacity: ${({ $visible }) => ($visible ? 1 : 0)};

  transition: opacity ${FADE_DURATION}ms ease-in-out;

  &:first-child {
    opacity: 1;
  }

  animation: kenburns ${KEN_BURNS_DURATION}ms linear forwards;

  @keyframes kenburns {
    from {
      transform: scale(1);
    }

    to {
      transform: scale(1.08);
    }
  }
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;

  background: linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.55));
`

const Content = styled.div`
  position: relative;
  z-index: 1;

  height: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: white;
`

const Logo = styled.img`
  width: 96px;
`

const Title = styled.h1`
  margin-top: 20px;
  font-size: 32px;
  font-weight: 600;
`

const Subtitle = styled.div`
  margin-top: 12px;
  opacity: 0.85;
`
