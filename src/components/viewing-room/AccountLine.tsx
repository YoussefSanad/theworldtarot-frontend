"use client";

import { useState } from "react";

import { useSignedIn } from "@/components/account/useSignedIn";
import { customerLabel, signOut } from "@/lib/session";

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
export function AccountLine({ labels }: { labels: { signedInAs: string; switch: string } }) {
  const { customer, setCustomer } = useSignedIn();
  const [leaving, setLeaving] = useState(false);

  if (!customer) return null;

  return (
    <p className="mt-4 text-center font-sans text-[clamp(12px,0.95vw,15px)] text-[#f9f3d0]/70">
      {labels.signedInAs}{" "}
      <span title={customer.email} className="text-[#f9f3d0]">
        {customerLabel(customer)}
      </span>
      {". "}
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          try {
            await signOut();
          } catch {
            // A failed sign-out still clears this tab's idea of the session:
            // the alternative is a panel stuck naming an account the visitor
            // has asked to leave. The cookie outliving it is the backend's to
            // answer on the next call, which it will.
          }
          // Publishing null drops the modal back to its signed-out screen with
          // no reload, because every reader of the store sees it at once.
          setCustomer(null);
        }}
        className="underline decoration-from-font underline-offset-2 hover:text-[#d4b06a] disabled:opacity-50"
      >
        {labels.switch}
      </button>
    </p>
  );
}
