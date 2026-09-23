"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toPng } from "html-to-image";

const presets = [
  "Luxury",
  "Underground",
  "Festival",
  "Rooftop",
  "EDM",
  "Afrobeats",
  "College",
];

const lightingOptions = [
  "Neon Violet",
  "Warm Gold",
  "Dark Luxe",
  "Sunset Rooftop",
  "Cyberpunk",
];

const energyOptions = [
  "Lowkey Lounge",
  "High Energy",
  "Festival Chaos",
  "VIP Exclusive",
];

const visualStyles = [
  "Editorial",
  "Luxury Fashion",
  "Resident Advisor",
  "Apple Music",
  "Futuristic Rave",
];

const promptStarters = [
  "Luxury rooftop party with violet lighting, champagne, skyline views, and a stylish crowd",
  "Underground warehouse rave with cinematic fog, lasers, and high-fashion nightlife energy",
  "Afrobeats night with warm lighting, dancing crowd, luxury lounge atmosphere, and cultural energy",
  "Festival-style concert poster with bold crowd energy, premium music branding, and cinematic lighting",
];

const flyerTemplates = [
  {
    label: "Luxury Nightlife",
    prompt:
      "luxury nightlife party with stylish crowd, premium venue, event image inspiration, velvet rope energy",
    eventType: "nightlife",
    composition: "cinematic",
    tags: ["Luxury", "Moody", "Cinematic"],
  },
  {
    label: "Afrobeats Party",
    prompt:
      "Afrobeats party with vibrant dance energy, stylish guests, premium cultural nightlife",
    eventType: "nightlife",
    composition: "hero",
    tags: ["Luxury", "Festival", "Viral"],
  },
  {
    label: "Rooftop Social",
    prompt:
      "rooftop social event with skyline views, champagne atmosphere, elevated lifestyle",
    eventType: "brunch",
    composition: "editorial",
    tags: ["Elegant", "Minimal", "Luxury"],
  },
  {
    label: "Music Festival",
    prompt:
      "outdoor music festival with stage lights, crowd energy, confetti, live performance",
    eventType: "festival",
    composition: "chaotic",
    tags: ["Festival", "Cinematic", "Viral"],
  },
];

const eventTypes = [
  { id: "nightlife", label: "Nightlife" },
  { id: "festival", label: "Festival" },
  { id: "concert", label: "Concert" },
  { id: "conference", label: "Conference" },
  { id: "brunch", label: "Brunch" },
  { id: "wellness", label: "Wellness" },
  { id: "sports", label: "Sports" },
];

const compositionModes = [
  { id: "hero", label: "Hero" },
  { id: "editorial", label: "Editorial" },
  { id: "collage", label: "Collage" },
  { id: "minimalist", label: "Minimal" },
  { id: "cinematic", label: "Cinematic" },
  { id: "chaotic", label: "Chaotic" },
];

const directionTags = [
  "Moody",
  "Luxury",
  "Viral",
  "Minimal",
  "Cinematic",
  "Dark",
  "Futuristic",
  "Festival",
  "Elegant",
  "Streetwear",
];

