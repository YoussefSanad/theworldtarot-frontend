"use client";

import { useEffect } from "react";

import { currentLocale } from "@/lib/locale";

/**
 * Keeps `<html lang>` honest after a language change.
 *
 * **The attribute is written into the static HTML at build time**, in English,
 * and a static export has no server to write it differently — so a visitor
 * reading Spanish would otherwise be served markup claiming to be English. That
 * matters to a screen reader, which picks its pronunciation from it, and to a
 * browser's own translation prompt.
 *
 * An effect rather than a render, because `<html>` is not this tree's to return:
 * it belongs to the root layout, which is a server component and cannot know
 * what a visitor chose.
 *
 * **It does not make the served markup correct**, and nothing here can. A
 * crawler sees `lang="en"` over whatever the build baked, which is the cost of
 * language being a preference rather than an address — accepted deliberately,
 * because search is English-only. See `lib/locale.ts`.
 */
export function HtmlLang() {
  useEffect(() => {
    document.documentElement.lang = currentLocale();
  }, []);

  return null;
}
