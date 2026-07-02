const path = require("path")

module.exports = {
  devServer: {
    // Disable HMR and live-reload so the dev server never pushes unsolicited
    // reload signals to connected browsers.  Any such signal during a long
    // Playwright test (e.g. the full-Quran scroll) resets the browser's scroll
    // position and causes the test to restart from verse 1, ballooning runtime
    // well beyond the 10-minute timeout.  Developers refresh the browser
    // manually after file changes (HMR is a convenience, not required here
    // because sql.js WASM chunks cannot be hot-replaced anyway).
    hot: false,
    liveReload: false,
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
      return jestConfig
    },
  },
}
