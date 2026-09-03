import assert from "node:assert/strict";
import { test } from "node:test";

import { giftAddressesAgree, giftNote, orderFormAccepts, orderNoteIn } from "./order-note.ts";

/**
 * Two halves, and ~~only one of them is testable here~~ **both of them are,
 * from 3 September 2026**.
 *
 * The **composition** is a pure function of three strings and was always proved
 * here, because what it answers is what Jennifer reads in the orders table and
 * it is the whole of what a gift order carries. That split is why `giftNote` is
 * exported at all: it exists as a seam, not because anything else calls it.
 *
 * The **reading** — `closest("form")` from the wallet row's own node, and the
 * fields out of the form it finds — used to be DOM the way `sessionStorage` is
 * storage, and was left to `check:panel` on the grounds that faking it here
 * would be asserting against the fake. That was true of `new FormData(form)`,
 * which is a browser primitive with nothing to stand in for it. It stopped
 * being true when the reader moved to `querySelector("[data-field=…]")` and
 * `.value`, which is two calls wide and can be faked honestly.
 *
 * **And the week it was untested is the week it was broken.** Autofill
 * suppression renamed the recipient's field on 29 August, this reader shipped
 * keyed to the old name on 30 August, and nothing in this file could see it:
 * every gift order in between composed no note and was flagged as a
 * self-purchase. The seam that was too hard to test is the seam that failed, so
 * the tests below drive the whole path from a node to an `OrderNote`.
 *
 * `check:panel` still owns what a fake cannot reach: that the row really is
 * inside the form, that the fields really carry `data-field`, and that a real
 * browser really refuses the press.
 */

/** A field as this module uses one: a value, and somewhere to write a refusal. */
function fieldOf(value: string) {
  return { value, validity: "", setCustomValidity(said: string) { this.validity = said; } };
}

/**
 * A form holding exactly the fields named, and nothing else.
 *
 * An absent field answers `null` rather than an empty value, which is the
 * distinction the mode turns on: gift mode is "the recipient's box exists",
 * never "somebody typed in it".
 *
 * `mismatch` is the sentence `RecipientDetails` hangs on the confirmation's
 * wrapper. A section can be built without one — that is what an absent
 * `data-mismatch` means — and the refusal it produces has to be readable or not
 * happen at all.
 *
 * The selector is matched rather than sliced, so this fake is coupled to
 * *which* attribute the reader asks for and not to how it spells the query.
 */
function formOf(fields: Record<string, string>, mismatch: string | null = "These do not match.") {
  const boxes = new Map(Object.entries(fields).map(([name, value]) => [name, fieldOf(value)]));

  const form = {
    boxes,
    querySelector: (selector: string) =>
      selector.includes("data-mismatch")
        ? mismatch === null
          ? null
          : { getAttribute: (named: string) => (named === "data-mismatch" ? mismatch : null) }
        : (boxes.get(selector.match(/data-field="([^"]+)"/)?.[1] ?? "") ?? null),
    reportValidity: () => [...boxes.values()].every((box) => box.validity === ""),
  };

  return { form, node: { closest: () => form } as unknown as Element };
}

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

test("the question section answers the question, and is not a gift", () => {
  const { node } = formOf({ question: "What should I let go of?" });

  assert.deepEqual(orderNoteIn(node), { text: "What should I let go of?", gift: false });
});

test("the gift section is read by `data-field`, not by the name it submits under", () => {
  /*
    **The regression this file exists to hold.** The two address fields go to
    the browser under `CountedField`'s opaque `useId` string so that Chrome does
    not offer the purchaser their own address, so a reader keyed to `name` finds
    nothing, takes the not-a-gift arm and sends no note — an order that is
    indistinguishable from somebody buying a reading for themselves, on which
    the reading goes quietly to the buyer.
  */
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
    giftMessage: "Happy birthday.",
  });

  assert.deepEqual(orderNoteIn(node), {
    text: "Gift from Mum — send this reading to alice@example.com\n\nThe buyer's message: Happy birthday.",
    gift: true,
    recipient: "alice@example.com",
  });
});

