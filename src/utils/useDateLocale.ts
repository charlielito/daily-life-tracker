"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/request";
import { enUS, es } from "date-fns/locale";

const dateLocales = {
  en: enUS,
  es: es,
};

function detectLocaleFromURL(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  return pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
    ? (pathSegments[0] as Locale)
    : 'en';
}

export function useDateLocale() {
  const pathname = usePathname();
  // Initialize with detected locale synchronously to avoid flash of English
  const [locale, setLocale] = useState<Locale>(detectLocaleFromURL);

  useEffect(() => {
    // Update locale when pathname changes (for navigation)
    const detectedLocale = detectLocaleFromURL();
    setLocale(detectedLocale);
  }, [pathname]);

  return dateLocales[locale] || dateLocales.en;
}

