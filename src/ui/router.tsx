import { ReadingStyle } from "@constants/settings"
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router"
import UIIndex from "."
import ErrorRescuer from "../ErrorRescuer"
import Mushaf from "./fragments/Mushaf"
import useUserSettingsState from "./hooks/states/UserSettingsState"

const rootRoute = createRootRoute({
  component: () => (
    <ErrorRescuer>
      <Outlet />
    </ErrorRescuer>
  ),
  errorComponent: ({ error }) => {
    throw error
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // immediately switch to mushaf-mode if that's what the user set reading mode
  beforeLoad: () => {
    const { readingStyle } = useUserSettingsState.getState().userSettings
    if (readingStyle === ReadingStyle.Detached) return

    throw redirect({
      to: "/m/$mushaf/$page",
      params: { mushaf: "madinah", page: "1" },
    })
  },
  component: UIIndex,
})

const verseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$chapter/$verse",
  component: UIIndex,
})

const exegesisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e/$chapter/$verse",
  // Keep types as parsed; retyping here makes the router re-quote the URL. Coerce at the call site.
  validateSearch: (search: Record<string, unknown>) => ({
    tafsir: search.tafsir,
    transliteration: search.transliteration,
    locale: search.locale,
  }),
  component: () => <UIIndex openExegesisOnMount />,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: () => <UIIndex openAboutOnMount />,
})

const aboutScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about/$screen",
  component: () => <UIIndex openAboutOnMount />,
})

const mushafPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/m/$mushaf/$page",
  component: Mushaf,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  verseRoute,
  exegesisRoute,
  aboutRoute,
  aboutScreenRoute,
  mushafPageRoute,
])

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
})

// to enable property typing, typed params and navigation; without
// which tanstack router loses much of its typing prowess
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
