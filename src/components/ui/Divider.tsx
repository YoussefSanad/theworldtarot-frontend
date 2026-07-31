import { cn } from "@/lib/cn";

/**
 * The ornamental rules Figma repeats between sections. Each variant is one
 * shared image, sized by its own aspect ratio so it never distorts.
 */
export type DividerVariant = "ornate" | "flourish" | "flourishEnd" | "hero" | "hairline" | "tile";

const VARIANT_CLASS: Record<DividerVariant, string> = {
  ornate: "divider--ornate",
  flourish: "divider--flourish",
  flourishEnd: "divider--flourish-end",
  hero: "divider--hero",
  hairline: "divider--hairline",
  tile: "divider--tile",
};

export function Divider({ variant = "ornate", className }: { variant?: DividerVariant; className?: string }) {
  return <span aria-hidden className={cn("divider mx-auto", VARIANT_CLASS[variant], className)} />;
}
