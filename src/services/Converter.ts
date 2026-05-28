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

// ===== OBJECT =====================================

export function flattenObject(
  obj: Record<string, any>,
  prefix = "",
): Record<string, string> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === "object" && value !== null) {
        Object.assign(acc, flattenObject(value, nextKey))
      } else {
        acc[nextKey] = value
      }

      return acc
    },
    {} as Record<string, string>,
  )
}

// ===== STRING =====================================

/**
 * Move Arabic kasra (ِ) below shadda (ّ) when they appear in the wrong order.
 *
 * Example:
 *   يُهَيِّئْ
 * becomes:
 *   يُهَيِّئْ
 *
 * Unicode:
 *   Shadda = \u0651
 *   Kasra  = \u0650
 *
 * Wrong order:
 *   kasra + shadda
 *
 * Correct order:
 *   shadda + kasra
 */
export function normalizeArabicDiacritics(text: string): string {
  // Replace: kasra + shadda
  // With:    shadda + kasra
  return text.replace(/\u0650\u0651/g, "\u0651\u0650")
}

// Example
const input = "وَيُهَيِّئْ"
const output = normalizeArabicDiacritics(input)

console.log(output)
