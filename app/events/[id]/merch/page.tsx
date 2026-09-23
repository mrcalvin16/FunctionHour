"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CartItem = {
  merchId: Id<"merch">;
  variantId?: Id<"merchVariants">;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  available: number;
  fulfillmentMethod?: "pickup" | "shipping" | "hybrid";
  shippingFee: number;
  imageUrl?: string | null;
};

export default function EventMerchStore({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id as Id<"events">;
  const store = useQuery(api.merch.getStorefront, { eventId });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantChoices, setVariantChoices] = useState<Record<string, string>>(
    {},
  );
  const [fulfillment, setFulfillment] = useState<"pickup" | "shipping">(
    "pickup",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkoutResult, setCheckoutResult] = useState("");
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("checkout");
    if (result === "success" || result === "cancelled") setCheckoutResult(result);
  }, []);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const supportsPickup = cart.every(
    (item) => item.fulfillmentMethod !== "shipping",
  );
  const supportsShipping = cart.every(
    (item) => item.fulfillmentMethod !== "pickup",
  );
  const estimatedShipping =
    fulfillment === "shipping"
      ? Math.max(0, ...cart.map((item) => item.shippingFee))
      : 0;

  function addProduct(product: NonNullable<typeof store>["products"][number]) {
    const selectedVariantId = variantChoices[product._id] as
      | Id<"merchVariants">
      | undefined;
    const variant = selectedVariantId
      ? product.variants.find((item) => item._id === selectedVariantId)
      : undefined;
    if (product.variants.length && !variant) {
      setError(`Choose an option for ${product.name}.`);
      return;
    }
    const available = variant?.available ?? product.available;
    if (available < 1) {
      setError(`${product.name} is sold out.`);
      return;
    }
    const nextMethod =
      product.fulfillmentMethod === "printful"
        ? "shipping"
        : product.fulfillmentMethod;
    const incompatible = cart.some(
      (item) =>
        (item.fulfillmentMethod === "pickup" && nextMethod === "shipping") ||
        (item.fulfillmentMethod === "shipping" && nextMethod === "pickup"),
    );
    if (incompatible) {
      setError(
        "Pickup-only and shipping-only products must be purchased separately.",
      );
      return;
    }
    if (!cart.length && nextMethod === "shipping") setFulfillment("shipping");
    if (!cart.length && nextMethod === "pickup") setFulfillment("pickup");
    const key = `${product._id}:${selectedVariantId ?? "base"}`;
    setError("");
    setCart((items) => {
      const existing = items.find(
        (item) => `${item.merchId}:${item.variantId ?? "base"}` === key,
      );
      if (existing)
        return items.map((item) =>
          `${item.merchId}:${item.variantId ?? "base"}` === key
            ? { ...item, quantity: Math.min(available, item.quantity + 1, 10) }
            : item,
        );
      return [
        ...items,
        {
          merchId: product._id,
          variantId: variant?._id,
          name: product.name,
          variantName: variant?.name,
          price: variant?.price ?? product.price,
          quantity: 1,
          available,
          fulfillmentMethod: nextMethod,
          shippingFee: product.shippingFee ?? 0,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }

  function changeQuantity(index: number, delta: number) {
    setCart((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(10, item.available, item.quantity + delta),
              ),
            }
          : item,
      ),
    );
  }

  async function checkout() {
    if (
      (fulfillment === "pickup" && !supportsPickup) ||
      (fulfillment === "shipping" && !supportsShipping)
    ) {
      setError(
        "The products in this cart do not share the selected fulfillment method.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/merch-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fulfillmentMethod: fulfillment,
          items: cart.map(({ merchId, variantId, quantity }) => ({
            merchId,
            variantId,
            quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(data.error || "Unable to start checkout.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to start checkout.",
      );
      setBusy(false);
    }
  }

  if (store === undefined)
    return (
      <div className="min-h-screen bg-black p-10 text-center text-zinc-500">
        Loading merch store...
      </div>
    );
  if (!store)
    return (
      <div className="min-h-screen bg-black p-10 text-center text-white">
        Event not found.
      </div>
    );

  return (
    <main className="min-h-screen bg-[#07060c] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        {checkoutResult === "success" && (
          <div role="status" className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
            <span>Payment received. Your merch order is being confirmed and will appear in your order history.</span>
            <Link href="/my-merch-orders" className="font-black underline underline-offset-4">View my merch orders</Link>
          </div>
        )}
        {checkoutResult === "cancelled" && (
          <div role="status" className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">Checkout was cancelled. You have not been charged. Add your merch to the cart again whenever you’re ready.</div>
        )}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
              Official event merch
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              {store.event.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {store.event.location} · Secure checkout powered by Stripe
            </p>
          </div>
          <Link
            href={`/events/${eventId}`}
            className="text-xs font-black text-zinc-500 hover:text-white"
          >
            ← Event details
          </Link>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            {store.products.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {store.products.map((product) => {
                  const selectedVariant = product.variants.find(
                    (variant) => variant._id === variantChoices[product._id],
                  );
                  const available =
                    selectedVariant?.available ?? product.available;
                  return (
                    <article
                      key={product._id}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035]"
                    >
                      <div className="aspect-square bg-white/[0.03]">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-10 w-10 text-zinc-800" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-sm font-black">
                              {product.name}
                            </h2>
                            <p className="mt-1 text-xs text-zinc-600">
                              {product.productType ?? "Event merchandise"}
                            </p>
                          </div>
                          <p className="font-black text-orange-300">
                            {currency(selectedVariant?.price ?? product.price)}
                          </p>
                        </div>
                        {product.description ? (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">
                            {product.description}
                          </p>
                        ) : null}
                        {product.variants.length ? (
                          <select
                            value={variantChoices[product._id] ?? ""}
                            onChange={(event) =>
                              setVariantChoices((choices) => ({
                                ...choices,
                                [product._id]: event.target.value,
                              }))
                            }
                            className="mt-4 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d0b13] px-3 text-xs font-bold"
                          >
                            <option value="">Choose an option</option>
                            {product.variants.map((variant) => (
                              <option
                                key={variant._id}
                                value={variant._id}
                                disabled={!variant.available}
                              >
                                {variant.name} · {variant.available} left
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black uppercase ${available ? "text-emerald-400" : "text-red-300"}`}
                          >
                            {available ? `${available} available` : "Sold out"}
                          </span>
                          <button
                            type="button"
                            onClick={() => addProduct(product)}
                            disabled={!available}
                            className="min-h-10 rounded-xl bg-white px-4 text-xs font-black text-black disabled:opacity-30"
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] p-16 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-zinc-700" />
                <p className="mt-4 text-sm font-black">
                  No merch is currently on sale.
                </p>
              </div>
            )}
          </section>
          <aside className="h-fit rounded-[1.75rem] border border-white/[0.08] bg-white/[0.04] p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Your cart</h2>
              <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-[10px] font-black text-violet-300">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            {cart.length ? (
              <div className="mt-4 space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={`${item.merchId}:${item.variantId ?? "base"}`}
                    className="rounded-xl border border-white/[0.07] p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-xs font-black">{item.name}</p>
                        {item.variantName ? (
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {item.variantName}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-zinc-700" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, -1)}
                          className="rounded-lg border border-white/[0.08] p-1"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, 1)}
                          className="rounded-lg border border-white/[0.08] p-1"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs font-black">
                        {currency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-black uppercase text-zinc-600">
                    Fulfillment
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["pickup", "shipping"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        disabled={
                          method === "pickup"
                            ? !supportsPickup
                            : !supportsShipping
                        }
                        onClick={() => setFulfillment(method)}
                        className={`min-h-10 rounded-xl text-xs font-black capitalize disabled:cursor-not-allowed disabled:opacity-30 ${fulfillment === method ? "bg-violet-500 text-white" : "border border-white/[0.08] text-zinc-500"}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between border-t border-white/[0.08] pt-4 text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-black">{currency(total)}</span>
                </div>
                {fulfillment === "shipping" ? (
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Estimated shipping</span>
                    <span>{currency(estimatedShipping)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-black">
                  <span>Estimated total</span>
                  <span>{currency(total + estimatedShipping)}</span>
                </div>
                {error ? (
                  <p className="rounded-xl bg-red-400/10 p-3 text-xs text-red-300">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void checkout()}
                  disabled={
                    busy ||
                    (fulfillment === "pickup"
                      ? !supportsPickup
                      : !supportsShipping)
                  }
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 text-sm font-black disabled:opacity-40"
                >
                  {busy ? "Opening Stripe..." : "Secure checkout"}
                </button>
              </div>
            ) : (
              <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
                Add products to begin your order.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
