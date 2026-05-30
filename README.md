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
- Better typing (ie for the user settings)
- Add more word-by-word translation: Indonesian
- Ability to bookmark any verse and go to that any moment
- Store number of verses in each chapter, so that the verse lookup component can display verse number rather than making user type
- Can lookup by: chapter:verse, juz, root word, and verse theme.

## Stack

- React via create-react-app (webpack stack)
- TanStack router for navigation, instead of react-router-dom, as it's strongly typed

## Test to be made

- [ ] Selecting/changing theme should be recorded/persisted (event after reload)
- [ ] Can change font, and when changing the font, all the rows are calculated correctly (the distance between one verse row to another is 0, check for all the first 100 rows, and change one by one from one font to another).
  - and when revisiting the page should read/use the same font
- [ ] Can go to specific chapter and verse of the Quran through the lookup form
- [ ] Test when user translations has English and Indonesian, both are shown fine on first load (Indonesian is not the default). This is to test first pre-flight translation downloading and insertion works.
- [ ] Test seeing "Seeding verses..." and "Preparing the layout..." in that sequence
- [ ] When hard-pressing each word in the verse, show the paper dialog, with all proper information
