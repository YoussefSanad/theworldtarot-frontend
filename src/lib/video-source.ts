/**
 * Points a `<video>` at a source, whether that is a plain file or an HLS stream.
 *
 * The backend serves the Living Tarot films as HLS (`playlist.m3u8`) with
 * adaptive renditions. Safari plays that from `src` like any other file. Chrome
 * and Firefox do not, and need Media Source Extensions driven by a library, so
 * `hls.js` is imported on demand and only where it is actually needed.
 *
 * The bundled fallback card is still an MP4, and takes the plain path.
 *
 * Loading `hls.js` lazily matters here: it is roughly the size of the rest of
 * this page's JavaScript, and Safari never needs a byte of it.
 *
 * ## Attaching is separate from playing, on purpose
 *
 * The reveal attaches the source when the visitor looks like they are about to
 * press the button, and plays it when they do. That gap is what makes the
 * opening seconds sharp: adaptive streaming starts cautiously and climbs as it
 * measures the connection, so a stream that begins at the moment of the click
 * spends its first seconds at the lowest rendition, which is exactly when the
 * crossfade lands on it.
 *
 * Warming buys real measurements before the first frame is needed. It is capped
 * hard, because the audit that this whole project answers found 230MB loading on
 * page arrival, and prefetching film for visitors who never click would be a
 * smaller version of the same mistake.
 */

/** Enough to cover the crossfade and the first moments after it. */
const WARM_BUFFER_SECONDS = 8;

/** Once they have committed, buffer normally. */
const PLAYING_BUFFER_SECONDS = 30;

/**
 * What a cold start assumes about the connection, in bits per second.
 *
 * `hls.js` defaults to a pessimistic guess, which is right for a stream that has
 * to play immediately and wrong for one that has been warming. Seeded higher so
 * the first fragment is not automatically the worst rendition, and left to the
 * real measurements after that.
 */
const ASSUMED_BANDWIDTH = 1_500_000;

export type VideoSource = {
  /**
   * Resolves when the media can play. Rejects if it fails before that — a
   * fatal hls.js error before the manifest parses, or MSE turning out not to
   * actually work despite being present. Never left pending forever.
   */
  ready: Promise<void>;
  /** Lifts the warm buffer cap. Call when playback actually starts. */
  release: () => void;
  /** Detaches the source and tears down any player. */
  detach: () => void;
  /**
   * Fires on a fatal failure that arrives after `ready` already settled — a
   * promise can only reject once, and a segment can 403 well after the
   * manifest parsed cleanly, which is exactly the referrer/CORS/IP-family risk
   * this project's own migration plan calls out. `ready` alone cannot carry
   * that; this is the second half of "this must never hang."
   */
  onFatalError: (handler: (error: Error) => void) => void;
};

/**
 * The smallest rendition that still fills the card at this screen's density.
 *
 * Matched to what is actually on screen rather than to the best available: the
 * card is a portrait panel a few hundred pixels wide, so the largest renditions
 * would cost bandwidth for detail nobody can see. Falls back to the largest when
 * the element has not been laid out yet, or when nothing is big enough.
 */
function openingLevel(levels: readonly { width: number }[], video: HTMLVideoElement): number {
  if (levels.length === 0) return -1;

  // hls.js sorts `levels` by bitrate, and width usually rises with it but
  // isn't guaranteed to. Both "the largest available" and "the smallest that
  // still fills the card" are looked up by width on a sorted copy, and
  // translated back to hls.js's own index — never assumed from position.
  const byWidth = levels
    .map((level, index) => ({ index, width: level.width }))
    .sort((a, b) => a.width - b.width);
  const largest = byWidth[byWidth.length - 1].index;

  const rendered = video.getBoundingClientRect().width;
  if (rendered === 0) return largest;

  const wanted = rendered * (window.devicePixelRatio || 1);
  const found = byWidth.find((entry) => entry.width >= wanted);

  return found ? found.index : largest;
}

function isHls(src: string): boolean {
  return src.includes(".m3u8");
}

/**
 * Whether we can drive playback ourselves.
 *
 * **Deliberately not `canPlayType`.** Chrome on macOS answers "maybe" for HLS,
 * so asking the browser whether it can play a manifest hands playback to a
 * native player we cannot configure, on the one platform where we most want to.
 * That is not theoretical: it is what happened here, and it silently made every
 * setting below dead code while still appearing to work.
 *
 * Media Source Extensions is the honest question, because it is what `hls.js`
 * actually needs. Everything modern has it except the iPhone, which has real
 * native HLS and does not need us.
 */
