"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/request";
import { Globe } from "lucide-react";

function detectLocaleFromURL(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  return pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
    ? (pathSegments[0] as Locale)
    : 'en';
}

function getPathWithoutLocale(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  // If first segment is a locale, remove it
  if (pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)) {
    const pathWithoutLocale = '/' + pathSegments.slice(1).join('/');
    return pathWithoutLocale || '/';
  }
  // No locale prefix, return the full path
  return window.location.pathname || '/';
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Read locale from browser URL since middleware rewrites the pathname
  const [currentLocale, setCurrentLocale] = useState<Locale>(detectLocaleFromURL);
  
  useEffect(() => {
    // Update locale when pathname changes (for navigation)
    const detectedLocale = detectLocaleFromURL();
    setCurrentLocale(detectedLocale);
  }, [pathname]);

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Get the actual path without locale from browser URL
    const pathWithoutLocale = getPathWithoutLocale();

    // Build new path with locale
    let newPath: string;
    if (newLocale === 'en') {
      // For English (default), use path without locale prefix
      newPath = pathWithoutLocale;
    } else {
      // For other locales, add prefix
      // Ensure path starts with / and handle root path
      const basePath = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
      newPath = `/${newLocale}${basePath}`;
    }

    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-500" />
      <div className="flex items-center gap-1 border rounded-md p-1">
        <Button
          variant={currentLocale === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => switchLanguage('en')}
          className="h-7 px-2 text-xs"
        >
          EN
        </Button>
        <Button
          variant={currentLocale === 'es' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => switchLanguage('es')}
          className="h-7 px-2 text-xs"
        >
          ES
        </Button>
      </div>
    </div>
  );
}

