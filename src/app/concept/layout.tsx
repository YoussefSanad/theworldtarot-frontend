import { ConceptHeader } from "@/components/concept/ConceptHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Concept demo chrome: full-bleed first viewport with retractable header.
 * `#concept-sky` holds CSS atmosphere plus SunriseAtmosphere layers (portaled).
 */
export default function ConceptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        id="concept-sky"
        aria-hidden
        className="page-atmosphere-concept pointer-events-none absolute inset-x-0 top-0 z-0 min-h-full"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <ConceptHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
