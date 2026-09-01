import assert from "node:assert/strict";
import { test } from "node:test";

import { giftNote, orderFormAccepts, orderNoteIn } from "./order-note.ts";

/**
 * Two halves, and only one of them is testable here.
 *
 * The **reading** — `closest("form")` from the wallet row's own node, and
 * `FormData` off the form it finds — is DOM the way `sessionStorage` is
 * storage: faking it here would be asserting against the fake. It is proved in
 * a real browser instead, by `check:panel`, which fills both sections and reads
 * them back along exactly that path, and by the order the card press actually
 * places. See "a wallet press would read the same fields off the same form"
 * there.
 *
 * The **composition** is a pure function of two strings and is proved here,
 * because what it answers is what Jennifer reads in the orders table and it is
 * the whole of what a gift order carries. That split is why `giftNote` is
 * exported at all: it exists as a seam, not because anything else calls it.
 */

test("no node is an empty note, and not a gift", () => {
  // `event.currentTarget` after a React event has been pooled, or a ref that
  // has not attached yet. Both are ordinary, and neither is a reason to refuse
  // a press.
  //
  // `gift: false` rather than absent, because the flag decides what a cancelled
  // checkout puts back in the question box — and "we could not tell" has to
  // resolve to the safe one of the two.
  assert.deepEqual(orderNoteIn(null), { text: "", gift: false });
  assert.deepEqual(orderNoteIn(undefined), { text: "", gift: false });
});

test("a node outside any form is an empty note", () => {
  // The shape of the bug this guard exists for: a row lifted out of the order
  // form by a refactor. It answers empty rather than throwing, because an
  // order with no question is valid — which is why `check:panel` asserts the
  // note arrives rather than trusting this to fail loudly.
  const orphan = { closest: () => null } as unknown as Element;

  assert.deepEqual(orderNoteIn(orphan), { text: "", gift: false });
});

test("a gift names the recipient and carries the message", () => {
  assert.equal(
    giftNote({ recipient: "alice@example.com", message: "Happy birthday." }),
    "Gift — send this reading to alice@example.com\n\nThe buyer's message: Happy birthday.",
  );
});

test("the message is optional, and its absence leaves no empty label", () => {
  // `giftMessage` is the only field on either section that says "optional" on
  // its own label. A note ending in a dangling "The buyer's message:" would be
  // the ordinary case reading like a fault.
  assert.equal(
    giftNote({ recipient: "alice@example.com", message: "   " }),
    "Gift — send this reading to alice@example.com",
  );
});

test("a gift with no recipient still says it is a gift", () => {
  /*
    **The assertion this function exists for.** Nothing submits the order form,
    so the `required` on the recipient's field never fires and a buyer can pay
    for a gift having typed nothing at all. An empty note on that order is
    indistinguishable from somebody buying a reading for themselves — and the
    reading would go to the buyer, silently, which is the one outcome no state
    of this form may produce.
  */
  assert.equal(giftNote({ recipient: "", message: "" }), "Gift — the buyer gave no recipient address.");

  assert.equal(
    giftNote({ recipient: " ", message: "For you." }),
    "Gift — the buyer gave no recipient address.\n\nThe buyer's message: For you.",
  );
});

test("both fields are trimmed, as the question already was", () => {
  // Whitespace on an order line comes back out in the admin table and in the
  // email Jennifer sends from it.
  assert.equal(
    giftNote({ recipient: "  alice@example.com  ", message: "  Happy birthday.  " }),
    "Gift — send this reading to alice@example.com\n\nThe buyer's message: Happy birthday.",
  );
});

test("a gift note is never empty, whatever it is given", () => {
  /*
    The invariant stated once, over the four ways the two fields can be blank —
    the property the case above asserts by example. `placeOneReading` drops an
    empty question from the line entirely, so an empty answer here would not be
    a blank note on a gift order. It would be no note at all.
  */
  for (const recipient of ["", "   "]) {
    for (const message of ["", "   "]) {
      assert.notEqual(giftNote({ recipient, message }), "");
    }
  }
});

test("a form nobody can find is not an invalid form", () => {
  /*
    A row lifted out of the order form by a refactor makes every press answer an
    empty note, which is harmless — the order goes without one. Refusing here
    instead would turn that into a dead button on a panel that looks perfectly
    well, and it is `check:panel` that catches the lift.
  */
  assert.equal(orderFormAccepts(null), true);
  assert.equal(orderFormAccepts(undefined), true);
  assert.equal(orderFormAccepts({ closest: () => null } as unknown as Element), true);
});

test("what the form says is what is answered, and it is asked to say it out loud", () => {
  /*
    `reportValidity` rather than `checkValidity`: the browser draws its own
    message on the offending field and focuses it. Refusing a press silently
    would be the same fault as taking the money — the buyer learns nothing
    either way.
  */
  const asked: string[] = [];

  const formSaying = (verdict: boolean) =>
    ({
      closest: () => ({
        reportValidity: () => {
          asked.push("reportValidity");

          return verdict;
        },
        checkValidity: () => {
          asked.push("checkValidity");

          return verdict;
        },
      }),
    }) as unknown as Element;

  assert.equal(orderFormAccepts(formSaying(false)), false);
  assert.equal(orderFormAccepts(formSaying(true)), true);
  assert.deepEqual(asked, ["reportValidity", "reportValidity"]);
});
