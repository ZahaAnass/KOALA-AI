import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import en from "./en.json";
import fr from "./fr.json";

const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], lookupLocalStorage: STORAGE_KEYS.locale, caches: ["localStorage"] },
  });

export function setLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

/** Current UI locale narrowed to a supported value. */
export function currentLocale(): SupportedLocale {
  return i18n.language.startsWith("fr") ? "fr" : "en";
}

/** BCP 47 tag for the Web Speech APIs, matching the UI language. */
export function speechLang(): string {
  return currentLocale() === "fr" ? "fr-FR" : "en-US";
}

export default i18n;
