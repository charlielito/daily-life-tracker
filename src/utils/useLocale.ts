"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { locales, type Locale } from "@/i18n/request";

function detectLocaleFromURL(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  return pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
    ? (pathSegments[0] as Locale)
    : 'en';
}

export function useLocale() {
  const pathname = usePathname();
  // Read locale from browser URL since middleware rewrites the pathname
  const [locale, setLocale] = useState<Locale>(detectLocaleFromURL);
  
  useEffect(() => {
    // Update locale when pathname changes (for navigation)
    const detectedLocale = detectLocaleFromURL();
    setLocale(detectedLocale);
  }, [pathname]);

  // Get the path without locale prefix (from rewritten pathname)
  const pathWithoutLocale = pathname;

  const getLocalizedPath = (path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    if (locale === 'en') {
      // For English (default), return path without locale prefix
      return cleanPath;
    } else {
      // For other locales, add prefix
      return `/${locale}${cleanPath}`;
    }
  };

  return { locale, pathWithoutLocale, getLocalizedPath };
}

