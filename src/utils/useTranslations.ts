"use client";

import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/request";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";

const messages = {
  en: enMessages,
  es: esMessages,
};

export function useTranslations(namespace?: string) {
  const pathname = usePathname();
  
  // Extract locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const locale: Locale = 
    pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)
      ? (pathSegments[0] as Locale)
      : 'en';

  const translations = namespace 
    ? (messages[locale] as any)?.[namespace] || {}
    : messages[locale] || {};

  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English if translation not found
        let fallbackValue: any = namespace 
          ? (messages.en as any)?.[namespace] || {}
          : messages.en || {};
        for (const fk of keys) {
          fallbackValue = fallbackValue?.[fk];
        }
        value = fallbackValue || key;
        break;
      }
    }
    
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key]?.toString() || match;
      });
    }
    
    return value || key;
  };

  return { t, locale };
}

