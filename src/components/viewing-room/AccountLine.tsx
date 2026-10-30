"use client";

import { SignOutConfirm } from "@/components/account/SignOutConfirm";
import { useSignedIn } from "@/components/account/useSignedIn";
import { type Customer, customerLabel } from "@/lib/session";

/**
 * Which account is signed in, and the way out of it.
 *
 * **Not in the client's frame, and added deliberately.** `API_CONTRACT.md`
 * warns that people pay under one address and then sign in as another, and
 * the no-pass state is precisely where that person lands. A panel that only
 * says "buy it" tells somebody who already bought it to buy it again — which
 * the backend answers with a 422, after they have typed their card in.
 *
 * Shown only in `no-pass`: a signed-out visitor has no account to switch away
 * from, and a member never sees this panel at all.
 *
 * Minimal on purpose. It exists because the contract warns about it, not
 * because the design asked for it, so it takes the sign-in line's type and
 * sits beside it rather than competing with the button.
 */
export function AccountLine({
  labels,
  pretend,
}: {
  labels: { signedInAs: string; switch: string };
  /**
   * A stand-in account, for the dev `?state=no-pass` override only.
   *
   * That switch changes which panel is drawn without signing anybody in, so
   * there is no real customer to name and this line rendered as nothing —
   * the one state it exists for was the one state you could not review. A
   * real no-pass visitor always has a session, so this is never set in
   * production.
   */
  pretend?: Customer;
}) {
  const { customer: signedIn } = useSignedIn();
  const customer = signedIn ?? pretend;

  if (!customer) return null;

  /*
    **Tighter than the masthead's `gap-4`, and the panel's height is why.**
    `PaywallModal` is capped so it reads as something laid over a room rather
    than as a page — `check:viewing-room` holds it under 62% of the viewport —
    and this row sits at the bottom of the tallest screen it draws. At `gap-4`
    plus the button's own box it pushed 1280x800 and 1440x900 over that line.
    `gap-2` keeps the air the button needs against the text and gives the cap
    its margin back.
  */
  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <p className="text-center font-sans text-[clamp(12px,0.95vw,15px)] text-[#f9f3d0]/70">
        {labels.signedInAs}{" "}
        <span title={customer.email} className="text-[#f9f3d0]">
          {customerLabel(customer)}
        </span>
        {"."}
      </p>

      {/*
        **The way out, under the account rather than inside the sentence.**

        It was a "switch account" link woven into the line above, which swapped
        the whole line for a question when pressed — so the one thing this
        panel exists to show, *which* account is signed in, disappeared at the
        moment somebody was deciding whether to leave it. The control now sits
        below and arms itself instead; the line never moves.

        `tone="panel"` because the paywall draws from the PSD's own champagne
        and gold rather than the site tokens. See `SignOutConfirm`.
      */}
      <SignOutConfirm tone="panel" />
    </div>
  );
}
