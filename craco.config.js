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
      "@db": path.resolve(__dirname, "src/db"),
      "@constants": path.resolve(__dirname, "src/constants"),
    },
  },
}
