import { Inter } from "next/font/google";
import { headers } from "next/headers";

import { TRPCReactProvider } from "@/utils/trpc";
import { Providers } from "@/components/providers/session-provider";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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