import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { NavigationGuard } from "@/components/navigation-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "Healthcare Review Form",
  description: "Evaluate AI responses to medical questions",
  generator: "v0.app",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <NavigationGuard>{children}</NavigationGuard>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
