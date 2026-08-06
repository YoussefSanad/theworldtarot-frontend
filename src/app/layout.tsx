import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import localFont from "next/font/local";

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
  /*
    Gill Sans carries two disagreeing vertical metric sets — hhea 0.682/0.318/0.2
    (what Safari and Chrome on macOS read) and OS/2 usWin 0.937/0.232 (what
    Chrome, Edge and Firefox on Windows read) — with no USE_TYPO_METRICS bit to
    break the tie, so the same line box put text 0.17em higher on Mac. These pin
    every browser to the usWin numbers: Windows renders exactly as it did, and
    Mac comes to meet it, which keeps the em offsets tuned on Windows valid.
  */
  declarations: [
    { prop: "ascent-override", value: "93.7%" },
    { prop: "descent-override", value: "23.2%" },
    { prop: "line-gap-override", value: "0%" },
  ],
});

export const metadata: Metadata = {
  title: `${siteName} — Enter The Living Tarot`,
  description:
    "A cinematic interpretation of the Major Arcana. Reveal a card and experience The Living Tarot one story at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`overflow-x-hidden ${magically.variable} ${cinzel.variable} ${gillSans.variable}`}
    >
      <body className="relative flex min-h-screen flex-col overflow-x-hidden bg-night">{children}</body>
    </html>
  );
}
