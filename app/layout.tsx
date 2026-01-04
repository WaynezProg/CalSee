import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { I18nProvider, messages } from "@/lib/i18n";
import { QueryProvider } from "@/app/components/providers/QueryProvider";
import ErrorBoundary from "@/app/components/ui/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: messages.meta.title,
  description: messages.meta.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider locale="zh-TW">
          <ErrorBoundary
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
                <p className="text-gray-700">{messages.errors.unexpected}</p>
              </div>
            }
          >
            <QueryProvider>
              <SessionProvider>{children}</SessionProvider>
            </QueryProvider>
          </ErrorBoundary>
        </I18nProvider>
      </body>
    </html>
  );
}
