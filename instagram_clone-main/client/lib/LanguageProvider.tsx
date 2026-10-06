"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import useAuthStore from "@/store/authStore";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import hi from "@/locales/hi.json";
import pt from "@/locales/pt.json";
import zh from "@/locales/zh.json";
import fr from "@/locales/fr.json";

export type Language = "en" | "es" | "hi" | "pt" | "zh" | "fr";

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  es,
  hi,
  pt,
  zh,
  fr,
};

export const LANGUAGES: { code: Language; flag: string; labelKey: string }[] = [
  { code: "en", flag: "🇬🇧", labelKey: "settings.lang.en" },
  { code: "es", flag: "🇪🇸", labelKey: "settings.lang.es" },
  { code: "hi", flag: "🇮🇳", labelKey: "settings.lang.hi" },
  { code: "pt", flag: "🇧🇷", labelKey: "settings.lang.pt" },
  { code: "zh", flag: "🇨🇳", labelKey: "settings.lang.zh" },
  { code: "fr", flag: "🇫🇷", labelKey: "settings.lang.fr" },
];

type Vars = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Vars) => string;
  isRtl: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  isRtl: false,
});

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in dictionaries;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const authUser = useAuthStore((s) => s.user);

  useEffect(() => {
    const stored = localStorage.getItem("language");
    if (isLanguage(stored)) {
      setLanguageState(stored);
      return;
    }
    // Fall back to the logged-in user's saved preference.
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isLanguage(parsed?.language)) setLanguageState(parsed.language);
      }
    } catch {
      /* ignore malformed user blob */
    }
  }, []);

  // The backend preference is authoritative — apply it whenever the user
  // changes (login, loadUser, or a verified language switch), so the choice
  // persists across sessions and devices.
  useEffect(() => {
    if (authUser && isLanguage(authUser.language)) {
      setLanguageState(authUser.language as Language);
    }
  }, [authUser]);

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (isLanguage(lang)) setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const dict = dictionaries[language] || dictionaries.en;
      const value = dict[key] ?? dictionaries.en[key] ?? key;
      return interpolate(value, vars);
    },
    [language],
  );

  // Kept for future RTL languages; none of the current six are RTL.
  const isRtl = useMemo(() => false, []);

  const value = useMemo(
    () => ({ language, setLanguage, t, isRtl }),
    [language, setLanguage, t, isRtl],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => useLanguage().t;
