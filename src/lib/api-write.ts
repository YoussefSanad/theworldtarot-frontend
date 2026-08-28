/**
 * The write seam: every POST the browser makes to the API goes through here.
 *
 * Deliberately not a checkout file. Reads in `api.ts` need none of this, and
 * the password pages need all of it, so the handshake lives at one seam rather
 * than being re-derived per feature.
 *
 * The backend authenticates writes with Sanctum's cookie flow, and its
 * `API_CONTRACT.md` states the whole of the work in one line: "Axios does this
 * automatically, `fetch` does not."
 */

/**
 * Read inside the function rather than at module scope. Next inlines
 * `process.env.NEXT_PUBLIC_*` wherever it appears, so this is still baked into
 * the bundle at build time; reading it here just means the value is not frozen
 * at import.
 */
function baseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set. Nothing can be bought without it.");
  }

  return base.replace(/\/$/, "");
}

/**
 * Asks the backend to set `XSRF-TOKEN`. Credentials are included here too, not
 * only on the write: the contract is explicit that this first request is part
 * of the flow, and without them the cookie is never stored to be read back.
 */
async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${baseUrl()}/sanctum/csrf-cookie`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
}

/**
 * The token Laravel just set, ready for the header.
 *
 * **The decode is not optional.** Laravel URL-encodes the cookie value, and the
 * header must carry the decoded one. Sending it raw answers 419, which looks
 * like a stale token rather than a missing `decodeURIComponent`, so the bug
 * costs an afternoon in the wrong place.
 */
function readXsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * A refused write, carrying the status so callers can tell the cases apart
 * without parsing bodies.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * A 422. `errors` is keyed by field name exactly as the backend sends it, which
 * for an order means the line is named: `lines.0.product`. Kept in that shape
 * rather than flattened, because "one bad line refuses the whole order" is only
 * actionable if the caller can say which line.
 */
export class ApiValidationError extends ApiError {
  readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(422, message);
    this.name = "ApiValidationError";
    this.errors = errors;
  }
}

/** A 429. `Retry-After` is in seconds, and is absent often enough to be optional. */
export class ApiRateLimitError extends ApiError {
  readonly retryAfterSeconds: number | undefined;

  constructor(message: string, retryAfterSeconds: number | undefined) {
    super(429, message);
    this.name = "ApiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Turns a refusal into the error that names it, so callers branch on a type
 * rather than on a status code and a parsed body.
 */
async function toError(path: string, response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  const message = body.message ?? `The write to ${path} failed with ${response.status}.`;

  if (response.status === 422) return new ApiValidationError(message, body.errors ?? {});

  if (response.status === 429) {
    const header = response.headers.get("Retry-After");
    const seconds = header === null ? Number.NaN : Number(header);

    return new ApiRateLimitError(message, Number.isFinite(seconds) ? seconds : undefined);
  }

  return new ApiError(response.status, message);
}

function post(path: string, body: unknown): Promise<Response> {
  const token = readXsrfToken();

  return fetch(`${baseUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { "X-XSRF-TOKEN": token } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function apiWrite<T>(path: string, body: unknown): Promise<T> {
  await ensureCsrfCookie();

  let response = await post(path, body);

  // A 419 means the token was missing or stale, which is recoverable exactly
  // once: signing out rotates it, and a tab left open long enough outlives the
  // session. A second 419 is a real fault, not a race, so it is surfaced rather
  // than retried into a loop.
  if (response.status === 419) {
    await ensureCsrfCookie();
    response = await post(path, body);
  }

  if (!response.ok) {
    throw await toError(path, response);
  }

  return (await response.json()) as T;
}
