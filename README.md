# bil-quran

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

- `pnpm start`: Starts the development server.
- `pnpm run build`: Bundles the app into static files for production.
- `pnpm test`: Starts the test runner.
- `pnpm run deploy`: Cause `predeploy` and `deploy` script to run.

  Under the hood, the `predeploy` script will build a distributable version of the React app and store it in a folder named `build`. Then, the deploy script will push the contents of that folder to a new commit on the `gh-pages` branch of the GitHub repository, creating that branch if it doesn't already exist.

  Then, the app will be visible at: [systatum.github.io/bil-quran](https://systatum.github.io/bil-quran/)

Scrolling works by using hash router, ie: https://bil-quran.com/#/c/11/12

## If I had more time

- Better scroll preservation (both saving and restoring the position)
- Better data handling (use zustand to centralize data)
- Better typing (ie for the user settings)
- Add more word-by-word translation: Indonesian
- Restructure chapter reading to be just "reading" (instead of `enReading`) and make it JSON, similarly for "translation"
- Add centralized storage (so we don't load multiple times on: chapters)
- Ability to bookmark any verse and go to that any moment
- Store number of verses in each chapter, so that the verse lookup component can display verse number rather than making user type

## Stack

- React via create-react-app (webpack stack)
- TanStack router for navigation, instead of react-router-dom, as it's strongly typed
