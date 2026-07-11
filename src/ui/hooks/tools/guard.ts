import { IPCResponse } from "@constants/IPC"
import { unpackIPC } from "@services/Converter.js"
import LOGGER from "@services/Logger"
import { Toast } from "@systatum/coneto/toast"

type GuardCallbackFnContext = {
  /**
   * Returns an unpacked data, or raise an error if there's an issue
   *
   * @param resp the IPC response
   * @returns unpacked data
   */
  unpackIPC: <T>(resp: IPCResponse<T>) => T
}

type GuardCallbackFn<T = unknown> = (
  arg: GuardCallbackFnContext,
) => T | Promise<T>

type GuardOptions = {
  onError?: (err: unknown) => void
  finally?: () => void
}

/**
 * Perform some action safely, catching any errors, and perform optional
 * action if set
 *
 * @param f risky performance
 * @param cleanup function to run if operation failed
 */
export async function guard<T>(
  f: GuardCallbackFn<T>,
  options?: GuardOptions,
): Promise<T | undefined> {
  const ctx: GuardCallbackFnContext = {
    unpackIPC,
  }

  try {
    return await f(ctx)
  } catch (error) {
    LOGGER.error(`Application error: ${error}`)

    if (options?.onError) options.onError(error)
    else
      Toast.danger({
        title: "Application failed",
        content: "Application failed. Please report to us.",
      })
  } finally {
    options?.finally?.()
  }

  return undefined
}
