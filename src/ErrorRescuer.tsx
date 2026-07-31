import useAppState from "@hooks/states/AppState"
import Tracker from "@services/Tracker"
import React, { type ErrorInfo } from "react"
import { stringifyError } from "./services/Converter"
import LOGGER from "./services/Logger"
import ErrorScreen from "./ui/fragments/ErrorScreen"

type Props = { children: React.ReactNode }

type State = {
  hasError: boolean
  debugLog: string
  error: unknown
}

export default class ErrorRescuer extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    debugLog: "",
    error: null,
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      debugLog: stringifyError(error),
      error,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    LOGGER.error("App error", error, info.componentStack)
    Tracker.captureException(error)
    useAppState.getState().pushError(error)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />
    }

    return this.props.children
  }
}
