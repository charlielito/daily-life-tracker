import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n/request';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let locale = defaultLocale;
  let pathWithoutLocale = pathname;
  
  // Check if pathname starts with a locale prefix (e.g., /es/dashboard)
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0 && locales.includes(pathSegments[0] as any)) {
    locale = pathSegments[0] as typeof defaultLocale;
    // Remove locale from path to get the actual route
    pathWithoutLocale = '/' + pathSegments.slice(1).join('/') || '/';
  }
  
  // If locale is not default and path has locale prefix, rewrite to actual route
  if (locale !== defaultLocale && pathSegments.length > 0 && locales.includes(pathSegments[0] as any)) {
    // Rewrite the URL internally to the actual route (without locale prefix)
    // But keep the original URL in the browser
    const url = request.nextUrl.clone();
    url.pathname = pathWithoutLocale;
    
    const response = NextResponse.rewrite(url);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-intl-locale', locale);
    response.headers.set('x-next-intl-locale', locale);
    
    return response;
  }
  
  // For default locale or routes without locale prefix, just set header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-intl-locale', locale);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next (Next.js internals)
  // - static files (e.g., favicon.ico)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};

