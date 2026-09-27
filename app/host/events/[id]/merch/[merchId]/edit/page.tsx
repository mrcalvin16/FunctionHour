"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditMerchPage({
  params,
}: {
  params: Promise<{ id: string; merchId: string }>;
}) {
  const { id, merchId } = use(params);
  const eventId = id as Id<"events">;
  const merchItemId = merchId as Id<"merch">;
  const router = useRouter();

  const event = useQuery(api.events.getById, { eventId });
  const merch = useQuery(api.merch.getProductEditor, { merchId: merchItemId });

  const updateMerch = useMutation(api.merch.updateProduct);
  const generateUploadUrl = useMutation(api.merch.generateUploadUrl);
  const deleteMerch = useMutation(api.merch.deleteMerch);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventory, setInventory] = useState("");
  const [sku, setSku] = useState("");
  const [productType, setProductType] = useState("Apparel");
  const [unitCost, setUnitCost] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    "draft",
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "pickup" | "shipping" | "hybrid"
  >("pickup");
  const [cutoff, setCutoff] = useState("");
  const [featured, setFeatured] = useState(false);
  const [limitedDrop, setLimitedDrop] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [variants, setVariants] = useState<
    Array<{
      variantId?: Id<"merchVariants">;
      name: string;
      sku: string;
      price: string;
      unitCost: string;
      inventory: string;
      printfulVariantId: string;
      isActive: boolean;
    }>
  >([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (!merch) return;

    setName(merch.name ?? "");
    setDescription(merch.description ?? "");
    setPrice(String(merch.price ?? 0));
    setInventory(String(merch.inventory ?? 0));
    // Early merchandise records predate SKUs. Give them a stable editable default.
    setSku(merch.sku || `MERCH-${String(merch._id).slice(-12)}`.toUpperCase());
    setProductType(merch.productType ?? "Apparel");
    setUnitCost(merch.unitCost === undefined ? "" : String(merch.unitCost));
    setShippingFee(
      merch.shippingFee === undefined ? "" : String(merch.shippingFee),
    );
    setStatus(merch.status ?? (merch.isActive ? "published" : "draft"));
    setFulfillmentMethod(
      merch.fulfillmentMethod === "printful"
        ? "shipping"
        : (merch.fulfillmentMethod ?? "pickup"),
    );
    setCutoff(
      merch.preorderCutoffAt
        ? new Date(merch.preorderCutoffAt).toISOString().slice(0, 16)
        : "",
    );
    setFeatured(merch.featured ?? false);
    setLimitedDrop(merch.limitedDrop ?? false);
    setVariants(
      merch.variants.map((variant) => ({
        variantId: variant._id,
        name: variant.name,
        sku: variant.sku,
        price: String(variant.price),
        unitCost:
          variant.unitCost === undefined ? "" : String(variant.unitCost),
        inventory: String(variant.inventory),
        printfulVariantId:
          variant.printfulVariantId === undefined
            ? ""
            : String(variant.printfulVariantId),
        isActive: variant.isActive,
      })),
    );
  }, [merch]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Merch name is required.");
      return;
    }

    if (Number(price) < 0 || Number.isNaN(Number(price))) {
      setError("Price must be 0 or greater.");
      return;
    }

    if (Number(inventory) < 0 || Number.isNaN(Number(inventory))) {
      setError("Inventory must be 0 or greater.");
      return;
    }
    if (!sku.trim()) {
      setError("A SKU is required. Enter one before saving.");
      return;
    }
    if (variants.some((variant) =>
      !variant.name.trim() || !variant.sku.trim() ||
      !Number.isFinite(Number(variant.price)) || variant.price.trim() === "" || Number(variant.price) < 0 ||
      !Number.isFinite(Number(variant.inventory)) || variant.inventory.trim() === "" || Number(variant.inventory) < 0
    )) {
      setError("Each size or variant needs a name, SKU, price, and valid inventory.");
      return;
    }

    try {
      setSaving(true);
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

      await updateMerch({
        merchId: merchItemId,
        imageStorageId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        inventory: Number(inventory),
        sku,
        productType,
        unitCost: unitCost ? Number(unitCost) : undefined,
        shippingFee: shippingFee ? Number(shippingFee) : undefined,
        status,
        fulfillmentMethod,
        preorderCutoffAt: cutoff ? new Date(cutoff).getTime() : undefined,
        featured,
        limitedDrop,
        variants: variants.map((variant) => ({
          ...variant,
          price: Number(variant.price),
          unitCost: variant.unitCost ? Number(variant.unitCost) : undefined,
          inventory: Number(variant.inventory),
          printfulVariantId: variant.printfulVariantId
            ? Number(variant.printfulVariantId)
            : undefined,
        })),
      });

      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      setError(
        err && typeof err === "object" && "data" in err && typeof err.data === "string"
          ? err.data
          : err instanceof Error ? err.message : "Unable to update merch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this merch item? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteMerch({ merchId: merchItemId });
      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to delete merch.");
    } finally {
      setDeleting(false);
    }
  }

  if (event === undefined || merch === undefined) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Loading merch...
      </main>
    );
  }

  if (!event || !merch) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        Merch item not found.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/events/${eventId}`}
          className="text-sm text-white/50 hover:text-white"
        >
          ← Back to event
        </Link>

        <div className="mt-6 mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-400">
            Host Merch Controls
          </p>
          <h1 className="mt-3 text-4xl font-black">Edit Merch</h1>
          <p className="mt-2 text-white/60">
            Update the image, pricing, inventory, sizes, and availability.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
        >
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-white/70">
              Merch Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label htmlFor="merch-image" className="text-sm font-semibold text-white/70">
              Product image
            </label>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] sm:w-36">
                {imagePreview || merch.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview || merch.imageUrl || ""} alt={`${name || "Product"} preview`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-white/60">No image yet</span>
                )}
              </div>
              <div className="min-w-0">
                <input
                  id="merch-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
                        setImage(null);
                        setError("Choose a JPG, PNG, or WebP image under 10 MB.");
                      } else {
                        setError("");
                        setImage(file);
                      }
                    }
                    event.target.value = "";
                  }}
                  className="block w-full max-w-full text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-bold file:text-black"
                />
                <p className="mt-2 text-sm text-white/60">
                  {image ? `${image.name} will replace the image when you save.` : merch.imageUrl ? "Choose a new image to replace the current one." : "Add the image you missed when creating this item."}
                </p>
                {image && (
                  <button type="button" onClick={() => setImage(null)} className="mt-2 text-sm font-bold text-violet-200 underline underline-offset-4">
                    {merch.imageUrl ? "Keep current image" : "Remove selected image"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-white/70">
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Inventory
              </label>
              <input
                type="number"
                min="0"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-white/70">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/70">
                Unit cost
              </label>
              <input
                type="number"
                min="0"
                step=".01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/70">
                Shipping fee
              </label>
              <input
                type="number"
                min="0"
                step=".01"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/70">
                Type
              </label>
              <input
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={fulfillmentMethod}
              onChange={(e) =>
                setFulfillmentMethod(e.target.value as typeof fulfillmentMethod)
              }
              className="rounded-2xl border border-white/10 bg-black px-4 py-3"
            >
              <option value="pickup">Pickup</option>
              <option value="shipping">Shipping</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <input
              type="datetime-local"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3"
            />
          </div>
          <div className="flex gap-5">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />{" "}
              Featured
            </label>
            <label className="text-sm">
              <input
                type="checkbox"
                checked={limitedDrop}
                onChange={(e) => setLimitedDrop(e.target.checked)}
              />{" "}
              Limited drop
            </label>
          </div>
          <div>
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-white/70">
                Variants
              </label>
              <button
                type="button"
                onClick={() =>
                  setVariants((items) => [
                    ...items,
                    {
                      name: "",
                      sku: "",
                      price,
                      unitCost,
                      inventory: "0",
                      printfulVariantId: "",
                      isActive: true,
                    },
                  ])
                }
                className="text-xs font-black text-violet-300"
              >
                + Add variant
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant.variantId ?? index}
                  className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-4"
                >
                  <input
                    value={variant.name}
                    onChange={(e) =>
                      setVariants((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, name: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Name"
                    className="rounded-lg bg-black p-2 text-sm"
                  />
                  <input
                    value={variant.sku}
                    onChange={(e) =>
                      setVariants((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, sku: e.target.value.toUpperCase() }
                            : item,
                        ),
                      )
                    }
                    placeholder="SKU"
                    className="rounded-lg bg-black p-2 text-sm"
                  />
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) =>
                      setVariants((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, price: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Price"
                    className="rounded-lg bg-black p-2 text-sm"
                  />
                  <input
                    type="number"
                    value={variant.inventory}
                    onChange={(e) =>
                      setVariants((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, inventory: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Inventory"
                    className="rounded-lg bg-black p-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 rounded-2xl bg-white px-5 py-4 font-black text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-2xl border border-red-500/30 px-5 py-4 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
