export const Locale = {
  English: "en-US",
};
export type Locale = (typeof Locale)[keyof typeof Locale];

export interface WordByWordTranslationAsset {
  path: string;
}

export interface Translation {
  wordByWord: Record<Locale, WordByWordTranslationAsset>;
}

export interface Asset {
  translations: Translation;
}
export const Asset: Asset = {
  translations: {
    wordByWord: {
      [Locale.English]: {
        path: "https://assets.bil-quran.com/translations/wbw/en-US.json",
      },
    },
  },
};
