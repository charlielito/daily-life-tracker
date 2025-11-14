import { Inter } from "next/font/google";
import { headers } from "next/headers";

import { TRPCReactProvider } from "@/utils/trpc";
import { Providers } from "@/components/providers/session-provider";
import { defaultLocale } from "@/i18n/request";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Daily Life Tracker",
  description: "Track your daily health metrics",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get locale from headers (set by middleware)
  const headersList = await headers();
  const locale = headersList.get('x-next-intl-locale') || defaultLocale;

  return (
    <html lang={locale}>
      <body className={`font-sans ${inter.variable}`}>
        <Providers>
          <TRPCReactProvider headers={headers()}>
            {children}
          </TRPCReactProvider>
        </Providers>
      </body>
    </html>
  );
} 