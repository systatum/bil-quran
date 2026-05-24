import { IPCResponse } from "@constants/IPC"

// ===== ERROR ======================================

export function extractErrorMessage(err: unknown) {
  if (err == null) return ""

  const message = err instanceof Error ? err.message : String(err)
  return message
}

export function stringifyError(e: unknown) {
  const msg = extractErrorMessage(e)
  return e instanceof Error ? `${msg}\n\n${e.stack}` : msg
}

/**
 * Unpack data communicated through IPC. If the data itself
 * indicates an error, an error will be raised.
 *
 * @param resp the IPC response to unpack
 * @returns data communicated by the IPC
 */
export function unpackIPC<T>(resp: IPCResponse<T>): T {
  if (resp.succeed) return resp.data as T

  const message = resp.errors?.length
    ? resp.errors.join(". ")
    : "Unknown IPC error"
  throw new Error(message)
}
