"use client";

import { useEffect, useState } from "react";

import { type ApiProduct, fetchProducts } from "@/lib/api";
import { ApiRateLimitError, ApiValidationError } from "@/lib/api-write";
import { type PaymentInstruction, placeOrder, payOrder } from "@/lib/orders";
import type { Money } from "@/lib/price";

/**
 * Runs the real write seam end to end and shows what came back.
 *
 * **It makes no `fetch` of its own.** That is the whole discipline of this
 * component: every request it causes is one `lib/orders.ts` made, so a green
 * run here is evidence about that module rather than about this page. Anything
 * added here that talks to the network directly destroys the proof.
 */

type Report = {
  /** What the order came back as. Never "paid" — a 201 means recorded. */
  status: string;
  /** The order's total, currency and all. Never an amount on its own. */
  total: Money;
  instruction: PaymentInstruction;
};

/** The product this buys. Key, price and currency all come from the catalogue. */
function firstBuyable(products: ApiProduct[]): ApiProduct | undefined {
  // The Viewing Room pass can only ever be bought once per customer, so it is a
  // 422 the second time the probe runs against the same address. A reading can
  // be bought as often as anybody likes, which is what a repeatable proof needs.
  return products.find((product) => product.type === "reading");
}

export function CheckoutProbe() {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts({ signal: controller.signal })
      .then((products) => setProduct(firstBuyable(products) ?? null))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(describe(cause));
      });

    return () => controller.abort();
  }, []);

  async function run() {
    if (!product) return;

    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const order = await placeOrder({
        name: "Checkout Probe",
        email: `probe+${Date.now()}@theworldtarot.com`,
        currency: product.price.currency,
        lines: [{ product: product.key, quantity: 1 }],
      });

      // The pay token stays in this scope and dies with it. Not in the URL, not
      // in state that a devtools panel prints, not in a log. It is the whole of
      // the authority to pay this order.
      // No `return_to`: this page is not a reading page, and the key is a
      // fixed set the backend validates against rather than an address.
      const instruction = await payOrder(order.payToken);

      setReport({
        status: order.status,
        total: order.total,
        instruction,
      });
    } catch (cause: unknown) {
      setError(describe(cause));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-24 font-mono text-sm">
      <h1 className="text-lg">Checkout probe</h1>
      <p className="mt-2 opacity-70">
        Places a real pending order against the staging API. That is the proof, not a
        side effect.
      </p>

      <p className="mt-6">
        Product: {product ? `${product.key} (${product.price.currency})` : "…"}
      </p>

      <button
        type="button"
        onClick={run}
        disabled={!product || running}
        className="mt-4 border px-4 py-2 disabled:opacity-40"
      >
        {running ? "Placing…" : "Place and pay"}
      </button>

      {report ? (
        <dl className="mt-8 grid grid-cols-[10rem_1fr] gap-2">
          <dt>order status</dt>
          <dd>{report.status}</dd>
          <dt>total</dt>
          <dd>
            {report.total.amount} {report.total.currency} (minor units)
          </dd>
          <dt>pay type</dt>
          <dd>{report.instruction.type}</dd>
          {/*
            Whatever the instruction names, and nothing else. A Session URL is
            not a credential and is shown; the pay token is one and is not, on
            this page or anywhere.
          */}
          <dt>and what it names</dt>
          <dd className="break-all">{whatItNames(report.instruction)}</dd>
        </dl>
      ) : null}

      {error ? <p className="mt-8 break-words">{error}</p> : null}
    </section>
  );
}

/**
 * The field the instruction's `type` names — read by the type and never
 * inferred from the shape, which is the rule the contract states and this page
 * exists to prove is being followed.
 */
function whatItNames(instruction: PaymentInstruction): string {
  switch (instruction.type) {
    case "redirect":
      return instruction.redirectUrl;
    case "client_secret":
      return instruction.clientSecret;
    case "unrecognised":
      return `nothing this build knows — the backend reported "${instruction.reportedType}"`;
    case "nothing_to_pay":
      return "nothing to collect";
  }
}

/**
 * The typed errors, told apart without parsing a body. A 419 that survived the
 * seam's one retry arrives as a plain `ApiError` and reads as a stale token —
 * which on this origin means the cookie never made the round trip at all.
 */
function describe(cause: unknown): string {
  if (cause instanceof ApiValidationError) {
    const fields = Object.entries(cause.errors)
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join(" · ");

    return `422 ${fields || cause.message}`;
  }

  if (cause instanceof ApiRateLimitError) {
    return `429 — retry after ${cause.retryAfterSeconds ?? "?"}s`;
  }

  return cause instanceof Error ? cause.message : String(cause);
}
