import type { SocialIconName } from "@/components/ui/SocialIcon";
import { signInPath } from "./login.ts";
import { icons } from "../lib/assets.ts";
import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/site.json" with { type: "json" };
import es from "./locales/es/site.json" with { type: "json" };

/**
 * The words on this page, in whichever language it is being read.
 *
 * **Strings live in `locales/`, structure lives here.** A `href`, an icon and a
 * social URL are not copy and never cross over — a translator who finds
 * `/readings/month-ahead/` in their file will eventually edit it, and the link
 * will break in one language only. `site.test.ts` guards that boundary.
 *
 * **Labels and their structure are matched by position.** Inserting a nav item
 * means editing both the array below and its list in `locales/en/site.json`, and
 * a mismatch is what `site.test.ts` catches. That is the cost of keeping URLs
 * out of a translator's hands, and it is the smaller of the two risks.
 */
const copy = pickCopy(en, { es }, currentLocale());

/**
 * Site-wide navigation and identity. Routes beyond the homepage are not built
 * yet, so links point at the paths from the navigation document and will
 * resolve once those pages land.
 *
 * **A path carries a trailing slash once its route is built, and not before.**
 * The export is a directory of `index.html` files and `next.config.mjs` sets
 * `trailingSlash: true`, so a link without one costs a 308 on the way for a
 * route that exists — the same reasoning as `signInPath` in
 * `content/login.ts`. `/readings/`, `/readings/three-card/`,
 * `/readings/month-ahead/`, `/readings/in-depth/`, `/world-tarot/` and
 * `/library/` are
 * built and slashed; `/readings/one-card` is not (see `signature` in `content/readings.ts`) and
 * stays bare, along with every other unbuilt path in this file — each answers
 * a 404 whichever way it is written, and slashing it now would say it had
 * been built.
 *
 * **The rule is not yet true of the whole repository, and this file is not the
 * place that would make it so.** `content/home.ts` and `content/checkout.ts`
 * still link `/readings` without the slash, a built route paying the hop.
 * Left for the ticket that owns it rather than swept in here; recorded in
 * `AUTH-REVIEW-FIXES.md` under F4.
 */

export type NavLink = { label: string; href: string };

/**
 * A row inside a `NavGroup`'s dropdown.
 *
 * `productKey` is the same key `Reading.productKey` uses to ask `/products` for
 * a price; here it is asked for a name, through `useReadingName`, which hands
 * back `label` whenever the backend is not answering in the language being read.
 *
 * **A row with a key gives up its own wording**, and one row minds: the API
 * calls `one-card` "1 CARD READING", while the client's navigation document
 * writes "1 CARD EXPERIENCE" to mark the interactive AI experience as not one
 * of the three written readings. The panel is where that is now fixed.
 */
export type NavGroupLink = NavLink & { productKey?: string };

/** A nav item that opens a dropdown of links instead of navigating itself. */
export type NavGroup = { label: string; children: readonly NavGroupLink[] };

export type NavItem = NavLink | NavGroup;

const PRIMARY_NAV_HREFS = ["/world-tarot/", "/living-tarot", null, "/library/", "/faq"] as const;

/** `/readings/one-card` is dead until the AI One-Card Experience ships; see `signature` in `content/readings.ts`. */
/**
 * The dropdown's rows, by position against `readingsChildren` in `locales/`.
 *
 * `productKey` is what `useReadingName` asks `/products` for; Overview has none,
 * naming a page rather than something sold.
 */
const READINGS_ROWS: readonly { href: string; productKey?: string }[] = [
  { href: "/readings/" },
  { href: "/readings/one-card", productKey: "one-card" },
  { href: "/readings/three-card/", productKey: "three-card" },
  { href: "/readings/month-ahead/", productKey: "month-ahead" },
  { href: "/readings/in-depth/", productKey: "in-depth" },
];

export const primaryNav: NavItem[] = PRIMARY_NAV_HREFS.map((href, index) => {
  const label = copy.primaryNav[index];

  return href === null
    ? {
        label,
        children: READINGS_ROWS.map((row, child) => ({
          label: copy.readingsChildren[child],
          ...row,
        })),
      }
    : { label, href };
});

/**
 * The masthead's own controls.
 *
 * **`cta` is the site-wide rule for where GET MY READING goes**, and it is
 * worth stating because the same words appear at the foot of several pages
 * with two different destinations. A page that sells one reading sends it to
 * that reading's checkout — on a reading page the checkout is on the page, so
 * it is an anchor. Every other page — the homepage, World Tarot, Living Tarot,
 * the Library, the Collection — sends it here, to the readings index, because
 * there is nothing to check out yet. The masthead is on all of them, so it
 * always takes the second form.
 */
export const headerActions = {
  cta: { label: copy.headerActions.cta, href: "/readings/" },
  /**
   * The icon a visitor presses. `/login/` is a built route since #49 — it was
   * named here from the client's navigation document long before the page
   * existed, and pointed at a 404 for as long as it did.
   */
  account: { label: copy.headerActions.account, href: signInPath, icon: icons.login },
  /** The other half of that control, shown once somebody is signed in. */
  signOut: { label: copy.headerActions.signOut },
  bag: { label: copy.headerActions.bag, href: "/checkout", icon: icons.bag },
};

