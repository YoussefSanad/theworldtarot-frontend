/**
 * No header, footer, or shared atmosphere on this branch — the coming-soon
 * page is a single self-contained composition and owns its own backdrop
 * (see ComingSoonBackdrop.tsx). SiteHeader/SiteFooter/`.page-atmosphere-hero`
 * are untouched, just not rendered here; restoring the real homepage is
 * reverting this file and page.tsx.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
