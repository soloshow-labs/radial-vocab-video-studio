import {createContext, type PropsWithChildren, useContext, useMemo, useState} from "react";
import {translate, type Locale, type MessageKey} from "./messages";

const LOCALE_STORAGE_KEY = "radial-vocab.locale";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({children}: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const value = useMemo<I18nValue>(() => {
    const setLocale = (next: Locale) => {
      setLocaleState(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.documentElement.lang = next;
    };
    return {locale, setLocale, t: (key, values) => translate(locale, key, values)};
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is required");
  return value;
}

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en-US" ? "en-US" : "zh-CN";
}
