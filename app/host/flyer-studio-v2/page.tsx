"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";
import { toPng } from "html-to-image";
import ToolPanel from "@/components/host/flyer-studio-v2/ToolPanel";
import PropertiesPanel from "@/components/host/flyer-studio-v2/PropertiesPanel";
import CanvasStage from "@/components/host/flyer-studio-v2/CanvasStage";
import BackgroundEraser from "@/components/host/flyer-studio-v2/BackgroundEraser";
import {
  CANVAS_WIDTH,
  backgroundPresets,
  MIN_HEIGHT,
  MIN_WIDTH,
  SNAP_THRESHOLD,
  formats,
  initialElements,
  sidebarTools,
  socialPackFormats,
  templates,
} from "@/components/host/flyer-studio-v2/config";
import {
  cloneElements,
  getElementAnchors,
  parseFlyerDocument,
} from "@/components/host/flyer-studio-v2/editor-utils";
import { useEditorHistory } from "@/components/host/flyer-studio-v2/hooks/useEditorHistory";
import { useFlyerDraft } from "@/components/host/flyer-studio-v2/hooks/useFlyerDraft";
import type {
  CanvasElement,
  FlyerDocument,
  Guide,
  Interaction,
  ResizeHandle,
  SidebarTool,
} from "@/components/host/flyer-studio-v2/types";

function eventDateLabel(event: Doc<"events">) {
  const dateOnly = event.dateString?.match(/^\d{4}-\d{2}-\d{2}$/);
  const timestamp = Number.isFinite(event.eventDate)
    ? Number(event.eventDate)
    : dateOnly
      ? new Date(`${event.dateString}T12:00:00`).getTime()
      : Date.parse(event.dateString || "");
  if (!Number.isFinite(timestamp)) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(timestamp).toUpperCase();
}

