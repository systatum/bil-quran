import React, { type ErrorInfo } from "react"
import { stringifyError } from "./services/Converter"
import LOGGER from "./services/Logger"

type Props = { children: React.ReactNode }
type State = { hasError: boolean; debugLog: string }

export default class ErrorRescuer extends React.Component<Props, State> {
  state: State = { hasError: false, debugLog: "" }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, debugLog: stringifyError(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log("CATCHING!")
    LOGGER.error("App error", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen debugLog={this.state.debugLog} />
    } else {
      return this.props.children
    }
  }
}

interface ErrorScreenProps {
  debugLog: string
}
function ErrorScreen({ debugLog }: ErrorScreenProps) {
  return <>{debugLog}</>
}
