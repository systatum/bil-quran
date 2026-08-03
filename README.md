# bil-quran

Bil-Quran is an Qur'an app where translation is provided interlinear (or word-by-word/verse-by-verse) to aid with understanding the Qur'an for those who want to read the Qur'an not just at the Qira'ah/recitation level.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

- `pnpm start`: Starts the development server.
- `pnpm run build`: Bundles the app into static files for production.
- `pnpm test`: Starts the test runner.
- `pnpm run deploy`: Cause `predeploy` and `deploy` script to run.

  Under the hood, the `predeploy` script will build a distributable version of the React app and store it in a folder named `build`. Then, the deploy script will push the contents of that folder to a new commit on the `gh-pages` branch of the GitHub repository, creating that branch if it doesn't already exist.

  Then, the app will be visible at: [systatum.github.io/bil-quran](https://systatum.github.io/bil-quran/)

App unique features:

- Allow you to learn word-by-word
- Allow you to see tajwid rules and words in the quran exemplify those rules
- Respect both Sunni and Shi'i perspective of what makes Surat Sajdah

## If I had more time

- Ability to bookmark any verse and go to that any moment
- Can lookup by: root word, and verse theme.
- Normalize such as in baqarah 10: اَلِیْمٌۢ بِمَا the mim at the first word has indicator of mim
- Make it easy to learn tajwid on the app
- Add a feature to report an issue
- Rate translation feature (this needs Ligo backend).
- Ability to find by text: type in the text of the ayah, in Arabic or English, no matter how bad/wrong or how partially correct, can still give estimate
- Add "copy link" on verse marker and on exegesis dialog, to copy link to respective path
- Auto add \_\_\_ on words like SAW SWT RA with tooltip displaying localized meaning.
  -Add site / guess tracker google web service style

## Stack

- React via create-react-app (webpack stack)
- TanStack router for navigation, instead of react-router-dom, as it's strongly typed

## Test to be made

- [ ] Test when user translations has English and Indonesian, both are shown fine on first load (Indonesian is not the default). This is to test first pre-flight translation downloading and insertion works.
- [ ] Try raising error at the translator-level (ie at the i18n's formatMessage) and ensure that we see an error screen; otherwise we miss a locale, and the user is not seeing any error. Another simple way is inject into `WordTranslationOption` some fake value, where there's no corresponding i18n key for that in locale files, and so the lookup will generate a null/undefined, causing error on formatMessage-part automatically.
- [ ] If we add another locale, and then refresh the page, we should not redownload the locale (this proves that database persisting works for all new-locale)
- [ ] Add madhab mode (shia/sunni)
- [ ] Check overlay behavior: if sidebar is opened, has overlay, and clicking overlay close the sidebar. Same expected behavior with search bar.
- [ ] Fix 2:204 word 16 buggy cannot scroll down
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

## Architecture

No backend server. Everything runs client-side (browser or, for the mobile
build, a WebView), backed by static files under `public/`.

- **Bootstrap** (`src/App.tsx`): registers fonts, then in order inits
  `sql.js` (WASM SQLite), runs Drizzle migrations
  (`public/table_migrations/`), seeds data, and loads chapters/settings.
- **Data**: Qur'an data (chapters, verses, word-by-word, tafsir) lives as
  JSON under `public/quran/`, split by `scripts/split-chapter.js`. Seeding
  (`src/db/seeders.ts`) only runs against empty tables, so it's a no-op on
  repeat launches.
- **Asset paths**: built from `window.location.origin` at runtime
  (`src/constants/assets.ts`), not a hardcoded domain, so the same code
  works on `bil-quran.com`, `localhost`, or `capacitor://localhost`.
- **Offline**: `public/quran/fingerprints.json` (MD5 manifest,
  `scripts/fingerprinter.js`) lets `src/services/fingerprinter.ts` detect
  when the IndexedDB-persisted SQLite snapshot is stale and needs
  re-seeding. If the manifest can't be fetched, the existing local DB is
  trusted as-is. There is no service worker.
- **Fonts**: bundled locally under `public/fonts/`, no external font CDN.

## Mobile

The project can also built as a native Android application using Capacitor.

Asset paths resolve against `window.location.origin`, and
`webDir: "build"` packages all of `public/quran/` and `public/fonts/` into
the APK. So the app needs no network connection after install: reading
Qur'an/tafsir data is a local read off the bundled assets, not a download.

### Requirements

- **JDK 21**, required by `@capacitor/android`'s own Gradle module no
  matter what JDK the rest of the project uses. If your default
  `JAVA_HOME` is older, point Gradle at Android Studio's bundled JBR
  instead of installing a separate JDK:
  ```bash
  JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    ./gradlew assembleDebug
  ```
- **Android SDK Platform 36 and Build-Tools 36**, matching
  `compileSdk`/`targetSdk` in `android/variables.gradle`. Install via
  Android Studio's SDK Manager (SDK Platforms and SDK Tools tabs), or
  `sdkmanager "platforms;android-36" "build-tools;36.0.0"`.
- **A device or emulator** on any API level at or above `minSdkVersion`
  (24). `compileSdk`/`targetSdk` only affect what the app is built
  against, not what it can run on, so the emulator doesn't need to match
  API 36.
- Android Studio itself isn't required if you're targeting a physical
  device over USB. It's mainly useful here for its bundled JBR and its
  emulator/AVD manager.

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

### Running on an Android Emulator

No physical device? An emulator works the same way, and you don't need to
touch the `server` config for it.

1. Create an AVD in Android Studio (Device Manager, if you don't have one
   yet), or boot an existing one:

   ```bash
   ~/Library/Android/sdk/emulator/emulator -avd <YOUR_AVD_NAME>
   ```

   Leave this running in its own terminal. You can list your AVDs with
   `~/Library/Android/sdk/emulator/emulator -list-avds`.

2. Once it's fully booted, build and launch the app on it:

   ```bash
   pnpm build:mobile:android
   pnpm start:android
   ```

   `start:android` runs `cap run android`, which detects the running
   emulator and installs the app on it automatically.

The emulator's Android version doesn't need to match `compileSdk`/`targetSdk`
(see [Requirements](#requirements)), so any AVD at or above API 24 works.

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

### Platform-specific Styling

When using Capacitor, you can detect the current platform and apply different styles or behavior for Android and iOS.

```ts
import { Capacitor } from "@capacitor/core"

const platform = Capacitor.getPlatform()

console.log(platform) // "ios", "android", or "web"
```

#### Example: Using `styled-components`

You can use the detected platform to conditionally apply styles.

```tsx
import { Capacitor } from "@capacitor/core"
import styled from "styled-components"

const isIOS = Capacitor.getPlatform() === "ios"

const Container = styled.div<{ $isIOS: boolean }>`
  padding-top: ${({ $isIOS }) => ($isIOS ? "44px" : "24px")};
`

function App() {
  return <Container $isIOS={isIOS}>Content</Container>
}
```

This approach is useful when you need different spacing, safe area handling, or platform-specific UI adjustments between Android and iOS.
