/**
 * "Style" or "font" tradition with which to render the
 * Qur'an, as each locality may have different ligatures,
 * or rendering tradition, although strictly speaking still
 * exactly the same word, just a different artistic style.
 */
export interface RenderingRecord {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export const Rendering = {
  Standard: "standard",
}
export type Rendering = (typeof Rendering)[keyof typeof Rendering]
