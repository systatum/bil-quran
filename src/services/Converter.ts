import {
  Asset,
  DEFAULT_FEED_EXEGESIS_WORK,
  ExegesisWork,
} from "@constants/assets"
import { IPCResponse } from "@constants/IPC"
import { Locale } from "@constants/settings"

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

/** Base64-encodes a Unicode string (plain `btoa` only handles Latin1). */
export function encodeBase64Unicode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

/** Inverse of {@link encodeBase64Unicode}. Throws if `str` isn't valid base64. */
export function decodeBase64Unicode(str: string): string {
  const binary = atob(str)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
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

// ===== URL ========================================

const EXEGESIS_HASH_RE = /^#\/e\/(\d+)\/(\d+)(?:\?(.*))?$/

export interface ExegesisDeepLink {
  chapterId: number
  verseNumber: number
  tafsirParam?: string
  transliterationParam?: string
}

/** Parses an `#/e/:chapter/:verse` hash without needing the router mounted. */
export function parseExegesisDeepLink(hash: string): ExegesisDeepLink | null {
  const match = EXEGESIS_HASH_RE.exec(hash)
  if (!match) return null

  const [, chapter, verse, query] = match
  const params = new URLSearchParams(query ?? "")

  return {
    chapterId: Number(chapter),
    verseNumber: Number(verse),
    tafsirParam: params.get("tafsir") ?? undefined,
    transliterationParam: params.get("transliteration") ?? undefined,
  }
}

export interface ExegesisSelectionOverride {
  exegesisId?: string
  showTransliteration?: boolean
}

/** Mirrors `UIIndex`'s `openExegesisOnMount` override resolution. */
export function resolveExegesisSelection(
  tafsirParam: unknown,
  transliterationParam: unknown,
  locale: Locale,
): ExegesisSelectionOverride {
  const tafsir = tafsirParam != null ? String(tafsirParam) : undefined
  const exegesisId = tafsir
    ? Asset.resolveExegesisId(
        ExegesisWork.isValid(tafsir) ? tafsir : DEFAULT_FEED_EXEGESIS_WORK,
        locale,
      )
    : undefined

  return {
    exegesisId: exegesisId ?? undefined,
    showTransliteration: String(transliterationParam) === "1" ? true : undefined,
  }
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