test("an untouched gift section is still a gift", () => {
  // Presence, not truthiness. `orderFormAccepts` is what stops a press getting
  // here, and it is a guard rather than a guarantee.
  const { node } = formOf({ giftSignature: "", recipientEmail: "", addressConfirmation: "", giftMessage: "" });

  // No `recipient` key at all rather than an empty one, so the confirmation
  // falls back to naming nobody instead of interpolating a blank into a
  // sentence about where the gift went.
  assert.deepEqual(orderNoteIn(node), {
    text: "Gift — the buyer gave no recipient address.",
    gift: true,
  });
});

test("the note carries the address the confirmation will name, trimmed", () => {
  /*
    **The one thing a gift buyer is owed that the note cannot give back.** The
    line is prose written for Jennifer and parsing an address back out of it
    downstream is the `startsWith("Gift")` inference `lib/buy.ts` refuses by
    name, so the address travels beside the line as its own field.

    Trimmed here, because it is the value a sentence on the confirmation is
    built from and a mobile keyboard leaves a space after a pasted address.
  */
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "  alice@example.com  ",
    addressConfirmation: "alice@example.com",
    giftMessage: "",
  });

  const note = orderNoteIn(node);

  assert.equal(note.recipient, "alice@example.com");
  assert.equal(note.text, "Gift from Mum — send this reading to alice@example.com");
});

test("a self-purchase carries no recipient at all", () => {
  // The field the record is written from, so "not a gift" has to be absence
  // rather than an empty string a screen could still print.
  assert.equal(orderNoteIn(formOf({ question: "What next?" }).node).recipient, undefined);
});

test("the confirmation is a check on the buyer, and never travels", () => {
  /*
    It is not a second thing the buyer told us and there is nowhere for it to
    go: `POST /orders` has one free-text field per line and the note is already
    composed of three things. An order line quoting the same address twice would
    be Jennifer reading a form's validation out of a table cell.
  */
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
    giftMessage: "",
  });

  assert.equal(orderNoteIn(node).text.match(/alice@example\.com/g)?.length, 1);
});

test("a gift names who it is from, who it is for, and what was said", () => {
  assert.equal(
    giftNote({ signature: "Mum", recipient: "alice@example.com", message: "Happy birthday." }),
    "Gift from Mum — send this reading to alice@example.com\n\nThe buyer's message: Happy birthday.",
  );
});

test("the signature goes in front of the address, never after it", () => {
  /*
    The same rule as the full stop: whatever ends this clause is a character
    somebody copying the address out of a table cell takes with them, and a
    comma is no better than a period for that. The address ends the line in
    every arm of this function.
  */
  const line = giftNote({ signature: "Mum", recipient: "alice@example.com", message: "" });

  assert.ok(line.endsWith("alice@example.com"));
});