const FOOTER_HREFS = [
  "/world-tarot/",
  "/living-tarot",
  "/readings/",
  "/library/",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/refunds",
] as const;

export const footerNav: NavLink[] = FOOTER_HREFS.map((href, index) => ({
  label: copy.footerNav[index],
  href,
}));

const SOCIALS: { href: string; icon: SocialIconName }[] = [
  { href: "https://www.facebook.com/theworldtarotofficial/", icon: "facebook" },
  { href: "https://www.instagram.com/theworldtarotofficial/", icon: "instagram" },
  { href: "https://tiktok.com", icon: "tiktok" },
];

export const socialLinks: { label: string; href: string; icon: SocialIconName }[] = SOCIALS.map(
  (social, index) => ({ label: copy.socialLinks[index], ...social }),
);

/** FOLLOW THE JOURNEY:, over the social links. A literal in `SiteFooter` until 11 September 2026. */
export const socialHeading = copy.socialHeading;

/**
 * The footer's STAY CONNECTED form, in every state it has.
 *
 * **`success` must not say anybody is on the list**, and the wording is
 * constrained rather than chosen. `POST /api/v1/newsletter` answers 202: the
 * address has been handed to a queue and accepted, and whether Mailchimp keeps
 * it is settled later and invisible from here. The backend's `API_CONTRACT.md`
 * puts it as an instruction — "please do not word your confirmation as a
 * promise that they are now on the list" — and **a promise of future post is
 * that same promise in other words**, since it is exactly what an address the
 * list quietly refuses will never produce. ~~"Occasional reflections will find
 * their way to you."~~ said it and is gone. What is left is the one sentence
 * that is true whatever Mailchimp does next. See `lib/newsletter.ts`.
 *
 * `errors` is keyed by `NewsletterFailure["kind"]` so the form can index it with
 * what it was handed. There is deliberately no "you are already subscribed"
 * line: the endpoint answers a new address and one already on the list
 * identically, so that arm cannot be reached and must not be written.
 */
export const newsletter = {
  heading: copy.newsletter.heading,
  /*
    The visible field labels, shown at `lg` and above. Below it they are
    screen-reader only and the placeholders in `chrome` do the job, which is
    why each field has two strings. Literals in `NewsletterForm` until
    11 September 2026.
  */
  firstNameLabel: copy.newsletter.firstNameLabel,
  emailLabel: copy.newsletter.emailLabel,
  blurb: copy.newsletter.blurb,
  consent: copy.newsletter.consent,
  submitLabel: copy.newsletter.submitLabel,
  /*
   * The button's two other labels. Sending renames it because there is no
   * loader beside it — unlike the coming-soon form, which keeps its name and
   * spins — so the label is the only thing here that can say a press landed.
   */
  sendingLabel: copy.newsletter.sendingLabel,
  sentLabel: copy.newsletter.sentLabel,
  /*
   * Takes the blurb's place once the request lands. One line where the blurb is
   * two, which costs nothing: the slot reserves the blurb's full height in
   * every state, so a shorter message moves nothing.
   */
  success: copy.newsletter.success,
  errors: copy.newsletter.errors,
};

/**
 * The house name.
 *
 * **Declared in `src/lib/seo.ts` since 5 September 2026** and re-exported here,
 * which is the opposite of where a name like this belongs — copy lives in
 * `content/`. It moved because `src/lib` cannot value-import through the `@/`
 * alias without breaking `node --test`, and `seo.ts` is unit-tested while this
 * file is not. Every consumer was a page title, and composing page titles is
 * what `buildMetadata` does, so this export exists for anything that arrives
 * later.
 */
export { SITE_NAME as siteName } from "../lib/seo.ts";

/**
 * The line under the footer.
 *
 * **From `locales/` since 9 September 2026.** It was a literal here, which made
 * it one of the handful of strings a translator could not reach — and unlike an
 * `aria-label`, this one is visible, so a Spanish footer said "All rights
 * reserved" in English. The year and the house name are inside the string
 * because both are part of the sentence a translator is arranging.
 */
export const copyright = copy.copyright;

/**
 * The 404 page's three strings.
 *
 * `src/app/not-found.tsx` used to hold them inline, "a deliberate exception of
 * exactly three strings" that was to end when the message catalogue landed. It
 * landed.
 */
export const notFound = copy.notFound;

/**
 * The handful of strings that were written into components rather than here.
 *
 * **Placeholders and `aria-label`s are copy**, and left inline they are holes a
 * translator cannot reach — invisible ones, because nothing on screen shows a
 * missing `aria-label`. They sit in `site.ts` rather than in a file of their own
 * because every one of them belongs to the site's chrome, which is what this
 * module already is.
 */
export const chrome = copy.chrome;
