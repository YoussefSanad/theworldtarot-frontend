"use client";

import { ExpressCheckout } from "@/components/reading/ExpressCheckout";
import { HostedCheckoutButton } from "@/components/reading/HostedCheckoutButton";
import { viewingRoom } from "@/content/viewing-room";
import { useProduct } from "@/lib/product";

/** The backend's key for the pass. The same string the homepage tile keys to. */
const PASS = "viewing-room-pass";

/**
 * Screen two: the wallet step behind her gold button.
 *
 * **Her frame draws one button and no wallets**, which is the single gap in
 * an otherwise complete purchase design. But Apple Pay *and* Google Pay were
 * added to the reading pages on 29 August 2026 at her own request — so the
 * omission is an oversight in the drawing rather than a decision, and the
 * ticket's journey already describes the fix: "the payment step appears in
 * place".
 *
 * So pressing ENTER THE VIEWING ROOM swaps the panel's body rather than
 * opening a second dialog. The panel keeps its outline and heading, and the
 * swap reads as one panel changing.
 *
 * ## What is reused, and what is not
 *
 * `ExpressCheckout` and `HostedCheckoutButton` take `productKey` and `money`
 * and know nothing about readings, so they drop straight in. **`GetMyReading`
 * does not**, and is deliberately not reused: it is tangled with gifting, a
 * question field, a `ReadingPage` object and container-query units tuned to
 * the reading panel's width.
 *
 * **No gifting.** The pass can be bought once and never expires;
 * `API_CONTRACT.md` makes a second purchase a 422, and a gifted pass has no
 * redemption path built.
 */
export function PaymentPanel({
  onBack,
  labels,
}: {
  onBack: () => void;
  labels: { back: string; unavailable: string; loading: string };
}) {
  const offer = useProduct(PASS);

  return (
    <div className="mt-4 flex flex-col items-center">
      <p className="text-center text-[clamp(15px,1.4vw,22px)] tracking-[0.36px] text-white">
        {viewingRoom.panel.price}
      </p>

      <div className="mt-6 w-full max-w-[390px]">
        {offer.status === "loading" && (
          <p role="status" className="text-center text-sm text-[#f9f3d0]/70">
            {labels.loading}
          </p>
        )}

        {/*
          Withdrawn or unreachable: offer no way to pay. The same call the
          homepage makes when the catalogue answers without a tile — a price
          nobody has verified today is not a price to take money against.
        */}
        {(offer.status === "withdrawn" || offer.status === "unreachable") && (
          <p className="text-center text-sm text-[#f9f3d0]/70">{labels.unavailable}</p>
        )}

        {offer.status === "live" && (
          <>
            {/* Wallets first, as the reading pages order them. */}
            <ExpressCheckout productKey={PASS} money={offer.money} />

            <div className="mt-4">
              <HostedCheckoutButton productKey={PASS} money={offer.money} gifting={false} />
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 text-[clamp(13px,1.05vw,16px)] text-[#d4b06a] underline decoration-from-font underline-offset-2"
      >
        {labels.back}
      </button>
    </div>
  );
}
