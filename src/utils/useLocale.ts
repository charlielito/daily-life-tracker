"use client";

import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/request";

export function useLocale() {
  const pathname = usePathname();
  
  // Extract locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const locale: Locale = 
    pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
      ? (pathSegments[0] as Locale)
      : 'en';

  // Get the path without locale prefix
  const pathWithoutLocale = pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
    ? '/' + pathSegments.slice(1).join('/')
    : pathname;

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