export default function FlyerStudioV2Page() {
  const { isLoaded, isSignedIn } = useAuth();
  const events = useQuery(
    api.events.getMyEvents,
    isLoaded && isSignedIn ? {} : "skip",
  ) as (Doc<"events"> & { imageUrl: string | null })[] | undefined;
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const brandKit = useQuery(api.users.getBrandKit, isLoaded && isSignedIn ? {} : "skip");
  const saveBrandKit = useMutation(api.users.saveBrandKit);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const editingStartRef = useRef<CanvasElement[] | null>(null);
  const clipboardRef = useRef<CanvasElement | null>(null);
  const loadedEventIdRef = useRef("");

  const [activeTool, setActiveTool] = useState<SidebarTool>("templates");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Luxury");
  const [format, setFormat] = useState("poster");
  const [imagePreview, setImagePreview] = useState("");
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [socialPackOpen, setSocialPackOpen] = useState(false);
  const [designCheckOpen, setDesignCheckOpen] = useState(false);
  const storedImageUrl = useQuery(
    api.events.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : "skip",
  );
  const backgroundImageUrl = imageStorageId ? storedImageUrl ?? "" : imagePreview;
  const [brandColor, setBrandColor] = useState("#8b5cf6");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#ffffff");
  const [brandFontFamily, setBrandFontFamily] = useState("Arial, Helvetica, sans-serif");
  const [brandLogoStorageId, setBrandLogoStorageId] = useState<Id<"_storage"> | null>(null);
  const [brandSaveStatus, setBrandSaveStatus] = useState("");
  const [status, setStatus] = useState("");
  const [overlayStrength, setOverlayStrength] = useState(55);
  const [backgroundPreset, setBackgroundPreset] = useState("aurora");
  const [zoom, setZoom] = useState(85);
  const {
    elements,
    commitElements,
    updateElement,
    undo: restoreUndo,
    redo: restoreRedo,
    commitSnapshot,
    resetElements,
    canUndo,
    canRedo,
  } = useEditorHistory(initialElements);
  const [selectedElementId, setSelectedElementId] = useState("headline");
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>(["headline"]);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const {
    savedDraft,
    isLoading: isDraftLoading,
    isSaving,
    saveStatus,
    saveDraft,
  } = useFlyerDraft(selectedEventId);

  const layerStorageIds = useMemo(() => Array.from(new Set(elements.filter((element) => element.kind === "image" && element.imageStorageId).map((element) => element.imageStorageId as Id<"_storage">))), [elements]);
  const layerImageUrls = useQuery(api.events.getImageUrls, layerStorageIds.length ? { storageIds: layerStorageIds } : "skip");
  useEffect(() => {
    if (!layerImageUrls?.length) return;
    const urlMap = new Map(layerImageUrls.map((item) => [String(item.storageId), item.url]));
    commitElements((current) => {
      let changed = false;
      const next = current.map((element) => {
        if (!element.imageStorageId) return element;
        const url = urlMap.get(element.imageStorageId);
        if (!url || url === element.imageUrl) return element;
        changed = true;
        return { ...element, imageUrl: url };
      });
      return changed ? next : current;
    }, false);
  }, [commitElements, layerImageUrls]);

  const selectedEvent = events?.find((event) => event._id === selectedEventId);
  const selectedFormat =
    formats.find((item) => item.id === format) || formats[0];
  const canvasHeight = selectedFormat.height;
  const canvasScale = useMemo(() => zoom / 100, [zoom]);
  const selectedElement =
    elements.find((element) => element.id === selectedElementId) || null;
  const headline =
    elements.find((element) => element.id === "headline")?.text ||
    "Night Moves";
  const eventTitle = selectedEvent?.name || headline;
  const eventUrl = selectedEventId
    ? `https://functionhour.com/events/${selectedEventId}`
    : "";
  const eventDetailIssues = useMemo(() => {
    if (!selectedEvent) return [];
    const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
    const elementText = (id: string) => elements.find((element) => element.id === id && !element.hidden)?.text || "";
    const venue = selectedEvent.venueName ||
      [selectedEvent.city, selectedEvent.state].filter(Boolean).join(", ") ||
      selectedEvent.location || "";
    const date = eventDateLabel(selectedEvent);
    const issues: string[] = [];
    if (normalized(elementText("headline")) !== normalized(selectedEvent.name)) issues.push("Event title differs from the listing");
    if (venue && normalized(elementText("venue")) !== normalized(venue)) issues.push("Venue or city differs from the listing");
    if (date && normalized(elementText("event-date")) !== normalized(date)) issues.push("Event date is missing or out of date");
    if (elements.some((element) => element.kind === "qr" && !element.hidden && element.text !== eventUrl)) issues.push("Ticket QR points to another event");
    return issues;
  }, [elements, eventUrl, selectedEvent]);
  const designChecks = useMemo(() => {
    const visible = elements.filter((element) => !element.hidden);
    const issues: Array<{ level: "error" | "warning" | "pass"; label: string }> = [];
    const hasHeadline = visible.some((element) => element.id === "headline" && element.text.trim());
    const hasVenue = visible.some((element) => element.id === "venue" && element.text.trim());
    const hasDate = visible.some((element) => element.id === "event-date" && element.text.trim());
    const qrs = visible.filter((element) => element.kind === "qr");
    const ctas = visible.filter((element) => element.kind === "button");
    const images = visible.filter((element) => element.kind === "image");
    const fonts = new Set(visible.filter((element) => element.kind === "text" || element.kind === "button").map((element) => element.fontFamily || "default"));
    issues.push({ level: hasHeadline ? "pass" : "error", label: hasHeadline ? "Event title is present" : "Add an event title" });
    issues.push({ level: hasDate ? "pass" : "warning", label: hasDate ? "Event date is present" : "Event date is missing" });
    issues.push({ level: hasVenue ? "pass" : "warning", label: hasVenue ? "Venue/location is present" : "Venue or location is missing" });
    issues.push({ level: ctas.length ? "pass" : "warning", label: ctas.length ? "Ticket call-to-action is present" : "Consider adding a ticket call-to-action" });
    if (qrs.length) {
      const tooSmall = qrs.some((element) => element.width < 110 || element.height < 110);
      const wrongLink = qrs.some((element) => selectedEventId && element.text !== eventUrl);
      issues.push({ level: tooSmall ? "warning" : "pass", label: tooSmall ? "Ticket QR may be too small to scan" : "Ticket QR has a scannable canvas size" });
      if (wrongLink) issues.push({ level: "error", label: "Ticket QR points to a different event" });
    } else {
      issues.push({ level: "warning", label: "No ticket QR is included" });
    }
    const edgeRisk = visible.some((element) => element.x < 16 || element.y < 16 || element.x + element.width > CANVAS_WIDTH - 16 || element.y + element.height > canvasHeight - 16);
    issues.push({ level: edgeRisk ? "warning" : "pass", label: edgeRisk ? "Some content is close to the crop/safe-zone edge" : "Content stays inside the basic safe zone" });
    if (fonts.size > 3) issues.push({ level: "warning", label: `Design uses ${fonts.size} font families; consider simplifying typography` });
    else issues.push({ level: "pass", label: "Typography uses three or fewer font families" });
    const lowOpacityText = visible.some((element) => (element.kind === "text" || element.kind === "button") && (element.opacity ?? 1) < 0.55);
    if (lowOpacityText) issues.push({ level: "warning", label: "Some text has low opacity and may be difficult to read" });
    const blurredImages = images.some((element) => (element.blur ?? 0) > 4);
    if (blurredImages) issues.push({ level: "warning", label: "A heavily blurred image layer may reduce clarity" });
    return issues;
  }, [canvasHeight, elements, eventUrl, selectedEventId]);
  const designCheckProblems = designChecks.filter((check) => check.level !== "pass").length;

  const [exportReviewAcknowledged, setExportReviewAcknowledged] = useState(false);

  useEffect(() => {
    setExportReviewAcknowledged(false);
  }, [elements, selectedEventId, selectedEvent?.name, selectedEvent?.venueName, selectedEvent?.city, selectedEvent?.state, selectedEvent?.eventDate, selectedEvent?.dateString]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setZoom(55);
    }

    const linkedEventId = new URLSearchParams(window.location.search).get(
      "eventId"
    );

    if (linkedEventId) {
      setSelectedEventId(linkedEventId);
    }
  }, []);

  useEffect(() => {
    if (
      !selectedEventId ||
      !selectedEvent ||
      isDraftLoading ||
      loadedEventIdRef.current === selectedEventId
    ) {
      return;
    }

    const eventDraft =
      savedDraft && String(savedDraft.eventId) === selectedEventId
        ? savedDraft
        : null;
    const document = eventDraft?.editorState
      ? parseFlyerDocument(eventDraft.editorState)
      : null;

    loadedEventIdRef.current = selectedEventId;

    if (document) {
      setFormat(document.format);
      setPrompt(document.prompt);
      setStyle(document.style);
      setImageStorageId((document.imageStorageId as Id<"_storage"> | undefined) ?? null);
      setImagePreview(document.imageStorageId ? "" : document.imageUrl);
      setOverlayStrength(document.overlayStrength);
      setBackgroundPreset(document.backgroundPreset || "aurora");
      resetElements(document.elements);
    } else {
      const eventElements = cloneElements(initialElements).map((element) => {
        if (element.id === "headline" && selectedEvent?.name) {
          return { ...element, text: String(selectedEvent.name).toUpperCase() };
        }
        if (element.id === "venue" && selectedEvent) {
          const venue = selectedEvent.venueName ||
            [selectedEvent.city, selectedEvent.state].filter(Boolean).join(", ") ||
            selectedEvent.location;
          return venue
            ? { ...element, text: String(venue).toUpperCase() }
            : element;
        }
        return element;
      });
      const date = eventDateLabel(selectedEvent);
      if (date) {
        eventElements.push({
          ...initialElements[3],
          id: "event-date",
          name: "Event date",
          text: date,
          y: 626,
          width: 430,
          fontWeight: 700,
        });
      }

      setFormat("poster");
      setPrompt("");
      setStyle("Luxury");
      setImagePreview("");
      setImageStorageId(null);
      setOverlayStrength(55);
      setBackgroundPreset("aurora");
      resetElements(eventElements);
    }

    setSelectedElementId("");
    setEditingElementId(null);
  }, [
    isDraftLoading,
    resetElements,
    savedDraft,
    selectedEvent,
    selectedEventId,
  ]);

  async function saveCurrentDraft() {
    if (!selectedEventId) {
      setStatus("Select an event before saving.");
      return;
    }

    const document: FlyerDocument = {
      version: 1,
      format,
      prompt,
      style,
      imageUrl: imagePreview,
      imageStorageId: imageStorageId ?? undefined,
      overlayStrength,
      backgroundPreset,
      elements: cloneElements(elements),
    };

    await saveDraft({
      document,
      title: `${eventTitle} Flyer`,
      prompt,
      style,
      imageUrl: backgroundImageUrl,
    });
  }

  const undo = useCallback(() => {
    restoreUndo();
    setEditingElementId(null);
    setGuides([]);
  }, [restoreUndo]);

  const redo = useCallback(() => {
    restoreRedo();
    setEditingElementId(null);
    setGuides([]);
  }, [restoreRedo]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      // Copy the selected element to the internal clipboard.
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "c" &&
        selectedElementId
      ) {
        event.preventDefault();

        const selected = elements.find(
          (element) => element.id === selectedElementId,
        );

        if (selected) {
          clipboardRef.current = cloneElements([selected])[0];
        }

        return;
      }

      // Paste the copied element with a small visual offset.
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "v" &&
        clipboardRef.current
      ) {
        event.preventDefault();

        const copied = cloneElements([clipboardRef.current])[0];
        const pastedId = `${copied.id}-copy-${Date.now()}`;

        const pastedElement: CanvasElement = {
          ...copied,
          id: pastedId,
          x: Math.min(
            CANVAS_WIDTH - copied.width,
            Math.max(0, copied.x + 20),
          ),
          y: Math.min(
            canvasHeight - copied.height,
            Math.max(0, copied.y + 20),
          ),
        };

        commitElements((current) => [...current, pastedElement]);
        clipboardRef.current = cloneElements([pastedElement])[0];
        setSelectedElementId(pastedId);
        setEditingElementId(null);
        setGuides([]);

        return;
      }

      // Duplicate the selected element immediately.
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "d" &&
        selectedElementId
      ) {
        event.preventDefault();

        const selected = elements.find(
          (element) => element.id === selectedElementId,
        );

        if (!selected) return;

        const duplicateId = `${selected.id}-copy-${Date.now()}`;

        const duplicatedElement: CanvasElement = {
          ...cloneElements([selected])[0],
          id: duplicateId,
          x: Math.min(
            CANVAS_WIDTH - selected.width,
            Math.max(0, selected.x + 20),
          ),
          y: Math.min(
            canvasHeight - selected.height,
            Math.max(0, selected.y + 20),
          ),
        };

        commitElements((current) => [...current, duplicatedElement]);
        setSelectedElementId(duplicateId);
        setEditingElementId(null);
        setGuides([]);

        return;
      }

      // Escape clears the current selection.
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedElementId("");
        setEditingElementId(null);
        setGuides([]);
        return;
      }

      // Arrow keys move the selected element by 1px.
      // Hold Shift to move it by 10px.
      if (
        selectedElementId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();

        const distance = event.shiftKey ? 10 : 1;

        commitElements((current) =>
          current.map((element) => {
            if (element.id !== selectedElementId || element.locked) {
              return element;
            }

            let x = element.x;
            let y = element.y;

            switch (event.key) {
              case "ArrowLeft":
                x = Math.max(0, x - distance);
                break;

              case "ArrowRight":
                x = Math.min(
                  CANVAS_WIDTH - element.width,
                  x + distance,
                );
                break;

              case "ArrowUp":
                y = Math.max(0, y - distance);
                break;

              case "ArrowDown":
                y = Math.min(
                  canvasHeight - element.height,
                  y + distance,
                );
                break;
            }

            return {
              ...element,
              x,
              y,
            };
          }),
        );

        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedElementId
      ) {
        event.preventDefault();
        commitElements((current) =>
          current.filter((element) => element.id !== selectedElementId),
        );
        setSelectedElementId("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvasHeight, commitElements, elements, redo, selectedElementId, undo]);

  function applyTemplate(template: (typeof templates)[number]) {
    setPrompt(template.prompt);
    setStyle(template.style);
    commitElements((current) =>
      current.map((element) => {
        if (element.id === "headline") {
          return { ...element, text: (selectedEvent?.name || template.name).toUpperCase() };
        }
        if (element.id === "style") {
          return { ...element, text: template.style.toUpperCase() };
        }
        return element;
      }),
    );
  }

  function syncEventDetails() {
    if (!selectedEvent) return;
    const venue = selectedEvent.venueName ||
      [selectedEvent.city, selectedEvent.state].filter(Boolean).join(", ") ||
      selectedEvent.location || "";
    const date = eventDateLabel(selectedEvent);
    commitElements((current) => {
      const updated = current.map((element) => {
        if (element.id === "headline") return { ...element, text: selectedEvent.name.toUpperCase(), hidden: false };
        if (element.id === "venue" && venue) return { ...element, text: venue.toUpperCase(), hidden: false };
        if (element.id === "event-date" && date) return { ...element, text: date, hidden: false };
        if (element.kind === "qr") return { ...element, text: eventUrl };
        return element;
      });
      if (!updated.some((element) => element.id === "headline")) {
        updated.push({
          ...initialElements[1],
          text: selectedEvent.name.toUpperCase(),
          y: Math.round(105 * canvasHeight / formats[0].height),
        });
      }
      if (venue && !updated.some((element) => element.id === "venue")) {
        updated.push({
          ...initialElements[3],
          text: venue.toUpperCase(),
          y: Math.max(0, canvasHeight - 112),
        });
      }
      if (date && !updated.some((element) => element.id === "event-date")) {
        const venueElement = updated.find((element) => element.id === "venue");
        updated.push({
          ...initialElements[3],
          id: "event-date",
          name: "Event date",
          text: date,
          y: Math.max(0, (venueElement?.y ?? Math.min(668, canvasHeight - 18)) - 42),
          width: 430,
          fontWeight: 700,
        });
      }
      return updated;
    });
    setExportStatus("");
    setStatus("Event title, date, and venue updated. Save your draft to keep the changes.");
  }

  function addTicketQr() {
    if (!selectedEvent || !eventUrl) return;
    const existing = elements.find((element) => element.id === "ticket-qr");
    if (existing) {
      updateElement(existing.id, { text: eventUrl, hidden: false });
      setSelectedElementId(existing.id);
      return;
    }
    const size = 132;
    const qr: CanvasElement = {
      ...initialElements[5],
      id: "ticket-qr",
      kind: "qr",
      name: "Ticket QR",
      text: eventUrl,
      x: CANVAS_WIDTH - size - 34,
      y: Math.max(24, canvasHeight - size - 108),
      width: size,
      height: size,
      background: "#ffffff",
    };
    commitElements((current) => [...current, qr]);
    setSelectedElementId(qr.id);
    setStatus("Ticket QR added. Download a flyer and scan it to verify the link.");
  }

  function changeFormat(nextFormatId: string) {
    const nextFormat = formats.find((item) => item.id === nextFormatId);
    if (!nextFormat || nextFormat.id === format) return;
    const ratio = nextFormat.height / canvasHeight;
    commitElements((current) => current.map((element) => {
      const height = Math.min(nextFormat.height, Math.max(element.kind === "qr" ? 96 : MIN_HEIGHT, Math.round(element.height * ratio)));
      const width = element.kind === "qr" ? height : element.width;
      return {
        ...element,
        y: Math.min(nextFormat.height - height, Math.max(0, Math.round(element.y * ratio))),
        height,
        width,
        x: element.kind === "qr" ? Math.min(element.x, CANVAS_WIDTH - width) : element.x,
        fontSize: Math.min(120, Math.max(8, Math.round(element.fontSize * ratio))),
      };
    }));
    setFormat(nextFormat.id);
    setSelectedElementId("");
    setStatus(`Layout fitted to ${nextFormat.label.toLowerCase()}. Review the text before exporting.`);
  }

  function createSocialVersion(nextFormatId: string) {
    changeFormat(nextFormatId);
    setSocialPackOpen(false);
    setStatus("Social version created. Review placement, then download or choose another Social Pack size.");
  }

  useEffect(() => {
    if (!brandKit) return;
    setBrandColor(brandKit.primaryColor);
    setBrandSecondaryColor(brandKit.secondaryColor);
    setBrandFontFamily(brandKit.fontFamily);
    setBrandLogoStorageId((brandKit.logoStorageId as Id<"_storage"> | undefined) ?? null);
  }, [brandKit]);

  async function saveOrganizerBrandKit() {
    setBrandSaveStatus("Saving…");
    try {
      await saveBrandKit({ primaryColor: brandColor, secondaryColor: brandSecondaryColor, fontFamily: brandFontFamily, logoStorageId: brandLogoStorageId ?? undefined });
      setBrandSaveStatus("Brand kit saved.");
    } catch { setBrandSaveStatus("Could not save brand kit."); }
  }

  function applyOrganizerBrandKit() {
    commitElements((current) => current.map((element) => {
      if (element.kind === "text") return { ...element, fontFamily: brandFontFamily };
      if (element.id === "cta") return { ...element, background: brandColor, color: brandSecondaryColor, fontFamily: brandFontFamily };
      return element;
    }));
    applyBrandColor(brandColor);
    if (brandKit?.logoUrl && !elements.some((element) => element.id === "brand-logo")) {
      const logo: CanvasElement = { id: "brand-logo", kind: "image", name: "Brand logo", text: "", imageUrl: brandKit.logoUrl, objectFit: "contain", opacity: 1, x: 390, y: 36, width: 90, height: 70, fontSize: 12, fontWeight: 400, color: "#ffffff", align: "center", borderRadius: 0 };
      commitElements((current) => [...current, logo]);
    }
    setStatus("Organizer brand kit applied.");
  }

  async function uploadBrandLogo(file: File) {
    setBrandSaveStatus("Uploading logo…");
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("Logo upload failed.");
    const result = await response.json() as { storageId: Id<"_storage"> };
    setBrandLogoStorageId(result.storageId);
    setBrandSaveStatus("Logo uploaded. Save brand kit to keep it.");
  }

  function applyBrandColor(color: string) {
    setBrandColor(color);
    commitElements((current) =>
      current.map((element) => {
        if (element.id === "kicker") return { ...element, color };
        if (element.id === "cta") return { ...element, background: color };
        return element;
      }),
    );
  }

  function alignSelectedToCanvas(
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) {
    if (!selectedElement) return;

    const position: Partial<Pick<CanvasElement, "x" | "y">> = {};
    if (alignment === "left") position.x = 0;
    if (alignment === "center") position.x = (CANVAS_WIDTH - selectedElement.width) / 2;
    if (alignment === "right") position.x = CANVAS_WIDTH - selectedElement.width;
    if (alignment === "top") position.y = 0;
    if (alignment === "middle") position.y = (canvasHeight - selectedElement.height) / 2;
    if (alignment === "bottom") position.y = canvasHeight - selectedElement.height;

    updateElement(selectedElement.id, position);
  }

  function addTextElement(kind: "heading" | "subheading" | "body") {
    const id = `text-${Date.now()}`;
    const presets = {
      heading: {
        text: "NEW HEADING",
        fontSize: 42,
        fontWeight: 900,
        height: 90,
      },
      subheading: {
        text: "Add a subheading",
        fontSize: 24,
        fontWeight: 700,
        height: 54,
      },
      body: {
        text: "Add body text",
        fontSize: 16,
        fontWeight: 400,
        height: 48,
      },
    };
    const preset = presets[kind];

    commitElements((current) => [
      ...current,
      {
        id,
        kind: "text",
        name: `Text ${current.length + 1}`,
        text: preset.text,
        x: 80,
        y: 180,
        width: 360,
        height: preset.height,
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        color: "#ffffff",
        align: "left",
      },
    ]);
    setSelectedElementId(id);
  }

  async function uploadBackground(file: Blob) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setStatus("Choose a JPG, PNG, or WebP image smaller than 10 MB.");
      throw new Error("Choose a JPG, PNG, or WebP image smaller than 10 MB.");
    }

    try {
      setIsUploading(true);
      setStatus("Uploading background…");
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("The image could not be uploaded.");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      setImageStorageId(storageId);
      setImagePreview("");
      setStatus("Background added. Save your draft to keep it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  async function downloadCanvas() {
    if (!canvasRef.current || isExporting) return;
    if (eventDetailIssues.length && !exportReviewAcknowledged) {
      setExportReviewAcknowledged(true);
      setExportStatus("Review the event details below, then choose Export anyway if your wording is intentional.");
      return;
    }
    try {
      setIsExporting(true);
      setExportStatus("Preparing your flyer…");
      await document.fonts.ready;
      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        width: CANVAS_WIDTH,
        height: canvasHeight,
        style: { transform: "none" },
        filter: (node) => !(node instanceof HTMLElement && node.hasAttribute("data-export-ui")),
        backgroundColor: "#000000",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${(eventTitle || "functionhour-flyer").replace(/[^a-z0-9_-]+/gi, "-")}-${format}.png`;
      link.click();
      setExportStatus(`Downloaded ${CANVAS_WIDTH * 3} × ${canvasHeight * 3} PNG`);
    } catch {
      setExportStatus("Export failed. Try again after the background image finishes loading.");
    } finally {
      setIsExporting(false);
    }
  }

  function calculateSnappedPosition(
    moving: CanvasElement,
    proposedX: number,
    proposedY: number,
  ) {
    const candidate = { ...moving, x: proposedX, y: proposedY };
    const candidateAnchors = getElementAnchors(candidate);
    const xTargets = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
    const yTargets = [0, canvasHeight / 2, canvasHeight];

    elements
      .filter((element) => element.id !== moving.id && !element.hidden)
      .forEach((element) => {
        const anchors = getElementAnchors(element);
        xTargets.push(anchors.left, anchors.centerX, anchors.right);
        yTargets.push(anchors.top, anchors.centerY, anchors.bottom);
      });

    let nextX = proposedX;
    let nextY = proposedY;
    let bestXDistance = SNAP_THRESHOLD + 1;
    let bestYDistance = SNAP_THRESHOLD + 1;
    let xGuide: Guide | null = null;
    let yGuide: Guide | null = null;

    const xCandidates = [
      { value: candidateAnchors.left, offset: 0 },
      { value: candidateAnchors.centerX, offset: moving.width / 2 },
      { value: candidateAnchors.right, offset: moving.width },
    ];
    const yCandidates = [
      { value: candidateAnchors.top, offset: 0 },
      { value: candidateAnchors.centerY, offset: moving.height / 2 },
      { value: candidateAnchors.bottom, offset: moving.height },
    ];

    xTargets.forEach((target) => {
      xCandidates.forEach((anchor) => {
        const distance = Math.abs(anchor.value - target);
        if (distance < bestXDistance && distance <= SNAP_THRESHOLD) {
          bestXDistance = distance;
          nextX = target - anchor.offset;
          xGuide = { axis: "x", position: target };
        }
      });
    });

    yTargets.forEach((target) => {
      yCandidates.forEach((anchor) => {
        const distance = Math.abs(anchor.value - target);
        if (distance < bestYDistance && distance <= SNAP_THRESHOLD) {
          bestYDistance = distance;
          nextY = target - anchor.offset;
          yGuide = { axis: "y", position: target };
        }
      });
    });

    const nextGuides: Guide[] = [];
    if (xGuide) nextGuides.push(xGuide);
    if (yGuide) nextGuides.push(yGuide);

    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH - moving.width, nextX)),
      y: Math.max(0, Math.min(canvasHeight - moving.height, nextY)),
      guides: nextGuides,
    };
  }

  function beginDrag(
    event: React.PointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) {
    if (element.locked || editingElementId === element.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const shiftSelecting = event.shiftKey;
    const groupIds = element.groupId ? elements.filter((item) => item.groupId === element.groupId).map((item) => item.id) : [element.id];
    const nextSelection = shiftSelecting ? Array.from(new Set([...selectedElementIds, ...groupIds])) : (selectedElementIds.includes(element.id) ? selectedElementIds : groupIds);
    setSelectedElementIds(nextSelection);
    setSelectedElementId(element.id);
    interactionRef.current = {
      mode: "drag",
      elementId: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startElement: { ...element },
      startSnapshot: cloneElements(elements),
    };
  }

  function beginResize(
    event: React.PointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ResizeHandle,
  ) {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElementId(element.id);
    interactionRef.current = {
      mode: "resize",
      elementId: element.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startElement: { ...element },
      startSnapshot: cloneElements(elements),
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    if (!interaction) return;

    const dx = (event.clientX - interaction.startClientX) / canvasScale;
    const dy = (event.clientY - interaction.startClientY) / canvasScale;
    const start = interaction.startElement;

    if (interaction.mode === "drag") {
      const snapped = calculateSnappedPosition(
        start,
        start.x + dx,
        start.y + dy,
      );
      setGuides(snapped.guides);
      const selectedAtStart = selectedElementIds.includes(interaction.elementId) ? selectedElementIds : [interaction.elementId];
      const anchorStart = interaction.startSnapshot.find((item) => item.id === interaction.elementId) || start;
      const appliedDx = snapped.x - anchorStart.x;
      const appliedDy = snapped.y - anchorStart.y;
      selectedAtStart.forEach((id) => {
        const original = interaction.startSnapshot.find((item) => item.id === id);
        if (!original || original.locked) return;
        updateElement(id, {
          x: Math.max(0, Math.min(CANVAS_WIDTH - original.width, original.x + appliedDx)),
          y: Math.max(0, Math.min(canvasHeight - original.height, original.y + appliedDy)),
        }, false);
      });
      return;
    }

    let x = start.x;
    let y = start.y;
    let width = start.width;
    let height = start.height;
    const { handle } = interaction;

    if (handle.includes("e")) width = Math.max(MIN_WIDTH, start.width + dx);
    if (handle.includes("s")) height = Math.max(MIN_HEIGHT, start.height + dy);
    if (handle.includes("w")) {
      width = Math.max(MIN_WIDTH, start.width - dx);
      x = start.x + (start.width - width);
    }
    if (handle.includes("n")) {
      height = Math.max(MIN_HEIGHT, start.height - dy);
      y = start.y + (start.height - height);
    }

    x = Math.max(0, x);
    y = Math.max(0, y);
    if (start.kind === "qr") {
      const requestedSize = handle.includes("e") || handle.includes("w") ? width : height;
      const size = Math.max(96, Math.min(requestedSize, CANVAS_WIDTH - x, canvasHeight - y));
      width = size;
      height = size;
    }
    width = Math.min(width, CANVAS_WIDTH - x);
    height = Math.min(height, canvasHeight - y);
    updateElement(interaction.elementId, { x, y, width, height }, false);
  }

  function finishInteraction() {
    const interaction = interactionRef.current;
    if (!interaction) return;
    interactionRef.current = null;
    setGuides([]);

    commitSnapshot(interaction.startSnapshot);
  }

  function startInlineEditing(
    event: React.MouseEvent<HTMLDivElement>,
    element: CanvasElement,
  ) {
    if (element.locked || element.kind !== "text") return;
    event.stopPropagation();
    editingStartRef.current = cloneElements(elements);
    setSelectedElementId(element.id);
    setEditingElementId(element.id);

    window.setTimeout(() => {
      const editable = document.querySelector<HTMLElement>(
        `[data-editable-id="${element.id}"]`,
      );
      editable?.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (editable && selection) {
        range.selectNodeContents(editable);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  }

  function finishInlineEditing() {
    const startSnapshot = editingStartRef.current;
    editingStartRef.current = null;
    setEditingElementId(null);
    if (!startSnapshot) return;

    commitSnapshot(startSnapshot);
  }

  function duplicateSelected() {
    if (!selectedElement) return;
    const id = `${selectedElement.id}-${Date.now()}`;
    commitElements((current) => [
      ...current,
      {
        ...selectedElement,
        id,
        name: `${selectedElement.name} copy`,
        x: Math.min(
          CANVAS_WIDTH - selectedElement.width,
          selectedElement.x + 18,
        ),
        y: Math.min(
          canvasHeight - selectedElement.height,
          selectedElement.y + 18,
        ),
      },
    ]);
    setSelectedElementId(id);
  }

  function moveLayer(direction: "up" | "down") {
    if (!selectedElementId) return;
    commitElements((current) => {
      const index = current.findIndex(
        (element) => element.id === selectedElementId,
      );
      if (index < 0) return current;
      const nextIndex =
        direction === "up"
          ? Math.min(current.length - 1, index + 1)
          : Math.max(0, index - 1);
      if (nextIndex === index) return current;
      const next = cloneElements(current);
      const [element] = next.splice(index, 1);
      next.splice(nextIndex, 0, element);
      return next;
    });
  }

  function moveLayerTo(elementId: string, targetIndex: number) {
    commitElements((current) => {
      const fromIndex = current.findIndex((element) => element.id === elementId);
      if (fromIndex < 0) return current;
      const next = cloneElements(current);
      const [element] = next.splice(fromIndex, 1);
      next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, element);
      return next;
    });
  }

  function moveLayerEdge(elementId: string, edge: "front" | "back") {
    commitElements((current) => {
      const index = current.findIndex((element) => element.id === elementId);
      if (index < 0) return current;
      const next = cloneElements(current);
      const [element] = next.splice(index, 1);
      edge === "front" ? next.push(element) : next.unshift(element);
      return next;
    });
  }

  function renameLayer(elementId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateElement(elementId, { name: trimmed });
  }

  function toggleElementSelection(elementId: string, additive: boolean) {
    const element = elements.find((item) => item.id === elementId);
    const relatedIds = element?.groupId ? elements.filter((item) => item.groupId === element.groupId).map((item) => item.id) : [elementId];
    if (!additive) {
      setSelectedElementIds(relatedIds);
      setSelectedElementId(elementId);
      return;
    }
    setSelectedElementIds((current) => current.includes(elementId) ? current.filter((id) => !relatedIds.includes(id)) : Array.from(new Set([...current, ...relatedIds])));
    setSelectedElementId(elementId);
  }

  function groupSelected() {
    if (selectedElementIds.length < 2) return;
    const groupId = `group-${Date.now()}`;
    commitElements((current) => current.map((element) => selectedElementIds.includes(element.id) ? { ...element, groupId } : element));
    setStatus(`Grouped ${selectedElementIds.length} layers.`);
  }

  function ungroupSelected() {
    const groups = new Set(elements.filter((element) => selectedElementIds.includes(element.id) && element.groupId).map((element) => element.groupId));
    if (!groups.size) return;
    commitElements((current) => current.map((element) => element.groupId && groups.has(element.groupId) ? { ...element, groupId: undefined } : element));
    setStatus("Group removed.");
  }

  function alignSelected(alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const selected = elements.filter((element) => selectedElementIds.includes(element.id));
    if (selected.length < 2) return;
    const left = Math.min(...selected.map((element) => element.x));
    const right = Math.max(...selected.map((element) => element.x + element.width));
    const top = Math.min(...selected.map((element) => element.y));
    const bottom = Math.max(...selected.map((element) => element.y + element.height));
    commitElements((current) => current.map((element) => {
      if (!selectedElementIds.includes(element.id) || element.locked) return element;
      if (alignment === "left") return { ...element, x: left };
      if (alignment === "center") return { ...element, x: left + (right - left - element.width) / 2 };
      if (alignment === "right") return { ...element, x: right - element.width };
      if (alignment === "top") return { ...element, y: top };
      if (alignment === "middle") return { ...element, y: top + (bottom - top - element.height) / 2 };
      return { ...element, y: bottom - element.height };
    }));
  }

  function addShapeElement(shape: "rectangle" | "circle") {
    const size = shape === "circle" ? 180 : 220;
    const id = `shape-${Date.now()}`;
    const element: CanvasElement = {
      id,
      kind: "shape",
      name: shape === "circle" ? "Circle" : "Rectangle",
      text: "",
      x: Math.round((CANVAS_WIDTH - size) / 2),
      y: Math.round((canvasHeight - size) / 2),
      width: size,
      height: shape === "circle" ? size : 140,
      fontSize: 12,
      fontWeight: 400,
      color: brandColor,
      align: "center",
      background: brandColor,
      shape,
      opacity: 1,
      borderRadius: shape === "circle" ? 9999 : 16,
    };
    commitElements((current) => [...current, element]);
    setSelectedElementId(id);
  }

  function addImageElement(url: string, name = "Uploaded image", storageId?: Id<"_storage">) {
    const id = `image-${Date.now()}`;
    const width = 260;
    const height = 220;
    const element: CanvasElement = {
      id,
      kind: "image",
      name,
      text: "",
      imageUrl: url,
      imageStorageId: storageId,
      objectFit: "cover",
      opacity: 1,
      x: Math.round((CANVAS_WIDTH - width) / 2),
      y: Math.round((canvasHeight - height) / 2),
      width,
      height,
      fontSize: 12,
      fontWeight: 400,
      color: "#ffffff",
      align: "center",
      borderRadius: 16,
    };
    commitElements((current) => [...current, element]);
    setSelectedElementId(id);
    setActiveTool("elements");
  }

  function deleteSelected() {
    if (!selectedElementId) return;
    commitElements((current) =>
      current.filter((element) => element.id !== selectedElementId),
    );
    setSelectedElementId("");
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <header className="flex min-h-16 flex-col gap-3 border-b border-white/10 bg-[#181818] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href={
              selectedEventId
                ? `/host/events/${selectedEventId}/flyers`
                : "/host"
            }
            className="rounded-lg px-3 py-2 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"
          >
            ← Back
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-black">Flyer Studio</p>
            <p className="hidden text-xs text-white/45 sm:block">Edit, arrange, and export on the canvas</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-30 sm:px-4"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-30 sm:px-4"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => void saveCurrentDraft()}
            disabled={!selectedEventId || isSaving}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-30 sm:px-4"
          >
            {isSaving ? "Saving…" : "Save draft"}
          </button>
          {saveStatus ? (
            <span className="shrink-0 text-xs font-bold text-white/40">
              {saveStatus}
            </span>
          ) : null}
          {exportStatus && <span role="status" className="shrink-0 text-xs font-bold text-white/70">{exportStatus}</span>}
          <button
            type="button"
            onClick={() => setDesignCheckOpen(true)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-black hover:bg-white/10 sm:px-4"
          >
            Design Check{designCheckProblems ? ` · ${designCheckProblems}` : " ✓"}
          </button>
          <button
            type="button"
            onClick={() => setSocialPackOpen(true)}
            className="shrink-0 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm font-black hover:bg-violet-500/25 sm:px-4"
          >
            Create Social Pack
          </button>
          <button
            type="button"
            onClick={() => void downloadCanvas()}
            disabled={isExporting}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-black hover:bg-violet-500 disabled:opacity-50 sm:px-5"
          >
            {isExporting ? "Exporting…" : exportReviewAcknowledged && eventDetailIssues.length ? "Export anyway" : "Download PNG"}
          </button>
        </div>
      </header>

      {selectedEvent && eventDetailIssues.length > 0 && (
        <section role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          <div>
            <p className="font-black">Review before sharing</p>
            <p className="mt-1">{eventDetailIssues.join(" · ")}. Custom wording is okay; check that guests can find the event.</p>
          </div>
          <button type="button" onClick={syncEventDetails} className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-black hover:bg-amber-400/10">Update from event</button>
        </section>
      )}

      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[76px_300px_minmax(0,1fr)_290px]">
        <aside className="border-b border-white/10 bg-[#171717] py-2 lg:border-b-0 lg:border-r lg:py-3">
          <div className="flex gap-2 overflow-x-auto px-2 lg:block lg:space-y-2">
            {sidebarTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-3 text-[10px] font-bold transition lg:w-full lg:min-w-0 ${
                  activeTool === tool.id
                    ? "bg-violet-600 text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </aside>

        <aside className="max-h-[42vh] overflow-y-auto border-b border-white/10 bg-[#202020] p-4 lg:max-h-none lg:border-b-0 lg:border-r">
          {activeTool === "templates" && (
            <ToolPanel title="Templates">
              <p className="mb-4 text-xs leading-5 text-white/45">
                Start with a layout, then edit text and move elements on the canvas.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/30 text-left hover:border-violet-400/50"
                  >
                    <div className="aspect-[4/5] bg-gradient-to-br from-violet-700/50 via-black to-orange-500/30 p-3">
                      <p className="text-xs font-black">{template.name}</p>
                    </div>
                    <p className="p-2 text-[11px] font-bold text-white/60">
                      Use template
                    </p>
                  </button>
                ))}
              </div>
            </ToolPanel>
          )}

          {activeTool === "uploads" && (
            <ToolPanel title="Uploads">
              <label className="mb-4 block text-xs font-bold text-zinc-800">
                Event for this flyer
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900"
                >
                  <option value="">Choose an event</option>
                  {(events || []).map((event) => (
                    <option key={event._id} value={event._id}>{event.name}</option>
                  ))}
                </select>
              </label>
              {selectedEvent && (
                <button type="button" onClick={syncEventDetails} className="mb-4 w-full rounded-xl border border-violet-400/50 bg-violet-500/15 px-4 py-3 text-left text-sm font-bold text-white hover:bg-violet-500/25">
                  Use event title, date &amp; venue
                </button>
              )}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-7 text-center hover:border-violet-400/50">
                <span className="text-2xl">↑</span>
                <span className="mt-2 text-sm font-black">{isUploading ? "Uploading…" : "Upload a background"}</span>
                <span className="mt-1 text-xs text-white/40">
                  JPG, PNG or WebP
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploading}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void uploadBackground(file).catch(() => {});
                    event.target.value = "";
                  }}
                />
              </label>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/10 p-5 text-center hover:bg-violet-500/15">
                <span className="text-sm font-black">Add image as movable layer</span>
                <span className="mt-1 text-xs text-white/50">PNG, JPG or WebP · move, resize and layer it</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") addImageElement(reader.result, file.name);
                  };
                  reader.readAsDataURL(file);
                  event.target.value = "";
                }} />
              </label>
              {selectedEvent?.imageStorageId && (
                <button
                  type="button"
                  onClick={() => {
                    setImageStorageId(selectedEvent.imageStorageId!);
                    setImagePreview("");
                    setStatus("Event cover added. Save your draft to keep it.");
                  }}
                  className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-900 hover:border-violet-500"
                >
                  Use event cover as background
                </button>
              )}
              {backgroundImageUrl && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setIsErasing(true)} className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold text-zinc-900 hover:border-violet-500">
                    Erase part of image
                  </button>
                  <button type="button" onClick={() => { setImageStorageId(null); setImagePreview(""); setStatus("Background image removed."); }} className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold text-zinc-900 hover:border-violet-500">
                    Remove entire image
                  </button>
                </div>
              )}
              {status && <p role="status" className="mt-3 text-xs font-bold text-zinc-700">{status}</p>}
            </ToolPanel>
          )}

          {activeTool === "text" && (
            <ToolPanel title="Text">
              <div className="space-y-3">
                <button type="button" onClick={addTicketQr} disabled={!selectedEvent} className="w-full rounded-xl border border-violet-400/40 bg-violet-500/15 p-4 text-left text-sm font-black text-white hover:bg-violet-500/25 disabled:opacity-50">
                  Add ticket QR <span className="mt-1 block text-xs font-medium text-white/70">Links directly to this event · select an event first</span>
                </button>
                {(["heading", "subheading", "body"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addTextElement(kind)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
                  >
                    <span
                      className={`block font-black ${kind === "heading" ? "text-2xl" : kind === "subheading" ? "text-lg" : "text-sm"}`}
                    >
                      Add {kind}
                    </span>
                  </button>
                ))}
              </div>
            </ToolPanel>
          )}

          {activeTool === "elements" && (
            <ToolPanel title="Layers">
              <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-black">{selectedElementIds.length} selected</p>
                <p className="mt-1 text-[10px] text-white/45">Shift-click layers or canvas objects to select multiple.</p>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={selectedElementIds.length < 2} onClick={groupSelected} className="rounded-lg bg-violet-600 px-2 py-2 text-[10px] font-black disabled:opacity-30">Group</button><button type="button" onClick={ungroupSelected} className="rounded-lg border border-white/10 px-2 py-2 text-[10px] font-black">Ungroup</button></div>
                <div className="mt-2 grid grid-cols-3 gap-1">{(["left","center","right","top","middle","bottom"] as const).map((alignment) => <button key={alignment} type="button" disabled={selectedElementIds.length < 2} onClick={() => alignSelected(alignment)} className="rounded bg-white/5 px-1 py-1 text-[9px] font-bold capitalize text-white/60 disabled:opacity-30">{alignment}</button>)}</div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => addShapeElement("rectangle")} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-black hover:bg-white/10">+ Rectangle</button>
                <button type="button" onClick={() => addShapeElement("circle")} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-black hover:bg-white/10">+ Circle</button>
              </div>
              <div className="space-y-2">
                {[...elements].reverse().map((element, visualIndex) => {
                  const actualIndex = elements.length - 1 - visualIndex;
                  const icon = element.kind === "text" ? "T" : element.kind === "button" ? "▣" : element.kind === "image" ? "▧" : element.kind === "shape" ? "●" : "QR";
                  return (
                    <div
                      key={element.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", element.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedId = event.dataTransfer.getData("text/plain");
                        if (draggedId && draggedId !== element.id) moveLayerTo(draggedId, actualIndex);
                      }}
                      onClick={(event) => toggleElementSelection(element.id, event.shiftKey)}
                      className={`rounded-xl border p-3 ${selectedElementIds.includes(element.id) ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-white/5"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab text-white/35" title="Drag to reorder">⋮⋮</span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-black text-white/70">{icon}</span>
                        <input
                          aria-label={`Rename ${element.name}`}
                          defaultValue={element.name}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={(event) => renameLayer(element.id, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none focus:border-b focus:border-violet-400"
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1">
                        <button type="button" onClick={(event) => { event.stopPropagation(); moveLayerEdge(element.id, "front"); }} className="rounded bg-white/5 px-1 py-1 text-[10px] font-bold text-white/50 hover:bg-white/10">Front</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); moveLayerEdge(element.id, "back"); }} className="rounded bg-white/5 px-1 py-1 text-[10px] font-bold text-white/50 hover:bg-white/10">Back</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateElement(element.id, { hidden: !element.hidden }); }} className="rounded bg-white/5 px-1 py-1 text-[10px] font-bold text-white/50 hover:bg-white/10">{element.hidden ? "Show" : "Hide"}</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); updateElement(element.id, { locked: !element.locked }); }} className="rounded bg-white/5 px-1 py-1 text-[10px] font-bold text-white/50 hover:bg-white/10">{element.locked ? "Unlock" : "Lock"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ToolPanel>
          )}

          {activeTool === "brand" && (
            <ToolPanel title="Brand Kit">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Organizer Brand Kit</p>
                <p className="mt-1 text-xs leading-5 text-white/45">Save your logo, colors, and preferred font once, then reuse them across event flyers.</p>
                {brandKit?.logoUrl ? <img src={brandKit.logoUrl} alt="Organizer logo" className="mt-4 h-16 w-full rounded-xl bg-white/5 object-contain p-2" /> : null}
                <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-3 text-xs font-black hover:border-violet-400/50">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBrandLogo(file).catch(() => setBrandSaveStatus("Logo upload failed.")); event.target.value = ""; }} /></label>
                <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-white/60">Primary<input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} className="mt-2 block h-10 w-full" /></label><label className="text-xs font-bold text-white/60">Secondary<input type="color" value={brandSecondaryColor} onChange={(event) => setBrandSecondaryColor(event.target.value)} className="mt-2 block h-10 w-full" /></label></div>
                <label className="mt-4 block text-xs font-bold text-white/60">Preferred font<select value={brandFontFamily} onChange={(event) => setBrandFontFamily(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"><option value="Arial, Helvetica, sans-serif">Modern Sans</option><option value="'Avenir Next', Avenir, Arial, sans-serif">Avenir</option><option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option><option value="Futura, 'Trebuchet MS', sans-serif">Futura</option><option value="Georgia, 'Times New Roman', serif">Editorial Serif</option><option value="Impact, 'Arial Narrow', sans-serif">Bold Display</option></select></label>
                <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void saveOrganizerBrandKit()} className="rounded-xl bg-violet-600 px-3 py-3 text-xs font-black hover:bg-violet-500">Save Brand Kit</button><button type="button" onClick={applyOrganizerBrandKit} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-black hover:bg-white/10">Apply to Flyer</button></div>
                {brandSaveStatus ? <p className="mt-3 text-xs font-bold text-white/50">{brandSaveStatus}</p> : null}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Quick accent</p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Choose an accent. It updates the kicker and ticket button on your flyer.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { name: "Violet", value: "#8b5cf6" },
                    { name: "Orange", value: "#f97316" },
                    { name: "Rose", value: "#f43f5e" },
                    { name: "Sky", value: "#0ea5e9" },
                  ].map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => applyBrandColor(swatch.value)}
                      aria-label={swatch.name + " brand accent"}
                      aria-pressed={brandColor === swatch.value}
                      title={swatch.name}
                      className={"h-10 rounded-xl border-2 transition hover:scale-105 " + (brandColor === swatch.value ? "border-white ring-2 ring-violet-400" : "border-white/10")}
                      style={{ backgroundColor: swatch.value }}
                    />
                  ))}
                </div>
              </div>
            </ToolPanel>
          )}

          {activeTool === "background" && (
            <ToolPanel title="Background">
              <p className="mb-3 text-xs leading-5 text-white/45">
                Pick a gradient, then adjust its overlay strength.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backgroundPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBackgroundPreset(preset.id)}
                    aria-pressed={backgroundPreset === preset.id}
                    className={"overflow-hidden rounded-xl border text-left transition " + (backgroundPreset === preset.id ? "border-violet-400 ring-2 ring-violet-500/40" : "border-white/10 hover:border-white/30")}
                  >
                    <span
                      className="block h-14"
                      style={{ backgroundImage: preset.backgroundImage }}
                    />
                    <span className="block bg-black/40 px-2 py-2 text-[11px] font-bold">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
              {backgroundImageUrl ? (
                <button
                  type="button"
                  onClick={() => { setImagePreview(""); setImageStorageId(null); }}
                  className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
                >
                  Remove image and use gradient
                </button>
              ) : null}

              <label className="mt-5 block text-xs font-bold text-white/50">
                Overlay strength
              </label>
              <input
                type="range"
                min={0}
                max={90}
                value={overlayStrength}
                onChange={(event) =>
                  setOverlayStrength(Number(event.target.value))
                }
                className="mt-3 w-full"
              />
            </ToolPanel>
          )}
        </aside>

        <CanvasStage
          canvasRef={canvasRef}
          format={format}
          onFormatChange={changeFormat}
          zoom={zoom}
          onZoomChange={setZoom}
          canvasHeight={canvasHeight}
          canvasScale={canvasScale}
          imagePreview={backgroundImageUrl}
          backgroundPreset={backgroundPreset}
          overlayStrength={overlayStrength}
          elements={elements}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          editingElementId={editingElementId}
          guides={guides}
          onPointerMove={handlePointerMove}
          onInteractionFinish={finishInteraction}
          onClearSelection={() => {
            setSelectedElementId("");
            setSelectedElementIds([]);
            setEditingElementId(null);
          }}
          onBeginDrag={beginDrag}
          onBeginResize={beginResize}
          onStartInlineEditing={startInlineEditing}
          onFinishInlineEditing={finishInlineEditing}
          updateElement={updateElement}
        />
        <PropertiesPanel
          selectedElement={selectedElement}
          updateElement={updateElement}
          moveLayer={moveLayer}
          alignToCanvas={alignSelectedToCanvas}
          duplicateSelected={duplicateSelected}
          deleteSelected={deleteSelected}
          canvasHeight={canvasHeight}
        />
      </div>

      {designCheckOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" onClick={() => setDesignCheckOpen(false)}>
          <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#181818] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-lg font-black">Design Check</p><p className="mt-1 text-sm text-white/55">{designCheckProblems ? `${designCheckProblems} item${designCheckProblems === 1 ? "" : "s"} to review before sharing.` : "Your flyer passes the current design checks."}</p></div><button type="button" onClick={() => setDesignCheckOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/60">Close</button></div>
            <div className="mt-5 space-y-2">
              {designChecks.map((check, index) => <div key={index} className={`flex items-start gap-3 rounded-xl border p-3 ${check.level === "error" ? "border-red-500/30 bg-red-500/10" : check.level === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}><span className="mt-0.5 text-sm font-black">{check.level === "error" ? "!" : check.level === "warning" ? "△" : "✓"}</span><span className="text-sm font-bold">{check.label}</span></div>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/40">Design Check is guidance, not a publishing block. Review warnings in context; intentional creative choices can still be exported.</p>
          </section>
        </div>
      )}

      {socialPackOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" onClick={() => setSocialPackOpen(false)}>
          <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#181818] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black">Create Social Pack</p>
                <p className="mt-1 text-sm text-white/55">Turn this flyer into a platform-ready version. Function Hour fits the layout; you can fine-tune each version before downloading.</p>
              </div>
              <button type="button" onClick={() => setSocialPackOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/60">Close</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {socialPackFormats.map((item) => (
                <button key={item.id} type="button" onClick={() => createSocialVersion(item.id)} className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-violet-400/60 hover:bg-violet-500/10">
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-xs text-white/45">{CANVAS_WIDTH * 3} × {item.height * 3} export</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/40">Tip: download each version after reviewing it. Switching formats uses the editor history, so Undo restores your prior layout.</p>
          </section>
        </div>
      )}

      {isErasing && backgroundImageUrl && (
        <BackgroundEraser
          imageUrl={backgroundImageUrl}
          onSave={uploadBackground}
          onClose={() => setIsErasing(false)}
        />
      )}
    </main>
  );
}
