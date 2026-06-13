# bil-quran

Bil-Quran is an Qur'an app where translation is provided interlinear (or word-by-word/verse-by-verse) to aid with understanding the Qur'an for those who want to read the Qur'an not just at the Qira'ah/recitation level.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

- `pnpm start`: Starts the development server.
- `pnpm run build`: Bundles the app into static files for production.
- `pnpm test`: Starts the test runner.
- `pnpm run deploy`: Cause `predeploy` and `deploy` script to run.

  Under the hood, the `predeploy` script will build a distributable version of the React app and store it in a folder named `build`. Then, the deploy script will push the contents of that folder to a new commit on the `gh-pages` branch of the GitHub repository, creating that branch if it doesn't already exist.

  Then, the app will be visible at: [systatum.github.io/bil-quran](https://systatum.github.io/bil-quran/)

Scrolling works by using hash router, ie: https://bil-quran.com/#/c/11/12

App unique features:

- Allow you to learn word-by-word
- Allow you to see tajwid rules and words in the quran exemplify those rules
- Respect both Sunni and Shi'i perspective of what makes Surat Sajdah

## If I had more time

- Better scroll preservation (both saving and restoring the position)
- Ability to bookmark any verse and go to that any moment
- Can lookup by: juz, root word, and verse theme.
- Normalize such as in baqarah 10: اَلِیْمٌۢ بِمَا the mim at the first word has indicator of mim
- Make it easy to learn tajwid on the app
- Add a feature to report an issue
- Rate translation feature (this needs Ligo backend).

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
- [ ] Try mock each function in the seeder is throwing an error, should then render the error screen at root-level (otherwise, user will not moving to any page, yet not sure what's happening as error screen not shown)
- [ ] Try raising error at the translator-level (ie at the i18n's formatMessage) and ensure that we see an error screen; otherwise we miss a locale, and the user is not seeing any error. Another simple way is inject into `WordTranslationOption` some fake value, where there's no corresponding i18n key for that in locale files, and so the lookup will generate a null/undefined, causing error on formatMessage-part automatically.
- [ ] Add automated test ensuring each word has a meaning (in the quran paper, each arabic word must have below it some translation).
- [ ] If we add another locale, and then refresh the page, we should not redownload the locale (this proves that database persisting works for all new-locale)
- [ ] Scroll the page, until the last verse, and ensure we see all the verse, and all the word as per the database (ensuring rendering data and database data matches)
- [ ] Ensure verse marker follows/work even if we change the translations used (add/remove). Make sure it always work on a 2-lines verse, because sometimes it doesn't work.
- [ ] Ensure when changing language, the "Lompat ke ayat" dropdown, and displayed chapter at the header, is using local language
- [ ] Check overlay behavior: if sidebar is opened, has overlay, and clicking overlay close the sidebar. Same expected behavior with search bar.
- [ ] Make sure pressing on the word show the occurrences across different verses
- [ ] Fix 2:204 word 16 buggy cannot scroll down
- [ ] Add a new bookmark note. And if adding on a bookmarked verse, will edit instead of insert. Also check that each bookmark, whenever not specified, will add to default (but the localstorage should always have 1 default category)

ءَا
لْإِ
"\w+/
sedikit/([\w\-\s]+")

standardize مَنْ in indonesian (like 2:200) so that it reads "barang siapa" (or "yang" better?) rather than "orang" (but must check the English, if it is just whom or who -> yang, if it is (to) whom then (ke) yang, (is he) -> (ialah) yang; other than that put te english word as-is: (english) yang)

good ayat to check: 2:200, 3:26,
