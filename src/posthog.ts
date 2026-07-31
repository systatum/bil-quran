import posthog from "posthog-js"

const projectToken = process.env.REACT_APP_POSTHOG_PROJECT_TOKEN
const host = process.env.REACT_APP_POSTHOG_HOST

export const isPostHogConfigured = Boolean(projectToken && host)

if (isPostHogConfigured) {
  posthog.init(projectToken!, {
    api_host: host!,
    capture_exceptions: true,
    debug: process.env.NODE_ENV !== "production",
  })
}

export default posthog