function canDrivePlayback(): boolean {
  return typeof window !== "undefined" && "MediaSource" in window;
}

export function attachVideoSource(video: HTMLVideoElement, src: string): VideoSource {
  if (!isHls(src) || !canDrivePlayback()) {
    // The bundled MP4, or an iPhone playing HLS natively. `preload` on the
    // element does the warming, and there is no buffer cap to lift.
    video.src = src;

    return {
      ready: Promise.resolve(),
      release: () => {},
      detach: () => {
        video.removeAttribute("src");
        video.load();
      },
      // No player of our own here, so nothing to fail beyond what `ready`
      // already covers.
      onFatalError: () => {},
    };
  }

  let cancelled = false;
  let release = () => {};
  let destroy = () => {};

  // A promise can only settle once, so a failure discovered after `ready` has
  // already resolved — a segment 403ing well after the manifest parsed clean —
  // has nowhere to go through `ready` alone. `fatalErrorHandler` is that second
  // channel; `attachFatalErrorHandler` lets `RevealStage` register it before or
  // after the failure, since attach order relative to the network isn't
  // something a caller can guarantee.
  let fatalErrorHandler: ((error: Error) => void) | null = null;
  let readySettled = false;

  const reportFatalError = (error: Error) => {
    if (readySettled) fatalErrorHandler?.(error);
  };

  const ready = new Promise<void>((resolve, reject) => {
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;

      if (!Hls.isSupported()) {
        // Neither native HLS nor MSE. Nothing can play this — reject rather
        // than the old silent no-op, so the caller falls back to the bundled
        // card instead of hanging on the card back forever.
        readySettled = true;
        reject(new Error("Media Source Extensions is not supported."));
        return;
      }

      let playing = false;

      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: WARM_BUFFER_SECONDS,
        abrEwmaDefaultEstimate: ASSUMED_BANDWIDTH,

        // The card is a panel a few hundred pixels wide. Without this, a fast
        // connection climbs to 1080p for a picture nobody can see at that size,
        // which is bandwidth spent on nothing.
        capLevelToPlayerSize: true,

        // Loading is held until the opening rendition has been chosen, below.
        autoStartLoad: false,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;

        // **Choose the first rendition rather than letting it be guessed.**
        // Adaptive streaming opens at its most cautious and climbs from there,
        // which is right for a stream that must start instantly and wrong for
        // one the visitor is about to reveal: the climb happens underneath the
        // crossfade, so the card appears at the worst quality the film has.
        // Measured opening at 240p before this existed, 360p after.
        //
        // Only the opening fragment is pinned. Everything after it is chosen by
        // measurement, so a connection that cannot sustain this drops back at
        // once and nobody buffers for the sake of one frame.
        hls.startLevel = openingLevel(hls.levels, video);
        hls.startLoad();

        readySettled = true;
        resolve();
      });

      // Warming stops as soon as there is enough to cover the crossfade.
      // Without this, a fast connection quietly buffers the whole film for a
      // visitor who only hovered, which is a smaller version of the 230MB
      // page load this project exists to fix.
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (playing || cancelled) return;

        const buffered = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
        if (buffered >= WARM_BUFFER_SECONDS) hls.stopLoad();
      });

      // hls.js retries non-fatal errors itself — those are just logged. A
      // fatal one means it has given up, and the CDN's referrer/CORS/IP-family
      // rules are exactly the kind of thing that shows up here as a 403 well
      // after the manifest loaded fine.
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return;

        const error = new Error(`HLS playback failed fatally: ${data.details}`);
        if (!readySettled) {
          readySettled = true;
          reject(error);
        } else {
          reportFatalError(error);
        }
      });

      release = () => {
        playing = true;
        hls.config.maxBufferLength = PLAYING_BUFFER_SECONDS;
        hls.startLoad();
      };
      destroy = () => hls.destroy();
    });
  });

  return {
    ready,
    release: () => release(),
    detach: () => {
      cancelled = true;
      destroy();
    },
    onFatalError: (handler) => {
      fatalErrorHandler = handler;
    },
  };
}

/**
 * Whether it is polite to fetch video this visitor has not asked for.
 *
 * Data Saver is an explicit request not to, and a slow connection is one where
 * spending bandwidth on a maybe would make the page worse rather than better.
 * Unknown means a browser without the API, where the safe assumption is that
 * warming is fine, since that is every desktop browser.
 */
export function shouldWarm(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (!connection) return true;
  if (connection.saveData) return false;

  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}
