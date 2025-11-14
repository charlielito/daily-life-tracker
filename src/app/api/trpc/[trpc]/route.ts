import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/request";
import type { Locale } from "@/i18n/request";

import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const handler = async (req: NextRequest) => {
  // Extract locale from referer header (the page URL that made the request) or headers
  let locale: Locale = defaultLocale;
  
  // Try to extract locale from referer header (the page that made the tRPC call)
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const pathSegments = refererUrl.pathname.split('/').filter(Boolean);
      
      // Check if first segment is a locale
      if (pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)) {
        locale = pathSegments[0] as Locale;
      }
    } catch {
      // Invalid referer URL, continue to fallback
    }
  }
  
  // Fallback to accept-language header if locale not found in referer
  if (locale === defaultLocale) {
    const acceptLanguage = req.headers.get('accept-language');
    if (acceptLanguage) {
      const localeMatch = acceptLanguage.match(/^([a-z]{2})(?:-|$)/i);
      if (localeMatch && locales.includes(localeMatch[1] as Locale)) {
        locale = localeMatch[1] as Locale;
      }
    }
  }

  // Create a new request with locale header
  const headers = new Headers(req.headers);
  headers.set('x-next-intl-locale', locale);

  // Create request options - need duplex option when body is present
  const requestOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Only add body if it exists, and add duplex option for streaming bodies
  if (req.body) {
    requestOptions.body = req.body;
    requestOptions.duplex = 'half';
  }

  const modifiedReq = new Request(req.url, requestOptions);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: modifiedReq,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST }; 