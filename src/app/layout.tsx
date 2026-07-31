import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteName } from "@/content/site";

import "./globals.css";

const magically = localFont({
  src: "./fonts/MagicallyRegular.otf",
  variable: "--font-magically",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const gillSans = localFont({
  src: [
    { path: "./fonts/gill-sans/gill-sans-light.otf", weight: "300", style: "normal" },
    { path: "./fonts/gill-sans/gill-sans-light-italic.otf", weight: "300", style: "italic" },
    { path: "./fonts/gill-sans/gill-sans-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/gill-sans/gill-sans-italic.otf", weight: "400", style: "italic" },
  ],
  variable: "--font-gill",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${siteName} — Enter The Living Tarot`,
  description:
    "A cinematic interpretation of the Major Arcana. Reveal a card and experience The Living Tarot one story at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${magically.variable} ${cinzel.variable} ${gillSans.variable}`}>
      <body className="page-atmosphere flex min-h-screen flex-col overflow-x-hidden">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