test("the message is optional, and its absence leaves no empty label", () => {
  // `giftMessage` is the only field on either section that says "optional" on
  // its own label. A note ending in a dangling "The buyer's message:" would be
  // the ordinary case reading like a fault.
  assert.equal(
    giftNote({ signature: "Mum", recipient: "alice@example.com", message: "   " }),
    "Gift from Mum — send this reading to alice@example.com",
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
  assert.equal(
    giftNote({ signature: "", recipient: "", message: "" }),
    "Gift — the buyer gave no recipient address.",
  );

  assert.equal(
    giftNote({ signature: " ", recipient: " ", message: "For you." }),
    "Gift — the buyer gave no recipient address.\n\nThe buyer's message: For you.",
  );
});

test("a signature with no address still names who it is from", () => {
  // The signature is required on the form from #71, and composed here as though
  // it might be missing for the reason the recipient is. Jennifer is the one
  // who has to act on this line, and half of it is worth more than none.
  assert.equal(
    giftNote({ signature: "Mum", recipient: "  ", message: "" }),
    "Gift from Mum — the buyer gave no recipient address.",
  );
});

test("all three fields are trimmed, as the question already was", () => {
  // Whitespace on an order line comes back out in the admin table and in the
  // email Jennifer sends from it.
  assert.equal(
    giftNote({ signature: "  Mum  ", recipient: "  alice@example.com  ", message: "  Happy birthday.  " }),
    "Gift from Mum — send this reading to alice@example.com\n\nThe buyer's message: Happy birthday.",
  );
});

test("a gift note is never empty, whatever it is given", () => {
  /*
    The invariant stated once, over the eight ways the three fields can be blank
    — the property the case above asserts by example. `placeOneReading` drops an
    empty question from the line entirely, so an empty answer here would not be
    a blank note on a gift order. It would be no note at all.
  */
  for (const signature of ["", "   "]) {
    for (const recipient of ["", "   "]) {
      for (const message of ["", "   "]) {
        assert.notEqual(giftNote({ signature, recipient, message }), "");
      }
    }
  }
});

test("two addresses agree when they are the same address", () => {
  assert.equal(giftAddressesAgree("alice@example.com", "alice@example.com"), true);
  assert.equal(giftAddressesAgree("alice@example.com", "alicia@example.com"), false);
});

test("agreement is trimmed and case-folded, because a typo is what is being caught", () => {
  /*
    A mobile keyboard capitalises the first letter of a box it was not told not
    to, and a pasted address arrives with a trailing space often enough that
    refusing either would be refusing a buyer who typed the address correctly
    twice. The local part is case-sensitive in the RFC and is not in practice,
    and what is at stake here is a typo rather than a delivery.
  */
  assert.equal(giftAddressesAgree("alice@example.com", " Alice@Example.com "), true);
});

test("an empty confirmation agrees with anything, so `required` is what speaks", () => {
  // A buyer who has typed nothing has not made a mistake yet. "These do not
  // match" on an empty box is a worse sentence than the browser's own "please
  // fill out this field", which the `required` beside it already has.
  assert.equal(giftAddressesAgree("alice@example.com", ""), true);
  assert.equal(giftAddressesAgree("alice@example.com", "   "), true);
});

test("a press writes the disagreement on the confirmation, and refuses", () => {
  /*
    `setCustomValidity` and nothing else. The state goes on the field, where the
    browser's own machinery picks it up alongside the `required` — which is what
    keeps this the single place a press can be refused, and why the comparison
    happens on the way past rather than in a listener that has to have run.
  */
  const { form, node } = formOf({ recipientEmail: "alice@example.com", addressConfirmation: "alicia@example.com" });

  assert.equal(orderFormAccepts(node), false);
  assert.equal(form.boxes.get("addressConfirmation")?.validity, "These do not match.");
});

test("and takes it back off as soon as the two agree", () => {
  // Recomputed at every press, so **editing the address after confirming it**
  // is caught exactly as editing the confirmation is. A listener would have to
  // have seen the keystroke; this only has to have been called.
  const { form, node } = formOf({ recipientEmail: "alice@example.com", addressConfirmation: "alicia@example.com" });

  assert.equal(orderFormAccepts(node), false);

  form.boxes.get("recipientEmail")!.value = "alicia@example.com";

  assert.equal(orderFormAccepts(node), true);
  assert.equal(form.boxes.get("addressConfirmation")?.validity, "");
});

test("a section with no sentence to refuse with does not refuse", () => {
  // An absent `data-mismatch` is a section built without the copy on it. A
  // bubble the buyer cannot read is worse than the typo it was catching, and
  // `check:panel` is what would catch the missing attribute.
  const { form, node } = formOf(
    { recipientEmail: "alice@example.com", addressConfirmation: "alicia@example.com" },
    null,
  );

  assert.equal(orderFormAccepts(node), true);
  assert.equal(form.boxes.get("addressConfirmation")?.validity, "");
});

test("a press on a section with no confirmation field compares nothing", () => {
  // A self-purchase, and the two shapes of missing form. None of them is a
  // reason to throw, and none of them is an invalid form.
  const { node } = formOf({ question: "What should I let go of?" });

  assert.equal(orderFormAccepts(node), true);
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
        // A self-purchase: nothing to compare, and the comparison on the way
        // past has to survive finding nothing rather than deciding the verdict.
        querySelector: () => null,
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
