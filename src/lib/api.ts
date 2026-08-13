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
 * **The route does not exist yet.** It is a backend contract, written down here
 * so the shape is settled: `POST /api/v1/{locale}/subscribe`, JSON body
 * `{ email, consent }`, 2xx for accepted. Until it ships, every submission on a
 * deployed build lands in the form's error state, which is deliberate — a
 * visitor is never told their request was received when it was not. Development
 * is the one exception, and simulates both outcomes; see the guard below.
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
  { locale = "en", signal }: { locale?: string; signal?: AbortSignal } = {},
): Promise<void> {
  // Until the route exists there is nothing to develop against, so `next dev`
  // answers itself: first attempt in a tab succeeds, the rest fail. Dynamically
  // imported so the simulation is provably absent from a production bundle
  // rather than left to tree-shaking, and gated on NODE_ENV so no deployed
  // build — staging included — can ever take this path. See `invitation-sim.ts`.
  if (process.env.NODE_ENV !== "production") {
    const { simulateInvitation } = await import("./invitation-sim");
    return simulateInvitation();
  }

  const response = await fetch(`${baseUrl()}/api/v1/${locale}/subscribe`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, consent: true }),
    signal,
  });

  // Already on the list is not a failure worth showing anyone: they asked to be
  // on it, and they are. Revisit if the backend gives 409 a second meaning.
  if (response.status === 409) return;

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
