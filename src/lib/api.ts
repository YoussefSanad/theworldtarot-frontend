import type { TarotCard } from "@/content/cards";

/**
 * The backend. Mostly the homepage reveal, plus the coming-soon page's
 * invitation list.
 *
 * **Everything here must run in the browser, never on a server or at build
 * time.** The playback URL the backend returns is signed against the address the
 * request came from, so a card fetched by a build step or a server component
 * carries a token bound to that machine and refuses every real visitor. It would
 * work perfectly wherever it was tested and fail for 100% of users.
 *
 * That constraint is satisfied for free today, because this app is a static
 * export and has no server at runtime. It stops being free the moment somebody
 * moves a fetch into a server component, so it is written down rather than
 * assumed. See `docs/plans/reveal-api-migration.md` and the backend's
 * `API_CONTRACT.md`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/** Inlined at build time, so staging and production are separate builds. */
function baseUrl(): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. The reveal falls back to the bundled card without it.",
    );
  }

  return API_BASE.replace(/\/$/, "");
}

type ApiCard = {
  id: number;
  number: number;
  name: string;
  short_description: string;
  long_description: string;
  image: string;
  in_viewing_room: boolean;
  /**
   * Optional because it is being removed from the backend. Nothing here reads
   * it, so it can disappear without breaking anything.
   */
  poster?: string | null;
  video: { url: string; expires_at: string };
};

/** What `/cards/{id}` returns. The same card, with no film attached. */
type CardWithoutVideo = Omit<ApiCard, "video">;

/**
 * The deck is fixed at twenty-two, so a table beats arithmetic. The Fool is 0
 * and has no Roman numeral, which is why this starts with a character Roman
 * numerals do not have.
 */
const ROMAN = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
] as const;

function toTarotCard(card: ApiCard | CardWithoutVideo): TarotCard {
  return {
    // The API addresses cards by integer id. Kept as a string because it is an
    // opaque handle here, and it is what goes into sessionStorage for the
    // one-reveal-per-visit rule.
    id: String(card.id),
    number: ROMAN[card.number] ?? String(card.number),
    name: card.name,

    // An HLS manifest, not an MP4. See RevealStage. Absent from the single-card
    // endpoint, which a restored visit uses and which serves no film. An empty
    // string is normalized to absent here, not left for callers to notice,
    // because `RevealStage`'s `filmWanted` gate (and anything else reading
    // `card.video`) trusts absence to mean "no film," not "a film with no URL."
    video: "video" in card && card.video.url ? card.video.url : undefined,

    // The card's own artwork, which is what a restored visit shows in place of
    // replaying the film. It was the poster frame until the poster was dropped
    // from the backend. No dimensions come with either, and the stage does not
    // need them: it fixes its own aspect ratio and covers.
    image: { src: card.image },
  };
}

/**
 * One card and its film, drawn at random.
 *
 * Returns null when the backend has nothing to draw, which is a real state
 * rather than a failure: no card is on the website yet with a finished film and
 * a poster frame. The caller falls back to the bundled card.
 *
 * Throws on anything else, so a genuinely broken API is visible rather than
 * silently indistinguishable from an empty one.
 */
