"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Variant = {
  name: string;
  sku: string;
  price: string;
  cost: string;
  inventory: string;
};

export default function CreateMerchDropPage() {
  const router = useRouter();
  const events = useQuery(api.events.getMyEvents, {});
  const createProduct = useMutation(api.merch.createProduct);
  const generateUploadUrl = useMutation(api.merch.generateUploadUrl);
  const [eventId, setEventId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [productType, setProductType] = useState("Apparel");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [inventory, setInventory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [fulfillment, setFulfillment] = useState<
    "pickup" | "shipping" | "hybrid"
  >("pickup");
  const [cutoff, setCutoff] = useState("");
  const [featured, setFeatured] = useState(false);
  const [limitedDrop, setLimitedDrop] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function addVariant() {
    setVariants((items) => [
      ...items,
      { name: "", sku: "", price, cost, inventory: "0" },
    ]);
  }
  function updateVariant(index: number, field: keyof Variant, value: string) {
    setVariants((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (
      !eventId ||
      !name.trim() ||
      !sku.trim() ||
      Number(price) < 0 ||
      !price
    ) {
      setError("Choose an event and enter a product name, SKU, and price.");
      return;
    }
    setSaving(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      if (image) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch("/api/merch/image-upload", {
          method: "POST",
          headers: {
            "Content-Type": image.type,
            "X-Convex-Upload-Url": uploadUrl,
          },
          body: image,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Image upload failed. Try again.");
        }
        imageStorageId = (await response.json()).storageId;
      }
      await createProduct({
        eventId: eventId as Id<"events">,
        name,
        description: description || undefined,
        sku,
        productType,
        price: Number(price),
        unitCost: cost ? Number(cost) : undefined,
        shippingFee: shippingFee ? Number(shippingFee) : undefined,
        inventory: Number(inventory || 0),
        status,
        fulfillmentMethod: fulfillment,
        preorderCutoffAt: cutoff ? new Date(cutoff).getTime() : undefined,
        featured,
        limitedDrop,
        imageStorageId,
        variants: variants.map((variant) => ({
          name: variant.name,
          sku: variant.sku,
          optionValues: variant.name.split("/").map((value) => value.trim()),
          price: Number(variant.price),
          unitCost: variant.cost ? Number(variant.cost) : undefined,
          inventory: Number(variant.inventory || 0),
        })),
      });
      router.push("/host/merch");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create product.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            Product studio
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Create merch product
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Build inventory, pricing, variants, and fulfillment rules.
          </p>
        </div>
        <Link
          href="/host/merch"
          className="text-xs font-black text-zinc-500 hover:text-white"
        >
          Cancel
        </Link>
      </div>
      <form
        onSubmit={submit}
        className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"
      >
        <div className="space-y-5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5">
          <Section title="Product details" />
          <Field label="Event">
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="input"
            >
              <option value="">Choose an event</option>
              {events?.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Function Hour Tour Hoodie"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-28"
              placeholder="Materials, fit, pickup details..."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base SKU">
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="input"
                placeholder="OC-HOODIE-01"
              />
            </Field>
            <Field label="Product type">
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="input"
              >
                <option>Apparel</option>
                <option>Accessory</option>
                <option>Poster</option>
                <option>Collectible</option>
                <option>Bundle</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Unit cost">
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Base inventory">
              <input
                type="number"
                min="0"
                step="1"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Product image">
            <label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] text-xs font-bold text-zinc-500 hover:border-violet-400/40">
              <Upload className="h-4 w-4" />
              {image?.name || "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        </div>
        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5">
            <Section title="Sales & fulfillment" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "draft" | "published")
                  }
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>
              <Field label="Fulfillment">
                <select
                  value={fulfillment}
                  onChange={(e) =>
                    setFulfillment(e.target.value as typeof fulfillment)
                  }
                  className="input"
                >
                  <option value="pickup">Event pickup</option>
                  <option value="shipping">Ship to customer</option>
                  <option value="hybrid">Pickup + shipping</option>
                </select>
              </Field>
            </div>
            <Field label="Flat shipping fee">
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </Field>
            <Field label="Preorder cutoff">
              <input
                type="datetime-local"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
                className="input"
              />
            </Field>
            <div className="mt-4 flex flex-wrap gap-4">
              <Check
                label="Featured product"
                checked={featured}
                onChange={setFeatured}
              />
              <Check
                label="Limited drop"
                checked={limitedDrop}
                onChange={setLimitedDrop}
              />
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="flex items-center justify-between">
              <Section title="Variants" />
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1 text-xs font-black text-violet-300"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="mt-4 text-xs leading-5 text-zinc-600">
                Optional. Add sizes, colors, or bundle choices with their own
                SKU and inventory.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/[0.07] p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={variant.name}
                        onChange={(e) =>
                          updateVariant(index, "name", e.target.value)
                        }
                        className="input"
                        placeholder="Black / Large"
                      />
                      <input
                        value={variant.sku}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "sku",
                            e.target.value.toUpperCase(),
                          )
                        }
                        className="input"
                        placeholder="SKU"
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariant(index, "price", e.target.value)
                        }
                        className="input"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        value={variant.inventory}
                        onChange={(e) =>
                          updateVariant(index, "inventory", e.target.value)
                        }
                        className="input"
                        placeholder="Inventory"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setVariants((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-300"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error ? (
            <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
              {error}
            </p>
          ) : null}
          <button
            disabled={saving}
            className="min-h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 text-sm font-black disabled:opacity-40"
          >
            {saving ? "Saving product..." : "Save product"}
          </button>
        </div>
      </form>
      <style jsx>{`
        .input {
          min-height: 44px;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #0c0a11;
          padding: 0.75rem;
          color: white;
          outline: none;
        }
        .input:focus {
          border-color: rgba(167, 139, 250, 0.5);
        }
      `}</style>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <h3 className="text-sm font-black">{title}</h3>;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-zinc-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-violet-500"
      />
      {label}
    </label>
  );
}
