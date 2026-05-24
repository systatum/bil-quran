// ===== NUMBER ======================================

export function isProperNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value)
}

// ===== OBJECT ======================================

export function isEqualShallow(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  if (a === b) return true

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false
    }

    const aVal = a[key]
    const bVal = b[key]

    if (aVal instanceof Date && bVal instanceof Date) {
      if (aVal.getTime() !== bVal.getTime()) return false
      continue
    }

    if (aVal !== bVal) return false
  }

  return true
}

/**
 * Check whether the value is a plain object
 */
export function isPlainObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
