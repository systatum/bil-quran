module.exports = {
  overrides: [
    {
      files: ["e2e/**/*.spec.ts"],
      rules: {
        "testing-library/prefer-screen-queries": "off",
      },
    },
  ],
}