export default function FlyerStudioPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const events = useQuery(
    api.events.getMyEvents,
    isLoaded && isSignedIn ? {} : "skip",
  ) as any[] | undefined;

  const saveCreative = useMutation(api.eventCreative.saveCreative);
  const updateCreative = useMutation(api.eventCreative.updateCreative);
  const deleteCreative = useMutation(api.eventCreative.remove);
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Luxury");
  const [imageName, setImageName] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [variations, setVariations] = useState<
    { id: string; imageUrl: string; caption?: string }[]
  >([]);
  const [creativeTags, setCreativeTags] = useState<string[]>([]);
  const [socialCaption, setSocialCaption] = useState("");
  const [captionVariants, setCaptionVariants] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState("");
  const [quality, setQuality] = useState<"fast" | "premium">("premium");
  const [composition, setComposition] = useState("hero");
  const [eventType, setEventType] = useState("nightlife");
  const [city, setCity] = useState("New Orleans");
  const [audience, setAudience] = useState("stylish event-goers");
  const [promptStrength, setPromptStrength] = useState("balanced");
  const [format, setFormat] = useState("poster");
  const [cta, setCta] = useState("Get Tickets");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [creativePackName, setCreativePackName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sourceEventImage, setSourceEventImage] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedCreativeId, setSelectedCreativeId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmGeneration, setConfirmGeneration] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");

  const [lightingMood, setLightingMood] = useState("Neon Violet");
  const [energyLevel, setEnergyLevel] = useState("High Energy");
  const [visualStyle, setVisualStyle] = useState("Editorial");

  const flyerRef = useRef<HTMLDivElement | null>(null);

  const linkedEvent = useQuery(
    api.events.getById,
    selectedEventId
      ? {
          eventId: selectedEventId as Id<"events">,
        }
      : "skip",
  );
  const selectedEvent =
    events?.find(
      (event) => event._id === selectedEventId,
    ) ?? linkedEvent;

  const savedCreative = useQuery(
    api.eventCreative.listByEvent,
    isLoaded && isSignedIn && selectedEvent
      ? { eventId: selectedEvent._id }
      : "skip",
  ) as any[] | undefined;

  const totalDrafts = savedCreative?.length || 0;

  useEffect(() => {
    const linkedEventId = new URLSearchParams(
      window.location.search,
    ).get("eventId");

    if (linkedEventId) {
      setSelectedEventId((current) =>
        current || linkedEventId,
      );
    }
  }, []);

  const mostUsedStyle =
    savedCreative?.reduce((acc: Record<string, number>, item: any) => {
      const key = item.style || "Luxury";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}) || {};

  const topStyle =
    Object.entries(mostUsedStyle).sort(
      (a: any, b: any) => b[1] - a[1],
    )[0]?.[0] || "Luxury";

  useEffect(() => {
    if (!savedCreative?.length) return;
    if (selectedCreativeId) return;
    if (prompt || imagePreview) return;

    const latest = savedCreative[0];

    if (!latest) {
      const cachedPrompt = localStorage.getItem(
        `functionhour-flyer-prompt-${selectedEventId}`,
      );

      if (cachedPrompt) {
        setPrompt(cachedPrompt);
      }

      return;
    }

    setSelectedCreativeId(latest._id);
    setPrompt(latest.prompt || "");
    setStyle(latest.style || "Luxury");
    setImagePreview(latest.imageUrl || "");
    setImageName(latest.title || "Saved flyer");
  }, [
    savedCreative,
    selectedCreativeId,
    prompt,
    imagePreview,
    selectedEventId,
  ]);

  useEffect(() => {
    if (!selectedEventId) return;

    localStorage.setItem(
      `functionhour-flyer-prompt-${selectedEventId}`,
      prompt,
    );
  }, [
    savedCreative,
    selectedCreativeId,
    prompt,
    imagePreview,
    selectedEventId,
  ]);

  const caption = useMemo(() => {
    const eventName = selectedEvent?.name || "Function Hour Event";
    const vibe = prompt || eventName;

    return `${vibe}

Curated for the city. Built for the crowd.

RSVP now on Function Hour.`;
  }, [prompt, selectedEvent]);

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  async function downloadFlyer() {
    if (!flyerRef.current) return;

    const dataUrl = await toPng(flyerRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#000000",
    });

    const link = document.createElement("a");
    link.download = `${selectedEvent?.name || "functionhour-flyer"}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function saveCurrentDraft() {
    if (!selectedEvent?._id || !imagePreview) return;

    try {
      setIsGenerating(true);

      const blob = await fetch(imagePreview).then((r) => r.blob());
      const uploadUrl = await generateUploadUrl();

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      const { storageId } = await uploadResult.json();

      if (selectedCreativeId) {
        await updateCreative({
          id: selectedCreativeId as any,
          eventId: selectedEvent._id,
          title: `${selectedEvent.name} Flyer`,
          prompt,
          style,
          caption,
          imageStorageId: storageId,
          imageUrl: imagePreview,
        } as any);
      } else {
        await saveCreative({
          eventId: selectedEvent._id,
          title: `${selectedEvent.name} Flyer`,
          sourceEventId: selectedEvent._id,
          prompt,
          style,
          caption,
          imageStorageId: storageId,
          imageUrl: imagePreview,
        } as any);
      }

      setSavedMessage("Creative saved to library.");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch (error) {
      console.error(error);
      setSavedMessage("Could not save creative.");
    } finally {
      setIsGenerating(false);
    }
  }

  function surpriseCreativeDirection() {
    const random = <T,>(items: T[]) =>
      items[Math.floor(Math.random() * items.length)];

    setStyle(random(presets));
    setLightingMood(random(lightingOptions));
    setEnergyLevel(random(energyOptions));
    setVisualStyle(random(visualStyles));

    if (!prompt.trim()) {
      setPrompt(random(promptStarters));
    }
  }

  function buildSmartPrompt() {
    const base = prompt?.trim();

    const smart = `
