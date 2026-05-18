import { headers } from "next/headers";

import { TRPCReactProvider } from "@/utils/trpc";
import { Providers } from "@/components/providers/session-provider";
import { defaultLocale } from "@/i18n/request";

import "./globals.css";

// Fallback path: Next.js 14.0.4 does not expose Geist_Mono from next/font/google (only added in 14.2+),
// so both Instrument Serif and Geist Mono are loaded via the Google Fonts <link> below, and
// General Sans via Fontshare. CSS variables are set in the inline <style> tag.

export const metadata = {
  title: "Daily Life Tracker",
  description: "A private journal for your daily health.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get("x-next-intl-locale") || defaultLocale;

  return (
    <html lang={locale}>
      <head>
        {/* Preconnects */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        {/* Display + Data: Instrument Serif + Geist Mono via Google Fonts */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap"
        />
        {/* Body & UI: General Sans via Fontshare CDN, no API key */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500,600&display=swap"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root {
  --font-sans: "General Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Instrument Serif", "Iowan Old Style", Georgia, serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
}`,
          }}
        />
      </head>
      <body className="font-sans bg-paper text-ink antialiased">
        <Providers>
          <TRPCReactProvider headers={headers()}>{children}</TRPCReactProvider>
        </Providers>
      </body>
    </html>
  );
}
