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

// ===== STRING ====================================

export function arabicLetterToLatin(letter: string): string {
  return ROOT_LETTER_LATIN[letter] ?? letter
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

const ROOT_LETTER_LATIN: Record<string, string> = {
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "ḥ",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "ṣ",
  ض: "ḍ",
  ط: "ṭ",
  ظ: "ẓ",
  ع: "ʿa",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
}
