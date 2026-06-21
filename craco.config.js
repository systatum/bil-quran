const path = require("path")

module.exports = {
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
    },
  },

  jest: {
    configure: (jestConfig) => {
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
