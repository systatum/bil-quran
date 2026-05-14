# bil-quran

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

- `pnpm start`: Starts the development server.
- `pnpm run build`: Bundles the app into static files for production.
- `pnpm test`: Starts the test runner.
- `pnpm run deploy`: Cause `predeploy` and `deploy` script to run.

  Under the hood, the `predeploy` script will build a distributable version of the React app and store it in a folder named `build`. Then, the deploy script will push the contents of that folder to a new commit on the `gh-pages` branch of the GitHub repository, creating that branch if it doesn't already exist.

  Then, the app will be visible at: [systatum.github.io/bil-quran](https://systatum.github.io/bil-quran/)

## If I had more time

- Better scroll restoration
