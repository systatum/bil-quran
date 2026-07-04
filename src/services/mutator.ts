import { Locale } from "@constants/settings"
import { Dict } from "styled-components/dist/types"
import { isPlainObject } from "./checker"

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/**
 * Recursively merges values from `source` into `target`,
 * but only for keys that already exist in `target`.
 *
 * Rules:
 * - Unknown keys from `source` are ignored.
 * - Nested objects are merged recursively.
 * - Primitive values overwrite existing target values.
 * - Arrays are treated as direct values and replaced entirely.
 */
export function mergeKnownKeys(target: Dict, source: Dict): Dict {
  const result: Dict = { ...target }

  for (const key of Object.keys(target)) {
    if (!(key in source)) continue

    const targetValue = target[key]
    const sourceValue = source[key]

    const shouldMergeRecursively =
      isPlainObject(targetValue) && isPlainObject(sourceValue)
    if (shouldMergeRecursively) {
      result[key] = mergeKnownKeys(targetValue, sourceValue)
      continue
    }

    result[key] = sourceValue
  }

  return result
}

export function makeSnippet<T>(
  words: T[],
  targetIndex: number,
  preCounter?: (words: T[], targetIndex: number) => number,
): T[] {
  const length = words.length
  // shorter verses show more context, longer verses proportionally less
  const count = Math.ceil(Math.sqrt(length) * 2)

  // random 1–5 words before the target, or calculate using
  // custom logic, if provided
  const preTarget = preCounter
    ? preCounter(words, targetIndex)
    : Math.floor(Math.random() * 5) + 1

  // how many words exist after the target?
  const remainingAfter = length - targetIndex - 1

  const afterCount: number =
    remainingAfter <= 3
      ? remainingAfter // show everything if only a few words remain
      : Math.min(remainingAfter, ((preTarget * 7 + 2) % 5) + 4) // deterministic, but never exceed what exists

  const start = Math.max(0, targetIndex - preTarget)
  const end = Math.min(length, targetIndex + afterCount + 1)

  return words.slice(start, end)
}

/**
 * From a partial locale-keyed record, extract the present entries and map each
 * value through `pick`. Only locales that exist in the source are included.
 *
 * @example
 * pickLocalized({ "en-US": "Hello", "id-ID": "Halo" }, (v) => v.toUpperCase())
 * // → { "en-US": "HELLO", "id-ID": "HALO" }
 */
export function pickLocalized<V, R>(
  record: Partial<Record<Locale, V>>,
  pick: (value: V) => R,
): Partial<Record<Locale, R>> {
  return Object.fromEntries(
    (Object.values(Locale) as Locale[])
      .filter((l) => record[l] != null)
      .map((l) => [l, pick(record[l]!)]),
  ) as Partial<Record<Locale, R>>
}

/**
 * Create a pause that must be awaited before some
 * other action can be done
 */
export async function pause(ms: number) {
  return new Promise((f) => setTimeout(f, ms))
}
