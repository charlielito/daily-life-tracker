"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/request";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentLocale: Locale = 
    pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
      ? (pathSegments[0] as Locale)
      : 'en';

  // Get the path without locale prefix
  const pathWithoutLocale = pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
    ? '/' + pathSegments.slice(1).join('/')
    : pathname;

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Build new path with locale
    let newPath: string;
    if (newLocale === 'en') {
      // For English (default), remove locale prefix
      newPath = pathWithoutLocale || '/';
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

