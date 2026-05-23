import { stringifyError } from "./Converter"

class Logger {
  /**
   * Logs a debug message with any number of additional arguments.
   * whereby each argument is normalized into a safe, readable string
   * before logging. In case there's any error in the stringification
   * process, an empty string is returned safely so as not to disturb
   * user's actual intent to log.
   *
   * @param msg - Primary debug message.
   * @param args - Additional values to append to the message.
   */
  debug(msg: any, ...args: unknown[]) {
    args = args.map((arg) => {
      try {
        const objType = typeof arg
        if (arg instanceof Error) return stringifyError(arg)
        else if (objType === "object") return JSON.stringify(arg)
        else if (objType === "function") return "<function-given>"
        else if (objType === "undefined") return "<undefined>"
        else return String(arg)
      } catch (e) {
        LOGGER.error(e)
        return ""
      }
    })

    if (Array.isArray(args) && args.length > 0)
      msg = `${msg}: ${args.join(". ")}`

    console.debug(msg)
  }

  error(msg: any, error?: unknown, stackInfo?: string | null) {
    msg = `${msg}: \`${stringifyError(error)}'`
    if (typeof stackInfo === "string") {
      msg += `\n    Stacktrace: ${stackInfo}`
    }
    console.error(msg)
  }
}

const LOGGER = new Logger()
export default LOGGER
