"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEventCommandCenter } from "@/components/host/events/command-center/EventCommandCenter";

export default function HostEventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id as Id<"events">;
  const { event } = useEventCommandCenter();

  const ticketTypes = useQuery(api.ticketTypes.getByEvent, { eventId });
  const addOns = useQuery(api.ticketAddOns.getByEvent, { eventId });

  const createTicketType = useMutation(api.ticketTypes.create);
  const updateTicketType = useMutation(api.ticketTypes.update);
  const removeTicketType = useMutation(api.ticketTypes.remove);
  const toggleTicketSoldOut = useMutation(api.ticketTypes.toggleSoldOut);
  const toggleTicketSalesPaused = useMutation(api.ticketTypes.toggleSalesPaused);

  const createAddOn = useMutation(api.ticketAddOns.create);
  const removeAddOn = useMutation(api.ticketAddOns.remove);
  const toggleAddOnSoldOut = useMutation(api.ticketAddOns.toggleSoldOut);

  const [ticketName, setTicketName] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState("");
  const [ticketPerks, setTicketPerks] = useState("");
  const [ticketPrices, setTicketPrices] = useState<Record<string, string>>({});
  const [savingPriceFor, setSavingPriceFor] = useState<string | null>(null);

  const [addOnName, setAddOnName] = useState("");
  const [addOnDescription, setAddOnDescription] = useState("");
  const [addOnPrice, setAddOnPrice] = useState("");
  const [addOnQuantity, setAddOnQuantity] = useState("");
  const [addOnRequired, setAddOnRequired] = useState(false);

  const [message, setMessage] = useState("");

  async function handleCreateTicketType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!ticketName.trim() || !ticketPrice.trim()) {
      setMessage("Ticket name and price are required.");
      return;
    }

    await createTicketType({
      eventId,
      name: ticketName.trim(),
      description: ticketDescription.trim(),
      price: Number(ticketPrice),
      quantity: ticketQuantity ? Number(ticketQuantity) : undefined,
      perks: ticketPerks
        ? ticketPerks
            .split(",")
            .map((perk) => perk.trim())
            .filter(Boolean)
        : [],
    });

    setTicketName("");
    setTicketDescription("");
    setTicketPrice("");
    setTicketQuantity("");
    setTicketPerks("");
    setMessage("Ticket type added.");
  }

  async function handleCreateAddOn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!addOnName.trim() || !addOnPrice.trim()) {
      setMessage("Add-on name and price are required.");
      return;
    }

    await createAddOn({
      eventId,
      name: addOnName.trim(),
      description: addOnDescription.trim(),
      price: Number(addOnPrice),
      quantity: addOnQuantity ? Number(addOnQuantity) : undefined,
      isRequired: addOnRequired,
    });

    setAddOnName("");
    setAddOnDescription("");
    setAddOnPrice("");
    setAddOnQuantity("");
    setAddOnRequired(false);
    setMessage("Add-on added.");
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            Ticket operations
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Tickets, VIP & Add-ons
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Configure paid ticket tiers, VIP packages, sections, parking, merch
            bundles, and event extras for {event.name}.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
            {message}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={handleCreateTicketType}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 className="text-2xl font-black">Create Ticket Type</h2>
            <p className="mt-2 text-sm text-white/50">
              Use this for General Admission, VIP, Early Entry, sections, or
              premium packages.
            </p>

            <div className="mt-6 space-y-4">
              <input
                value={ticketName}
                onChange={(e) => setTicketName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-white/40"
                placeholder="Ex: VIP Section"
              />

              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-white/40"
                placeholder="Describe what this ticket includes..."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-white/40"
                  placeholder="Price"
                />

                <input
                  type="number"
                  min="1"
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-white/40"
                  placeholder="Quantity"
                />
              </div>

              <input
                value={ticketPerks}
                onChange={(e) => setTicketPerks(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-white/40"
                placeholder="Perks separated by commas"
              />

              <button className="w-full rounded-2xl bg-white px-5 py-4 font-black text-black hover:bg-zinc-200">
                Add Ticket Type
              </button>
            </div>
          </form>

          <form
            onSubmit={handleCreateAddOn}
            className="rounded-[2rem] border border-orange-500/20 bg-orange-500/5 p-6"
          >
            <h2 className="text-2xl font-black">Create Add-on</h2>
            <p className="mt-2 text-sm text-white/50">
              Use this for parking, merch bundles, bottle service, table
              reservations, or extras.
            </p>

            <div className="mt-6 space-y-4">
              <input
                value={addOnName}
                onChange={(e) => setAddOnName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-orange-400/50"
                placeholder="Ex: Parking Pass"
              />

              <textarea
                value={addOnDescription}
                onChange={(e) => setAddOnDescription(e.target.value)}
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-orange-400/50"
                placeholder="Describe this add-on..."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addOnPrice}
                  onChange={(e) => setAddOnPrice(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-orange-400/50"
                  placeholder="Price"
                />

                <input
                  type="number"
                  min="1"
                  value={addOnQuantity}
                  onChange={(e) => setAddOnQuantity(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 outline-none focus:border-orange-400/50"
                  placeholder="Quantity"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={addOnRequired}
                  onChange={(e) => setAddOnRequired(e.target.checked)}
                />
                Required add-on
              </label>

              <button className="w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-black hover:bg-orange-400">
                Add Add-on
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">Ticket Types</h2>

            <div className="mt-5 space-y-4">
              {ticketTypes === undefined ? (
                <p className="text-white/50">Loading ticket types...</p>
              ) : ticketTypes.length === 0 ? (
                <p className="text-white/50">No ticket types yet.</p>
              ) : (
                ticketTypes.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="rounded-2xl border border-white/10 bg-black p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black">{ticket.name}</h3>
                        {ticket.description && (
                          <p className="mt-1 text-sm text-white/50">
                            {ticket.description}
                          </p>
                        )}
                        <p className="mt-3 text-sm text-white/60">
                          {ticket.sold ?? 0} sold
                          {ticket.quantity ? ` / ${ticket.quantity}` : ""}
                        </p>
                        <div className="mt-4 flex flex-wrap items-end gap-2">
                          <label className="text-xs font-semibold text-white/60">
                            Ticket price ($)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ticketPrices[ticket._id] ?? String(ticket.price)}
                              onChange={(event) =>
                                setTicketPrices((prices) => ({
                                  ...prices,
                                  [ticket._id]: event.target.value,
                                }))
                              }
                              className="mt-1 block w-32 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={savingPriceFor === ticket._id}
                            onClick={async () => {
                              const value = ticketPrices[ticket._id] ?? String(ticket.price);
                              const nextPrice = Number(value);
                              if (!value.trim() || !Number.isFinite(nextPrice) || nextPrice < 0) {
                                setMessage("Enter a valid ticket price of $0 or more.");
                                return;
                              }
                              setSavingPriceFor(ticket._id);
                              setMessage("");
                              try {
                                await updateTicketType({
                                  ticketTypeId: ticket._id,
                                  price: nextPrice,
                                });
                                setTicketPrices((prices) => ({ ...prices, [ticket._id]: String(nextPrice) }));
                                setMessage(`${ticket.name} price updated to $${nextPrice.toFixed(2)}. New checkouts will use this price.`);
                              } catch (error) {
                                setMessage(error instanceof Error ? error.message : "Unable to update ticket price.");
                              } finally {
                                setSavingPriceFor(null);
                              }
                            }}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
                          >
                            {savingPriceFor === ticket._id ? "Saving…" : "Save price"}
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {ticket.isSoldOut && (
                            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                              Sold Out
                            </span>
                          )}

                          {ticket.salesPaused && (
                            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                              Sales Paused
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() =>
                            toggleTicketSoldOut({ ticketTypeId: ticket._id })
                          }
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
                        >
                          {ticket.isSoldOut ? "Mark Available" : "Mark Sold Out"}
                        </button>

                        <button
                          onClick={() =>
                            toggleTicketSalesPaused({ ticketTypeId: ticket._id })
                          }
                          className="rounded-full border border-yellow-400/30 px-3 py-1 text-xs text-yellow-200 hover:bg-yellow-400/10"
                        >
                          {ticket.salesPaused ? "Resume Sales" : "Pause Sales"}
                        </button>

                        <button
                          onClick={() =>
                            removeTicketType({ ticketTypeId: ticket._id })
                          }
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {ticket.perks && ticket.perks.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {ticket.perks.map((perk) => (
                          <span
                            key={perk}
                            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black"
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">Add-ons</h2>

            <div className="mt-5 space-y-4">
              {addOns === undefined ? (
                <p className="text-white/50">Loading add-ons...</p>
              ) : addOns.length === 0 ? (
                <p className="text-white/50">No add-ons yet.</p>
              ) : (
                addOns.map((addOn) => (
                  <div
                    key={addOn._id}
                    className="rounded-2xl border border-white/10 bg-black p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black">{addOn.name}</h3>
                        {addOn.description && (
                          <p className="mt-1 text-sm text-white/50">
                            {addOn.description}
                          </p>
                        )}
                        <p className="mt-3 text-sm text-white/60">
                          ${addOn.price}
                          {addOn.quantity ? ` · ${addOn.quantity} available` : ""}
                        </p>

                        {addOn.isSoldOut && (
                          <span className="mt-3 inline-flex rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                            Sold Out
                          </span>
                        )}
                        {addOn.isRequired && (
                          <p className="mt-2 text-xs font-bold text-orange-300">
                            Required add-on
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() =>
                            toggleAddOnSoldOut({ addOnId: addOn._id })
                          }
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
                        >
                          {addOn.isSoldOut ? "Mark Available" : "Mark Sold Out"}
                        </button>

                        <button
                          onClick={() =>
                            removeAddOn({ addOnId: addOn._id })
                          }
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
