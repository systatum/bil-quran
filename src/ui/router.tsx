import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import UIIndex from "."
import ErrorRescuer from "../ErrorRescuer"

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
  }),
  component: () => <UIIndex openExegesisOnMount />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  verseRoute,
  exegesisRoute,
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
