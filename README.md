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

- [ ] Test when user translations has English and Indonesian, both are shown fine on first load (Indonesian is not the default). This is to test first pre-flight translation downloading and insertion works.
- [ ] Try raising error at the translator-level (ie at the i18n's formatMessage) and ensure that we see an error screen; otherwise we miss a locale, and the user is not seeing any error. Another simple way is inject into `WordTranslationOption` some fake value, where there's no corresponding i18n key for that in locale files, and so the lookup will generate a null/undefined, causing error on formatMessage-part automatically.
- [ ] If we add another locale, and then refresh the page, we should not redownload the locale (this proves that database persisting works for all new-locale)
- [ ] Work on all the to-do
- [ ] Add madhab mode (shia/sunni)
- [ ] Check overlay behavior: if sidebar is opened, has overlay, and clicking overlay close the sidebar. Same expected behavior with search bar.
- [ ] Make sure pressing on the word show the occurrences across different verses
- [ ] Fix 2:204 word 16 buggy cannot scroll down
- [ ] Add a new bookmark note. And if adding on a bookmarked verse, will edit instead of insert. Also check that each bookmark, whenever not specified, will add to default (but the localstorage should always have 1 default category)
- [ ] Can change and update setting and ensure it makes effect (test one by one, ie adding and removing word transation option also one by one)
- [ ] Test bookmark can click and go to that verse.
- [ ] When having bookmark data, ensure that scrollbar is shown and user can scroll when there are a lot of bookmark.

ءَا
لْإِ
"\w+/
sedikit/([\w\-\s]+")

standardize مَنْ in indonesian (like 2:200) so that it reads "barang siapa" (or "yang" better?) rather than "orang" (but must check the English, if it is just whom or who -> yang, if it is (to) whom then (ke) yang, (is he) -> (ialah) yang; other than that put te english word as-is: (english) yang)

good ayat to check: 2:200, 3:26,

dalam dalam -> dalam
adalah ia -> ia

## Mobile

The project can also built as a native Android application using Capacitor.

### Running on an Android Device

There are two ways to run the application on a physical Android device.

#### Option 1: Live Development (Recommended)

To use the React development server with live reload, configure the Capacitor `server` option:

```ts
import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.bilquran.app",
  appName: "BilQuran",
  webDir: "build",
  server: {
    url: "http://<YOUR_LOCAL_IP>:3000",
    cleartext: true,
  },
}

export default config
```

Replace `<YOUR_LOCAL_IP>` with the local IP address of your development machine (for example `192.168.1.10`).

Then:

1. Connect your computer and Android device to the same Wi-Fi network.
2. Start the React development server:

   ```bash
   pnpm start
   ```

3. Launch the Android application:

   ```bash
   pnpm start:android
   ```

Changes made to the React application will be served from the local development server, making development much faster.

#### Option 2: Without a Development Server

If you do not configure the `server` option, Capacitor will load the bundled web assets from the `build` directory instead of your local development server.

Before running the application, build and synchronize the latest assets:

```bash
pnpm build:mobile:android
```

Then launch the application:

```bash
pnpm start:android
```

> **Note:** In this mode, changes to the React application are **not** reflected automatically. You must rebuild (`pnpm build:mobile:android`) each time you modify the web application before running it again.

> **Note:** The `server` configuration is intended for development only. Remove the `server` section before creating production builds (`APK` or `AAB`) so the application loads the bundled files from the `build` directory.

### Sync Web Assets

Build the React application and synchronize it with the Android project:

```bash
pnpm build:mobile:android
```

This command will:

1. Build the React application.
2. Generate the production files.
3. Synchronize the latest web assets into the Capacitor Android project.

### Generate Android APK

To build a release APK:

```bash
pnpm build:android:apk
```

This command will:

1. Run `build:mobile:android`.
2. Build a signed Android APK using Gradle (`assembleRelease`).

The generated APK can be found at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

### Generate Android App Bundle (AAB)

To build an Android App Bundle for Google Play:

```bash
pnpm build:android:aab
```

This command will:

1. Run `build:mobile:android`.
2. Build a release App Bundle using Gradle (`bundleRelease`).

The generated AAB can be found at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

### Available Commands

| Command                     | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `pnpm start:android`        | Run the application on an Android device using the local development server. |
| `pnpm build:mobile:android` | Build the web app and sync it to the Android project.                        |
| `pnpm build:android:apk`    | Build a release Android APK.                                                 |
| `pnpm build:android:aab`    | Build a release Android App Bundle (AAB).                                    |
