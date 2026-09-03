import assert from "node:assert/strict";
import { test } from "node:test";

import { giftAddressesAgree, orderFormAccepts, orderNoteIn } from "./order-note.ts";

/**
 * ~~Two halves, and both of them are testable here.~~ **One half, from 3
 * September 2026**, and the other one stopped existing.
 *
 * The **composition** was a pure function of three strings — `giftNote` — and
 * it is gone with the stopgap it served. `POST /orders` grew `lines[].gift`,
 * so a present travels as three fields rather than as a sentence about them,
 * and there is no prose left to assert the wording of. What replaced those
 * eleven tests is the shape of the object and the one rule the wire adds: a
 * line may carry a question or a present, never both.
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
 * **The same shape of failure cost the gifting release**, and it is what the
 * assertions on `gift` below are for: the panel read all four boxes correctly
 * and answered a sentence, `POST /orders` was never given the object, and every
 * gift bought was a self-purchase with a note on it — no code, no mail to the
 * recipient, nothing on the Gifts screen, and a reading queued for the buyer.
 * A test that stops at "it noticed the gift section" cannot see that. These
 * assert what is handed to the order.
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

test("no node is an empty note, and no gift", () => {
  // `event.currentTarget` after a React event has been pooled, or a ref that
  // has not attached yet. Both are ordinary, and neither is a reason to refuse
  // a press.
  //
  // No `gift` key rather than one holding nothing, because its presence is what
  // decides whether the line carries a present at all — and "we could not tell"
  // has to resolve to the safe one of the two.
  assert.deepEqual(orderNoteIn(null), { text: "" });
  assert.deepEqual(orderNoteIn(undefined), { text: "" });
});

test("a node outside any form is an empty note", () => {
  // The shape of the bug this guard exists for: a row lifted out of the order
  // form by a refactor. It answers empty rather than throwing, because an
  // order with no question is valid — which is why `check:panel` asserts the
  // note arrives rather than trusting this to fail loudly.
  const orphan = { closest: () => null } as unknown as Element;

  assert.deepEqual(orderNoteIn(orphan), { text: "" });
});

test("the question section answers the question, and is not a gift", () => {
  const { node } = formOf({ question: "What should I let go of?" });

  assert.deepEqual(orderNoteIn(node), { text: "What should I let go of?" });
});

test("the gift section is read by `data-field`, not by the name it submits under", () => {
  /*
    **The regression this file exists to hold.** The two address fields go to
    the browser under `CountedField`'s opaque `useId` string so that Chrome does
    not offer the purchaser their own address, so a reader keyed to `name` finds
    nothing, takes the not-a-gift arm and sends no present — an order that is
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
    text: "",
    gift: {
      recipient_email: "alice@example.com",
      signature: "Mum",
      message: "Happy birthday.",
    },
  });
});

test("the fields are the wire's, not ours", () => {
  /*
    `PlaceOrderInput` is handed to `apiWrite` as it stands, so a camelCase key
    here is a field the backend does not read and a present with no address —
    which is a 422 at best and, on a required field the endpoint defaulted,
    would be a gift sent nowhere. The names are asserted rather than the values
    because it is the spelling that travels.
  */
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
    giftMessage: "Happy birthday.",
  });

  assert.deepEqual(Object.keys(orderNoteIn(node).gift!).sort(), ["message", "recipient_email", "signature"]);
});

test("a gift carries no question, so the pair is never sent", () => {
  /*
    **A 422 keyed to the question**, and the one rule the wire adds that the
    panel could break on its own. The person who will ask has not seen the
    present yet — asking is what redemption is for — so a line carrying both is
    refused rather than quietly stripped.

    The form here holds both boxes, which the panel never draws: the sections
    are mutually exclusive and this is the state a revision that merged them
    would produce. The reader states the empty question rather than reading one,
    so it stays right through that.
  */
  const { node } = formOf({
    question: "What should I focus on?",
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
  });

  assert.equal(orderNoteIn(node).text, "");
});

test("an untouched gift section is still a gift", () => {
  /*
    Presence, not truthiness. `orderFormAccepts` is what stops a press getting
    here, and it is a guard rather than a guarantee.

    **The empty present travels**, which is the half worth stating. The backend
    requires an address and a signature, so this order is refused with nothing
    charged; dropping the empty object here would place an ordinary order for
    the buyer instead — the exact failure of the composed note this replaced.
  */
  const { node } = formOf({ giftSignature: "", recipientEmail: "", addressConfirmation: "", giftMessage: "" });

  assert.deepEqual(orderNoteIn(node), {
    text: "",
    // No `message` key at all rather than an empty one, so a gift mail cannot
    // render the buyer's words as a blank line.
    gift: { recipient_email: "", signature: "" },
  });
});

test("every field is trimmed, as the question already was", () => {
  /*
    Whitespace on an order line comes back out in the admin table and in the
    two mails sent from it — and the signature is in the **subject** of one of
    them, sent to somebody who has never heard of us, where a leading space is
    the sort of thing a filter reads as machinery.

    Trimmed here rather than downstream because there is one reader and two
    roads, and a trim in either road is a trim the other can forget.
  */
  const { node } = formOf({
    giftSignature: "  Mum  ",
    recipientEmail: "  alice@example.com  ",
    addressConfirmation: "alice@example.com",
    giftMessage: "  Happy birthday.  ",
  });

  assert.deepEqual(orderNoteIn(node).gift, {
    recipient_email: "alice@example.com",
    signature: "Mum",
    message: "Happy birthday.",
  });
});

test("a message of nothing but spaces is no message", () => {
  // `giftMessage` is the only field on either section that says "optional" on
  // its own label, and the mail branches on its presence. A gift mail rendering
  // three spaces where the buyer's words go is the ordinary case reading like a
  // fault.
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
    giftMessage: "   ",
  });

  assert.equal("message" in orderNoteIn(node).gift!, false);
});

test("a self-purchase carries no present at all", () => {
  // The field the line and the record are both written from, so "not a gift"
  // has to be absence rather than an empty object the backend would refuse.
  assert.equal(orderNoteIn(formOf({ question: "What next?" }).node).gift, undefined);
});

test("the confirmation is a check on the buyer, and never travels", () => {
  /*
    It is not a second thing the buyer told us and there is nowhere for it to
    go: the backend has one address on a present and no second one to compare
    it against. An order quoting the same address twice would be asking the
    other side to re-run a validation this one already did.
  */
  const { node } = formOf({
    giftSignature: "Mum",
    recipientEmail: "alice@example.com",
    addressConfirmation: "alice@example.com",
    giftMessage: "",
  });

  assert.equal(
    JSON.stringify(orderNoteIn(node)).match(/alice@example\.com/g)?.length,
    1,
  );
});

test("a gift is a gift however little was typed into it", () => {
  /*
    The invariant stated once, over the eight ways the three fields can be
    blank — the property the untouched section above asserts by example.
    `placeOneReading` drops an empty **question** from the line; it does not
    drop an empty present, because an order carrying no trace of the gift is
    one the backend accepts and the buyer pays for.
  */
  for (const giftSignature of ["", "   "]) {
    for (const recipientEmail of ["", "   "]) {
      for (const giftMessage of ["", "   "]) {
        const { node } = formOf({ giftSignature, recipientEmail, addressConfirmation: "", giftMessage });

        assert.notEqual(orderNoteIn(node).gift, undefined);
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
