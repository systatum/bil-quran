import { Locale } from "@constants/settings"

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

/** Picks a value for `key`, falling back to `fallbackKey` then any available value. */
export function safePick<K extends PropertyKey, V>(
  record: Partial<Record<K, V>> | undefined,
  key: K,
  fallbackKey?: K,
): V | undefined {
  if (!record) return undefined
  return (
    record[key] ??
    (fallbackKey !== undefined ? record[fallbackKey] : undefined) ??
    (Object.values(record) as V[]).find(Boolean)
  )
}
