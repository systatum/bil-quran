import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import UIIndex from "."

const rootRoute = createRootRoute({
  component: () => <Outlet />,
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

const routeTree = rootRoute.addChildren([indexRoute, verseRoute])

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
