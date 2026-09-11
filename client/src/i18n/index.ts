import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en.json";
import fr from "./fr.json";

export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], lookupLocalStorage: "koala:locale", caches: ["localStorage"] },
    returnObjects: true,
  });

export function setLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

export default i18n;
