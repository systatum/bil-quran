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
