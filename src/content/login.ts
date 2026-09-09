import { pickCopy } from "../lib/copy.ts";
import { currentLocale } from "../lib/locale.ts";
import en from "./locales/en/login.json" with { type: "json" };
import es from "./locales/es/login.json" with { type: "json" };

/** The words on this screen, in whichever language it is being read. */
const copy = pickCopy(en, { es }, currentLocale());

/**
 * The words on the sign in page.
 *
 * Beside `passwords.ts` rather than inside it: the two password pages are
 * reached from a link in a mail and know who they are talking to, and this page
 * is reached by anybody and knows nothing at all. It shares their shape and none
 * of their sentences.
 *
 * **Three sentences here are load-bearing rather than decorative**, and each is
 * a rule the backend keeps and the page must not contradict:
 *
 * - `refused` stands for a wrong password, an address with no account, and an
 *   account made when an order settled whose owner has never chosen a password.
 *   The API
 *   answers all three identically and will not change, so this wording must
 *   leave every door open and name none of them
 * - `forgot.sent` is shown whatever the answer was, because asking for a link
 *   is always a 200 with the same body. It never says a message was sent — some
 *   of the time nothing was
 * - `refused` sends an unclaimed account to `forgot`, which is the way out of
 *   that state: a reset link sets a first password just as well as a claim
 *   link, so somebody whose receipt link has died is not stranded
 */

export const loginCopy = copy;

/** Where a signed-in customer lands. There is no member area to land in yet. */
export const afterSignIn = "/readings/";

/**
 * The sign in page's own address, exported so the three places that send people
 * there cannot drift apart: the masthead in `site.ts`, and the dead-link way out
 * of `PasswordForm`. Trailing slash because the export is a directory of
 * `index.html` files and a link without one costs a redirect.
 */
export const signInPath = "/login/";
