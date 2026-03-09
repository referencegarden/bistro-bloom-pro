import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Language, getTranslation } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLanguage: () => {},
  t: (key: string) => key,
  dir: "ltr",
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("app_language") as Language) || "fr";
  });

  // Try to load language from app_settings
  const { data: settings } = useQuery({
    queryKey: ["app-settings-language"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("language")
        .maybeSingle();
      if (error) return null;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings?.language) {
      const lang = settings.language as Language;
      if (["fr", "en", "ar"].includes(lang)) {
        setLanguageState(lang);
        localStorage.setItem("app_language", lang);
      }
    }
  }, [settings?.language]);

  // Apply RTL direction
  useEffect(() => {
    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = language === "ar" ? "ar" : language === "fr" ? "fr" : "en";
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  }, []);

  const t = useCallback((key: string) => {
    return getTranslation(language, key);
  }, [language]);

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}
