const path = require("path")

module.exports = {
  devServer: {
    // HMR is disabled when the dev server is started by Playwright (E2E=true).
    // An unsolicited reload during a long test resets scroll position and
    // causes tests to restart from verse 1, exceeding the 10-minute timeout.
    // sql.js WASM chunks cannot be hot-replaced anyway, so this is no loss.
    hot: !process.env.E2E,
    liveReload: !process.env.E2E,
  },

  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.experiments = {
        asyncWebAssembly: true,
        topLevelAwait: true,
      }

      return webpackConfig
    },

    alias: {
      "@constants": path.resolve(__dirname, "src/constants"),
      "@db": path.resolve(__dirname, "src/db"),
      "@hooks": path.resolve(__dirname, "src/ui/hooks"),
      "@i18n": path.resolve(__dirname, "src/i18n"),
      "@services": path.resolve(__dirname, "src/services"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@utils": path.resolve(__dirname, "src/utils"),
    },
  },

  jest: {
    configure: (jestConfig) => {
      jestConfig.roots = [
        ...(jestConfig.roots ?? ["<rootDir>/src"]),
        "<rootDir>/test/unit",
      ]
      jestConfig.testMatch = [
        ...(jestConfig.testMatch ?? []),
        "<rootDir>/test/unit/**/*.{spec,test}.{js,jsx,ts,tsx}",
      ]
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        "^@constants(.*)$": "<rootDir>/src/constants$1",
        "^@db(.*)$": "<rootDir>/src/db$1",
        "^@hooks(.*)$": "<rootDir>/src/ui/hooks$1",
        "^@i18n(.*)$": "<rootDir>/src/i18n$1",
        "^@services(.*)$": "<rootDir>/src/services$1",
      }
      // `marked` ships ESM-only (no CJS build) — carve it out of CRA's
      // default node_modules ignore so babel-jest transforms it to CJS.
      // pnpm nests packages as node_modules/.pnpm/marked@x/node_modules/marked/…,
      // so the exemption must scan the whole path, not just past the first
      // "node_modules/" segment.
      jestConfig.transformIgnorePatterns = (
        jestConfig.transformIgnorePatterns ?? []
      ).map((pattern) =>
        pattern === "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$"
          ? "^(?!.*node_modules[/\\\\]marked[/\\\\]).*node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$"
          : pattern,
      )
      return jestConfig
    },
  },
}
