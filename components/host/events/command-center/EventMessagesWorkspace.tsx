"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  CircleAlert,
  Globe2,
  Mail,
  MessageSquareText,
  PencilLine,
  Send,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useEventCommandCenter } from "./EventCommandCenter";

type MessageChannel = "event_page" | "email";
type MessageAudience =
  | "all"
  | "checked_in"
  | "not_checked_in"
  | "vip";

export default function EventMessagesWorkspace() {
  const { event, capabilities } = useEventCommandCenter();
  const canManageMarketing = capabilities.includes(
    "manage_marketing"
  );
  const workspace = useQuery(
    api.eventMessages.getWorkspace,
    canManageMarketing ? { eventId: event._id } : "skip"
  );
  const saveMessage = useMutation(
    api.eventMessages.saveMessage
  );
  const archiveMessage = useMutation(
    api.eventMessages.archiveMessage
  );
  const [editingId, setEditingId] =
    useState<Id<"eventMessages"> | null>(null);
  const [channel, setChannel] =
    useState<MessageChannel>("event_page");
  const [audience, setAudience] =
    useState<MessageAudience>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const messages = useMemo(
    () => workspace?.messages ?? [],
    [workspace?.messages]
  );
  const selectedAudience = workspace?.audiences.find(
    (item) => item.key === audience
  );

  if (!canManageMarketing) {
    return (
      <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/90 p-7 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-orange-300" />
        <h2 className="mt-4 text-xl font-black">
          Messaging access required
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Ask an event owner or admin for marketing access to manage event communications.
        </p>
      </section>
    );
  }

  function resetComposer() {
    setEditingId(null);
    setChannel("event_page");
    setAudience("all");
    setSubject("");
    setBody("");
  }

  function editDraft(message: Doc<"eventMessages">) {
    setEditingId(message._id);
    setChannel(message.channel);
    setAudience(message.audience);
    setSubject(message.subject);
    setBody(message.body);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(publish: boolean) {
    try {
      setPending(true);
      setFeedback(null);
      const result = await saveMessage({
        messageId: editingId ?? undefined,
        eventId: event._id,
        subject,
        body,
        channel,
        audience:
          channel === "event_page" ? "all" : audience,
        publish,
      });

      setFeedback({
        tone: "success",
        message:
          result.status === "published"
            ? "Event update published."
            : "Message draft saved.",
      });
      resetComposer();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The message could not be saved.",
      });
    } finally {
      setPending(false);
    }
  }

  async function archive(id: Id<"eventMessages">) {
    try {
      setPending(true);
      setFeedback(null);
      await archiveMessage({ id });
      if (editingId === id) {
        resetComposer();
      }
      setFeedback({
        tone: "success",
        message: "Message archived.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The message could not be archived.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
          Guest communications
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          Event messages
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Publish event-page updates now and prepare targeted email campaigns for {event.name}.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(workspace?.audiences ?? []).map((item) => (
          <AudienceCard
            key={item.key}
            label={item.label}
            count={item.count}
            emailReachable={item.emailReachable}
          />
        ))}
        {workspace === undefined
          ? [1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[116px] animate-pulse rounded-[1.5rem] bg-white/[0.035]"
              />
            ))
          : null}
      </section>

      {workspace?.isAudienceLimited ? (
        <Notice tone="warning">
          Audience estimates reached the reporting limit. Use a narrower export before connecting a delivery provider.
        </Notice>
      ) : null}

      {feedback ? (
        <Notice tone={feedback.tone}>
          {feedback.message}
        </Notice>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">
                Composer
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                {editingId ? "Edit message draft" : "Create an update"}
              </h3>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={resetComposer}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-black text-zinc-500 transition hover:text-white"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ChannelButton
              active={channel === "event_page"}
              icon={Globe2}
              title="Event page"
              detail="Publish a visible guest update"
              onClick={() => {
                setChannel("event_page");
                setAudience("all");
              }}
            />
            <ChannelButton
              active={channel === "email"}
              icon={Mail}
              title="Email draft"
              detail="Prepare for provider delivery"
              onClick={() => setChannel("email")}
            />
          </div>

          {channel === "email" ? (
            <div className="mt-5">
              <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                Audience
              </label>
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(
                    event.target.value as MessageAudience
                  )
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#171421] px-4 text-sm font-bold text-white outline-none focus:border-violet-300"
              >
                {(workspace?.audiences ?? []).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label} · {item.emailReachable} reachable emails
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[10px] leading-5 text-amber-200">
                Email delivery is not connected. This campaign will remain a draft for {selectedAudience?.emailReachable ?? 0} reachable recipients.
              </p>
            </div>
          ) : null}

          <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
            Subject
          </label>
          <input
            value={subject}
            maxLength={120}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Important update for your guests"
            className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#171421] px-4 text-sm font-bold text-white outline-none placeholder:text-zinc-400 focus:border-violet-300"
          />

          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
              Message
            </label>
            <span className="text-[9px] font-bold tabular-nums text-zinc-400">
              {body.length.toLocaleString()} / 2,000
            </span>
          </div>
          <textarea
            value={body}
            maxLength={2_000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share schedule, venue, entry, or weather details..."
            className="mt-2 min-h-44 w-full resize-y rounded-xl border border-white/20 bg-[#171421] p-4 text-sm leading-6 text-white outline-none placeholder:text-zinc-400 focus:border-violet-300"
          />

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(false)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-5 text-xs font-black text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              <PencilLine className="h-4 w-4" />
              Save draft
            </button>
            {channel === "event_page" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black shadow-[0_0_26px_rgba(124,58,237,0.22)] transition hover:scale-[1.01] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Publish update
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
            Communications log
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
            Saved messages
          </h3>

          {workspace === undefined ? (
            <div className="mt-6 space-y-3 animate-pulse">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-white/[0.035]"
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/[0.09] px-5 py-12 text-center">
              <MessageSquareText className="mx-auto h-7 w-7 text-zinc-700" />
              <p className="mt-4 text-sm font-bold text-zinc-400">
                No messages yet
              </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
                Published updates and campaign drafts will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {messages.map((message) => (
                <MessageCard
                  key={message._id}
                  message={message}
                  pending={pending}
                  onEdit={editDraft}
                  onArchive={archive}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AudienceCard({
  label,
  count,
  emailReachable,
}: {
  label: string;
  count: number;
  emailReachable: number;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/90 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-white">
            {count.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] font-bold text-zinc-400">
            {emailReachable.toLocaleString()} reachable emails
          </p>
        </div>
        <Users className="h-4 w-4 text-violet-300" />
      </div>
    </article>
  );
}

function ChannelButton({
  active,
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: typeof Globe2;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-violet-400/25 bg-violet-400/[0.09]"
          : "border-white/[0.08] bg-white/[0.025] hover:border-white/15"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${
        active ? "text-violet-200" : "text-zinc-400"
        }`}
      />
      <p className="mt-3 text-xs font-black text-zinc-200">
        {title}
      </p>
      <p className="mt-1 text-[10px] font-bold text-zinc-400">
        {detail}
      </p>
    </button>
  );
}

function MessageCard({
  message,
  pending,
  onEdit,
  onArchive,
}: {
  message: Doc<"eventMessages">;
  pending: boolean;
  onEdit: (message: Doc<"eventMessages">) => void;
  onArchive: (id: Id<"eventMessages">) => Promise<void>;
}) {
  const statusClasses = {
    draft:
      "border-zinc-400/15 bg-zinc-400/[0.07] text-zinc-400",
    published:
      "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-200",
    archived:
      "border-orange-400/15 bg-orange-400/[0.08] text-orange-200",
  };

  return (
    <article className="rounded-2xl border border-white/[0.07] bg-black/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-zinc-200">
            {message.subject}
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-400">
            {message.channel === "event_page"
              ? "Event page"
              : "Email"}{" "}
            · {formatMessageDate(message.updatedAt)}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${statusClasses[message.status]}`}
        >
          {message.status}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-zinc-300">
        {message.body}
      </p>

      {message.status !== "archived" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.status === "draft" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onEdit(message)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/[0.14] px-3 text-[9px] font-black text-zinc-300 transition hover:text-white disabled:opacity-40"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit draft
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => onArchive(message._id)}
            className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg border border-orange-400/20 bg-orange-400/[0.06] px-3 text-[9px] font-black text-orange-200 transition hover:text-orange-100 disabled:opacity-40"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const classes = {
    success:
      "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-100/80",
    error:
      "border-red-400/15 bg-red-400/[0.07] text-red-100/80",
    warning:
      "border-amber-400/15 bg-amber-400/[0.07] text-amber-100/80",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-5 ${classes[tone]}`}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function formatMessageDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
