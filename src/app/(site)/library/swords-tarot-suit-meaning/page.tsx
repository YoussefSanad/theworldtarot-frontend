import type { Metadata } from "next";

import { SuitPage } from "@/components/library/SuitPage";
import { suitMeta } from "@/content/library";
import { siteName } from "@/content/site";

const meta = suitMeta("swords");

export const metadata: Metadata = {
  title: `${meta.title} — ${siteName}`,
  description: meta.description,
};

export default function SwordsPage() {
  return <SuitPage slug="swords" />;
}