export async function drawCard(
  { locale = "en", signal }: { locale?: string; signal?: AbortSignal } = {},
): Promise<TarotCard | null> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/cards/draw`, {
    // The response is a credential with a timer. The server says no-store and
    // this says it again, because the two failure modes differ: a cached reveal
    // shows every visitor the same card, and a cached credential outlives its
    // own expiry.
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`The draw failed with ${response.status}.`);
  }

  return toTarotCard((await response.json()) as ApiCard);
}

/**
 * Puts an address on the opening list, for the coming-soon page's invitation
 * form.
 *
 * **The route exists as of 15 August 2026**, and it is not the one this file
 * predicted. `POST /api/v1/newsletter`, JSON body `{ email, consent }`, **202**
 * for accepted. Two differences from the contract sketched here first, both
 * deliberate on the backend's side:
 *
 * - **No locale segment.** Content routes carry one, `/api/v1/es/products`, and
 *   a mailing list is not content: the same address joins the same list
 *   whatever language the page was in
 * - **No "already on the list" answer.** Every accepted address gets the same
 *   202 with the same body, whether it is new, already subscribed, or one the
 *   list will refuse later. A different answer for any of them would turn a
 *   public endpoint into a way to ask whether a given person subscribed
 *
 * 202 rather than 201 is also deliberate: the address is handed to a queue and
 * the response is sent before the list has been touched, so accepting is the
 * strongest thing it can honestly claim. **A signup the list later refuses is
 * therefore invisible to the person who made it**, which is the backend's
 * documented trade and not something this form can detect or repair.
 *
 * **Mailchimp lives behind this route, not in front of it.** The list is a
 * Mailchimp list (see `NewsletterForm.tsx`, and the backend deliverables in the
 * frontend proposal), but the browser must never call Mailchimp itself: the API
 * key would have to ship in the bundle, and Mailchimp's classic endpoint sends
 * no CORS headers, so the only browser-side route to it is their JSONP form,
 * which reports success unconditionally. The backend forwards.
 *
 * Resolves on success and throws on anything else, so the caller's catch is the
 * error state. Note the file-level rule applies here too: this runs in the
 * browser.
 */
export async function requestInvitation(
  email: string,
  // No `locale`, unlike every other call in this file, because this route
  // carries none.
  { signal }: { signal?: AbortSignal } = {},
): Promise<void> {
  // `next dev` answers itself: first attempt in a tab succeeds, the rest fail.
  //
  // **The reason for this has changed and it is worth being precise about.** It
  // was here because no route existed to develop against. The route exists now,
  // and the simulation stays because staging and production share one Mailchimp
  // audience — the one Jennifer mails — so a developer exercising this form
  // against a real backend would be adding contacts to it. Remove the guard and
  // dev signups become real ones.
  //
  // Dynamically imported so the simulation is provably absent from a production
  // bundle rather than left to tree-shaking, and gated on NODE_ENV so no
  // deployed build, staging included, can take this path. See
  // `invitation-sim.ts`.
  if (process.env.NODE_ENV !== "production") {
    const { simulateInvitation } = await import("./invitation-sim");
    return simulateInvitation();
  }

  // Flat, with no locale segment. See the note above.
  const response = await fetch(`${baseUrl()}/api/v1/newsletter`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },

    // Hardcoded true, and honest: the checkbox carries `required` and the submit
    // button stays disabled until it is ticked, so a submit event cannot happen
    // without it. The backend validates it again regardless, since a checkbox in
    // a browser gates a button and nothing more.
    body: JSON.stringify({ email, consent: true }),
    signal,
  });

  // No 409 branch. An earlier version of this file expected one for an address
  // already on the list; the endpoint deliberately never distinguishes that
  // case, so the branch was answering a question the backend refuses to ask.
  if (!response.ok) {
    throw new Error(`The invitation request failed with ${response.status}.`);
  }
}

/**
 * One card by id, without a film.
 *
 * For the restored visit: the card was already revealed this session, so the
 * stage shows its still rather than replaying the video. That is deliberate,
 * it avoids re-downloading the film on every page view, and it is also the only
 * option, since the playback URL expires and must never be stored.
 *
 * Returns null when the card is no longer on the website, in which case the
 * visitor gets a fresh draw rather than an error. The redraw itself happens in
 * `RevealProvider`'s restore effect, not here — this function only reports the
 * 404, it doesn't recover from it.
 */
export async function fetchCard(
  id: string,
  { locale = "en", signal }: { locale?: string; signal?: AbortSignal } = {},
): Promise<TarotCard | null> {
  const response = await fetch(`${baseUrl()}/api/v1/${locale}/cards/${id}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Fetching card ${id} failed with ${response.status}.`);
  }

  return toTarotCard((await response.json()) as CardWithoutVideo);
}
