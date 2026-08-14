import { Dict } from "styled-components/dist/types"
import { isPlainObject } from "./checker"

// Re-exported for backward compat: pickLocalized itself now lives in ./picker.
export { pickLocalized } from "./picker"

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
 * Immutably set a value at a nested key path, spreading existing values at
 * each level. Missing intermediate objects are initialised as empty records.
 *
 * @example
 * mergeKeys({ a: { b: 1 } }, ["a", "c"], 2) // → { a: { b: 1, c: 2 } }
 */
export function mergeKeys<T extends Record<string | number, unknown>>(
  obj: T,
  keys: (string | number)[],
  value: unknown,
): T {
  const [head, ...tail] = keys
  return {
    ...obj,
    [head]:
      tail.length > 0
        ? mergeKeys(
            ((obj[head] ?? {}) as Record<string | number, unknown>),
            tail,
            value,
          )
        : value,
  } as T
}

/**
 * Create a pause that must be awaited before some
 * other action can be done
 */
export async function pause(ms: number) {
  return new Promise((f) => setTimeout(f, ms))
}

/**
 * Runs `queryChunk` over `items` in `chunkSize`-sized pieces, yielding
 * between each. A single query with thousands of `IN (...)` params is one
 * atomic sql.js call that can't be interrupted, so chunking has to happen
 * around the query itself rather than around its result.
 */
export async function queryInChunks<TItem, TResult>(
  items: TItem[],
  chunkSize: number,
  queryChunk: (chunk: TItem[]) => Promise<TResult[]>,
): Promise<TResult[]> {
  const results: TResult[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    results.push(...(await queryChunk(items.slice(i, i + chunkSize))))
    await pause(0)
  }
  return results
}
