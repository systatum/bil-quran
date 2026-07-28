const buildInfo =
  typeof window !== "undefined" ? window.__systatum_bilquran : undefined

export const ENV = {
  version: buildInfo?.version ?? process.env.REACT_APP_VERSION,
  releasedDate: buildInfo?.releaseDate ?? process.env.REACT_APP_RELEASED_DATE,
}