Event: ${selectedEvent?.name || ""}
Venue: ${selectedEvent?.venue || ""}
City: ${selectedEvent?.city || ""}

Style: ${style}
Lighting: ${lightingMood}
Energy: ${energyLevel}
Visual Direction: ${visualStyle}
`;

    return `${base}

--- AI CREATIVE DIRECTION ---
${smart}

Create a premium nightlife event flyer with cinematic composition, luxury typography, and editorial design quality.`;
  }

  async function handleGenerateFlyer() {
    if (!prompt.trim()) {
      alert("Add a flyer prompt first.");
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationStatus("Generating your flyer...");

      const response = await fetch("/api/ai/generate-flyer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: buildSmartPrompt(),
          style,
          quality,
          composition,
          eventType,
          format,
          city: selectedEvent?.city || city,
          audience,
          eventTitle: selectedEvent?.name,
          eventDate,
          venue: selectedEvent?.venue || venue,
          sourceEventImage,
          cta,
          lightingMood,
          energyLevel,
          visualStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Flyer generation failed.");
      }

      const imageUrl =
        data.imageUrl ||
        (data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : "");

      if (!imageUrl) {
        throw new Error("The image provider returned no image.");
      }

      setSavedMessage("");
      setImagePreview(imageUrl);
      setVariations(data.variations || []);
      setSocialCaption(data.caption || "");
      setCaptionVariants(data.captionVariants || []);
      setHashtags(data.hashtags || []);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setImageName("AI-generated flyer");

      // Convert base64 → blob
      setGenerationStatus("Preparing your flyer for storage...");

      const generatedImageResponse = await fetch(imageUrl);

      if (!generatedImageResponse.ok) {
        throw new Error(
          `Generated image download failed: ${generatedImageResponse.status}`,
        );
      }

      const blob = await generatedImageResponse.blob();

      if (!blob.type.startsWith("image/")) {
        throw new Error(`Expected an image but received ${blob.type}`);
      }

      // Get Convex upload URL
      const uploadUrl = await generateUploadUrl();

      setGenerationStatus("Uploading to your creative library...");

      // Upload to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type,
        },
        body: blob,
      });

      const { storageId } = await uploadResult.json();

      // Get permanent Convex file URL.
      // Keep the working AI image URL as a fallback if this route fails.
      let savedImageUrl = imageUrl;

      try {
        const convexUrlResponse = await fetch(
          `/api/convex-image-url?storageId=${encodeURIComponent(storageId)}`,
        );

        if (convexUrlResponse.ok) {
          const convexImageUrl = (await convexUrlResponse.text()).trim();

          if (
            convexImageUrl.startsWith("http://") ||
            convexImageUrl.startsWith("https://")
          ) {
            savedImageUrl = convexImageUrl;
          } else {
            console.warn("Invalid Convex image URL:", convexImageUrl);
          }
        } else {
          console.warn(
            "Convex image URL request failed:",
            convexUrlResponse.status,
          );
        }
      } catch (convexUrlError) {
        console.warn(
          "Could not resolve permanent Convex image URL:",
          convexUrlError,
        );
      }

      // Never replace a working AI image with an invalid Convex response.
      setImagePreview(savedImageUrl);

      // Auto-save generated creative
      if (selectedEvent?._id) {
        await saveCreative({
          eventId: selectedEvent._id,
          sourceEventId: selectedEvent._id,
          title:
            creativePackName ||
            `${selectedEvent.name || eventType} ${format} flyer`,
          prompt,
          style,
          caption: data.caption || caption,
          imageUrl: savedImageUrl,
          imageStorageId: storageId,
        } as any);

        setGenerationStatus("Flyer generated and saved to Creative Library.");
      } else {
        setGenerationStatus("Flyer generated. Select an event to save it.");
      }
    } catch (error) {
      console.error("Flyer generation failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the flyer.";

      setGenerationStatus("");
      alert(message);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStatus(""), 3500);
    }
  }

  async function handleSaveToEvent() {
    if (!selectedEvent) {
      alert("Select an event first.");
      return;
    }

    const existingCreative =
      savedCreative?.find((creative) => creative._id === selectedCreativeId) ||
      savedCreative?.[0];

    if (existingCreative) {
      await updateCreative({
        id: existingCreative._id,
        title: `${selectedEvent.name || "Event"} Flyer`,
        prompt,
        style,
        caption,
        imageUrl: imagePreview,
      });

      alert(`Creative updated for ${selectedEvent.name}.`);
      return;
    }

    await saveCreative({
      eventId: selectedEvent._id,
      title: `${selectedEvent.name || "Event"} Flyer`,
      prompt,
      style,
      caption,
      imageUrl: imagePreview,
    });

    alert(`Creative saved to ${selectedEvent.name}.`);
  }

  function loadSavedCreative(creative: any) {
    setSelectedCreativeId(creative._id);
    setPrompt(creative.prompt || "");
    setStyle(creative.style || "Luxury");
    alert("Saved creative loaded into Flyer Studio.");
  }

  function startNewDraft() {
    setSelectedCreativeId("");
    setPrompt("");
    setStyle("Luxury");
    setImageName("");
    setImagePreview("");
  }

  return (
    <main className="safe-x min-h-screen overflow-hidden bg-black text-white">
      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute left-[-120px] top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-[-120px] top-40 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300/70">
              Host Command Center
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              Flyer Studio
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Design event artwork, shape your message, and export social-ready creative.
              AI image generation is optional.
            </p>

            <div className="mt-5 max-w-3xl rounded-3xl border border-emerald-300/20 bg-emerald-500/[0.07] p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Design without generating
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Upload and preview artwork, adjust your creative direction, and use the export tools without generating an AI image. Generating an image may use credits; the Generate button will ask you to confirm first.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="oc-card p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Create a flyer</h2>

                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                    {selectedCreativeId
                      ? "Editing Saved Draft"
                      : "New Creative Draft"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href="/host/creative-library"
                    className="rounded-full border border-orange-300/20 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 hover:bg-orange-500/20"
                  >
                    View Library
                  </Link>

                  <button
                    type="button"
                    onClick={startNewDraft}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white hover:bg-white/[0.08]"
                  >
                    New Draft
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-bold text-white/70">
                    Save to event
                  </label>

                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white outline-none focus:border-violet-400/40"
                  >
                    <option value="">Select an event</option>
                    {selectedEvent &&
                    !(events ?? []).some(
                      (event) =>
                        event._id === selectedEvent._id,
                    ) ? (
                      <option value={selectedEvent._id}>
                        {selectedEvent.name || "Untitled Event"}
                      </option>
                    ) : null}
                    {(events ?? []).map((event) => (
                      <option key={event._id} value={event._id}>
                        {event.name || "Untitled Event"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-white/70">
                    Flyer prompt
                  </label>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: A luxury rooftop party in New Orleans with violet lighting, champagne, DJs, and a stylish crowd..."
                    className="mt-2 min-h-36 w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {promptStarters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setPrompt(starter)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/50 transition hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-violet-100"
                      >
                        {starter.split(" ").slice(0, 4).join(" ")}...
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-white/70">Flyer style</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStyle(preset)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                          style === preset
                            ? "border-violet-300 bg-violet-500/20 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)]"
                            : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-white/70">
                    Inspiration image
                  </p>

                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition hover:border-violet-400/40 hover:bg-white/[0.05]">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Inspiration preview"
                        className="max-h-52 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <>
                        <span className="text-sm font-bold text-white">
                          Upload inspiration
                        </span>
                        <span className="mt-1 text-xs text-white/40">
                          PNG, JPG, or event moodboard
                        </span>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        setImageName(file.name);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>

                  {imageName && (
                    <p className="mt-2 text-xs text-violet-200">
                      Uploaded: {imageName}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={surpriseCreativeDirection}
                    className="rounded-3xl border border-orange-300/20 bg-orange-500/10 px-5 py-4 text-sm font-black text-orange-100 transition hover:bg-orange-500/20"
                  >
                    Surprise Me
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      setGenerationStatus("Prompt copied to clipboard.");
                    }}
                    className="rounded-3xl border border-violet-300/20 bg-violet-500/10 px-5 py-4 text-sm font-black text-violet-100 transition hover:bg-violet-500/20"
                  >
                    Copy Prompt
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Clear Prompt
                  </button>

                  <button
                    type="button"
                    onClick={saveCurrentDraft}
                    disabled={!imagePreview}
                    className="rounded-3xl border border-green-300/20 bg-green-500/10 px-5 py-4 text-sm font-black text-green-100 transition hover:bg-green-500/20 disabled:opacity-40"
                  >
                    Save Draft
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/35">
                    AI Direction
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {style} · {lightingMood} · {energyLevel} · {visualStyle}
                  </p>
                </div>

                <button
                  type="button"
                  className="oc-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setConfirmGeneration(true)}
                  disabled={isGenerating || !selectedEvent}
                  aria-haspopup="dialog"
                >
                  {isGenerating
                    ? "Generating variations..."
                    : imagePreview
                      ? "Regenerate Flyer"
                      : "Generate / Regenerate Variations"}
                </button>

                {!selectedEvent && (
                  <p className="rounded-3xl border border-orange-300/20 bg-orange-500/10 p-4 text-sm font-bold text-orange-100">
                    Select an event first so your generated flyer can be saved
                    automatically.
                  </p>
                )}

                {confirmGeneration && (
                  <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="flyer-generation-confirm-title"
                      className="w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl sm:p-8"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Before you generate</p>
                      <h2 id="flyer-generation-confirm-title" className="mt-3 text-2xl font-black">Generate AI artwork?</h2>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        Image generation may use credits. You can keep editing, upload your own artwork, or export without generating.
                      </p>
                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmGeneration(false)}
                          className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Keep editing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmGeneration(false);
                            void handleGenerateFlyer();
                          }}
                          className="rounded-full bg-orange-400 px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-orange-300"
                        >
                          Generate artwork
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {generationStatus && (
                  <div className="relative overflow-hidden rounded-3xl border border-violet-300/20 bg-violet-500/10 p-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />

                    <div className="relative flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-violet-300 animate-pulse" />

                      <p className="text-sm font-black text-violet-100">
                        {generationStatus}
                      </p>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="mt-6 overflow-hidden rounded-[2rem] border border-orange-400/15 bg-gradient-to-br from-orange-500/10 to-violet-500/10 p-6 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-orange-400" />
                      <p className="text-sm font-black text-orange-100">
                        Generating premium creative variations...
                      </p>
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-orange-400 to-violet-400" />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-black/35"
                        >
                          <div className="aspect-[2/3] animate-pulse bg-white/5" />
                          <div className="p-4">
                            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                            <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {savedMessage && (
                  <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/10 px-5 py-4 text-sm font-black text-green-200">
                    {savedMessage}
                  </div>
                )}

                {(socialCaption || hashtags.length > 0) && (
                  <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300/70">
                        Social Copy
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPrompt("");
                            setImagePreview("");
                            setVariations([]);
                            setSocialCaption("");
                            setCaptionVariants([]);
                            setHashtags([]);
                            setCreativeTags([]);
                            setSavedMessage("");
                            setCreativePackName("");
                          }}
                          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black text-white/70 hover:bg-white/10"
                        >
                          Clear Studio
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${socialCaption}\n\n${hashtags.join(" ")}`,
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1400);
                          }}
                          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black text-white/70 hover:bg-white/10"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!imagePreview) return;

                            const response = await fetch(imagePreview);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);

                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `functionhour-${format}-flyer.png`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();

                            URL.revokeObjectURL(url);
                          }}
                          className="rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 hover:bg-orange-500/20"
                        >
                          Download Flyer
                        </button>
                      </div>
                    </div>

                    {socialCaption && (
                      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/45 p-5 shadow-xl backdrop-blur-xl">
                        <p className="text-sm leading-6 text-white/75">
                          {socialCaption}
                        </p>
                      </div>
                    )}

                    {captionVariants.length > 1 && (
                      <div className="mt-4 grid gap-3">
                        {captionVariants.map((caption, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSocialCaption(caption)}
                            className={`rounded-2xl border p-4 text-left text-sm leading-6 transition ${
                              socialCaption === caption
                                ? "border-orange-300 bg-orange-500/10 text-orange-50"
                                : "border-white/10 bg-black/35 text-white/60 hover:bg-white/10"
                            }`}
                          >
                            {caption}
                          </button>
                        ))}
                      </div>
                    )}

                    {hashtags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {variations.length > 1 && (
                  <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300/70">
                      AI Variations
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      {variations.map((variation, index) => (
                        <button
                          key={variation.id || index}
                          type="button"
                          onClick={() => {
                            setImagePreview(variation.imageUrl);
                            setSavedMessage("");
                          }}
                          className={`overflow-hidden rounded-2xl border text-left transition hover:scale-[1.02] ${
                            imagePreview === variation.imageUrl
                              ? "border-orange-300 bg-orange-500/10"
                              : "border-white/10 bg-black/40"
                          }`}
                        >
                          <img
                            src={variation.imageUrl}
                            alt={
                              variation.caption ||
                              `Flyer variation ${index + 1}`
                            }
                            className="h-44 w-full object-cover"
                          />

                          <div className="p-3">
                            <p className="text-sm font-black text-white">
                              Variation {index + 1}
                            </p>
                            <p className="mt-1 text-xs text-white/45">
                              Tap to use this version
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreview && (
                  <Link
                    href="/host/creative-library"
                    className="block rounded-3xl border border-orange-300/20 bg-orange-500/10 px-5 py-4 text-center text-sm font-black text-orange-100 transition hover:bg-orange-500/20"
                  >
                    Open Creative Library
                  </Link>
                )}

                <button
                  type="button"
                  className="oc-button-secondary w-full"
                  onClick={handleSaveToEvent}
                >
                  Save to Event
                </button>
              </div>
            </section>

            <section className="space-y-6">
              <div className="oc-card relative overflow-hidden p-5 sm:p-7">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-orange-500/10" />

                <div className="relative z-10">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        Preview
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {style} Flyer
                      </h2>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                      MVP Preview
                    </span>
                  </div>

                  <div
                    ref={flyerRef}
                    className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl"
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Flyer background"
                        className="absolute inset-0 h-full w-full object-cover opacity-40"
                      />
                    ) : null}

                    <div className="absolute inset-0 bg-gradient-to-br from-violet-700/70 via-black/80 to-orange-600/40" />
                    <div className="absolute left-8 top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute bottom-10 right-8 h-36 w-36 rounded-full bg-violet-400/20 blur-3xl" />

                    <div className="relative flex h-full flex-col justify-between p-8">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-violet-100/80">
                          Function Hour Presents
                        </p>

                        <h3 className="mt-5 text-5xl font-black leading-[0.9] tracking-tight">
                          {selectedEvent?.name || "Night Moves"}
                        </h3>

                        <p className="mt-4 max-w-xs text-sm text-white/65">
                          {prompt ||
                            selectedEvent?.description ||
                            "Premium nightlife, curated music, cultural discovery, and a crowd worth remembering."}
                        </p>
                      </div>

                      <div>
                        <div className="mb-5 h-px bg-white/20" />

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-white/40">
                              Style
                            </p>

                            <p className="mt-1 text-xl font-black">{style}</p>
                          </div>

                          <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                            RSVP
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="mt-6 rounded-3xl border border-green-300/20 bg-green-500/10 p-4 text-sm font-black text-green-100">
                      Saved to Creative Library and ready to reuse.
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="oc-button-secondary w-full"
                      onClick={downloadFlyer}
                    >
                      Download PNG
                    </button>

                    {imagePreview && (
                      <Link
                        href="/host/creative-library"
                        className="oc-button-primary block w-full text-center"
                      >
                        View Saved Flyer
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="oc-card p-5 sm:p-7">
                <p className="text-xs uppercase tracking-[0.3em] text-orange-200/70">
                  Readiness
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Launch Creative Checklist
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <FlyerChecklistItem
                    label="Event selected"
                    done={Boolean(selectedEvent)}
                  />
                  <FlyerChecklistItem
                    label="Prompt added"
                    done={Boolean(prompt.trim())}
                  />
                  <FlyerChecklistItem
                    label="Style selected"
                    done={Boolean(style)}
                  />
                  <FlyerChecklistItem
                    label="Image uploaded"
                    done={Boolean(imagePreview)}
                  />
                </div>
              </div>

              <div className="oc-card p-5 sm:p-7">
                <p className="text-xs uppercase tracking-[0.3em] text-violet-300/70">
                  Creative Analytics
                </p>

                <h2 className="mt-2 text-2xl font-black">Studio Insights</h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <AnalyticsMiniCard
                    label="Total Drafts"
                    value={String(totalDrafts)}
                  />

                  <AnalyticsMiniCard label="Top Style" value={topStyle} />

                  <AnalyticsMiniCard
                    label="Connected Event"
                    value={selectedEvent?.name || "None"}
                  />

                  <AnalyticsMiniCard
                    label="Last Updated"
                    value={
                      savedCreative?.[0]?.updatedAt
                        ? new Date(
                            savedCreative[0].updatedAt,
                          ).toLocaleDateString()
                        : "N/A"
                    }
                  />
                </div>
              </div>

              {savedCreative && savedCreative.length > 0 && (
                <div className="oc-card p-5 sm:p-7">
                  <p className="text-xs uppercase tracking-[0.3em] text-violet-300/70">
                    Saved Creative
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-black">Previous Flyers</h2>

                    <Link
                      href="/host/creative-library"
                      className="rounded-full border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-100 hover:bg-violet-500/20"
                    >
                      Open Library
                    </Link>
                  </div>

                  <div className="mt-5 space-y-3">
                    {savedCreative.slice(0, 3).map((creative) => (
                      <div
                        key={creative._id}
                        className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-4 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-zinc-950"
                      >
                        <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-24 w-24 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-orange-500/10" />

                        <div className="relative flex items-center justify-between gap-3">
                          <p className="font-black text-white">
                            {creative.title || "Event Flyer"}
                          </p>

                          <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-100">
                            {creative.style || "Luxury"}
                          </span>
                        </div>

                        {creative.imageUrl && (
                          <img
                            src={creative.imageUrl}
                            alt={creative.title || "Saved creative"}
                            className="mt-3 h-28 w-full rounded-2xl object-cover"
                          />
                        )}

                        {creative.caption && (
                          <p className="mt-2 line-clamp-2 text-sm text-white/50">
                            {creative.caption}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => loadSavedCreative(creative)}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white hover:bg-white/[0.08]"
                          >
                            Load Draft
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this saved creative?")) {
                                deleteCreative({ id: creative._id });
                              }
                            }}
                            className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="oc-card p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-violet-300/70">
                      Auto Caption
                    </p>

                    <h2 className="mt-2 text-2xl font-black">IG-ready copy</h2>
                  </div>

                  <button
                    type="button"
                    onClick={copyCaption}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white hover:bg-white/[0.08]"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <pre className="mt-4 whitespace-pre-wrap rounded-3xl border border-white/10 bg-black/40 p-5 text-sm leading-relaxed text-white/80">
                  {caption}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function FlyerChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white/75">
      <span className={done ? "mr-2 text-green-300" : "mr-2 text-white/30"}>
        ●
      </span>
      {label}
    </div>
  );
}

function AnalyticsMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
