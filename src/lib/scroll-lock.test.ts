import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { lockScroll } from "./scroll-lock.ts";

const realDocument = globalThis.document;
const realWindow = globalThis.window;

/**
 * Enough of a document for the lock: two elements with a `style` each.
 *
 * Stubbed at the globals the way `passwords.test.ts` stubs `fetch` and
 * `document`, rather than reaching for a DOM implementation. The lock only ever
 * touches three string properties and one measurement, and a real DOM would add
 * a dependency to test four assignments.
 */
function stubDocument({ scrollbar = 0 }: { scrollbar?: number } = {}): void {
  const root = { style: { overflow: "", paddingRight: "" }, clientWidth: 1000 };
  const body = { style: { overflow: "" } };

  globalThis.document = { documentElement: root, body } as unknown as Document;
  globalThis.window = { innerWidth: 1000 + scrollbar } as unknown as Window & typeof globalThis;
}

function styles() {
  return {
    rootOverflow: document.documentElement.style.overflow,
    rootPadding: document.documentElement.style.paddingRight,
    bodyOverflow: document.body.style.overflow,
  };
}

beforeEach(() => stubDocument());

afterEach(() => {
  globalThis.document = realDocument;
  globalThis.window = realWindow;
});

/*
  The lock's holder count is module state, deliberately — one page, one count.
  So every test has to hand the page back before the next one, or it starts with
  a holder nobody can see and the count never returns to zero.
*/
test("locks on the first holder", () => {
  const release = lockScroll();

  assert.deepEqual(styles(), { rootOverflow: "hidden", rootPadding: "", bodyOverflow: "hidden" });

  release();
});

test("restores what it found when the last holder releases", () => {
  document.documentElement.style.overflow = "visible";
  document.body.style.overflow = "scroll";

  lockScroll()();

  assert.deepEqual(styles(), {
    rootOverflow: "visible",
    rootPadding: "",
    bodyOverflow: "scroll",
  });
});

test("a second holder does not re-capture the already-locked values", () => {
  document.body.style.overflow = "scroll";

  const releaseFirst = lockScroll();
  const releaseSecond = lockScroll();

  releaseFirst();
  // Still held by the second, so still locked.
  assert.equal(document.body.style.overflow, "hidden");

  releaseSecond();
  // And the value restored is the one from before *either* holder, not "hidden".
  assert.equal(document.body.style.overflow, "scroll");
});

test("releases out of order and still restores the original values", () => {
  /*
    The case this seam exists for: the paywall locks, the drawer locks over it,
    and the paywall unmounts first — which is what signing out inside the drawer
    on the Viewing Room does to a member.
  */
  document.documentElement.style.overflow = "visible";
  document.body.style.overflow = "scroll";

  const releasePaywall = lockScroll();
  const releaseDrawer = lockScroll();

  releasePaywall();
  releaseDrawer();

  assert.deepEqual(styles(), {
    rootOverflow: "visible",
    rootPadding: "",
    bodyOverflow: "scroll",
  });
});

test("releasing twice is harmless", () => {
  document.body.style.overflow = "scroll";

  const release = lockScroll();
  const other = lockScroll();

  release();
  release();

  // The second call must not have dropped the other holder's count.
  assert.equal(document.body.style.overflow, "hidden");

  other();
  assert.equal(document.body.style.overflow, "scroll");
});

test("pads the root by the scrollbar's width, and takes the padding away again", () => {
  stubDocument({ scrollbar: 15 });

  const release = lockScroll();
  assert.equal(document.documentElement.style.paddingRight, "15px");

  release();
  assert.equal(document.documentElement.style.paddingRight, "");
});

test("adds no padding when there is no scrollbar to replace", () => {
  const release = lockScroll();

  assert.equal(document.documentElement.style.paddingRight, "");

  release();
});
