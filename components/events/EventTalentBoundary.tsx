"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import EventTalent from "./EventTalent";

type Props = { eventId: Id<"events">; canManage: boolean };
type State = { failed: boolean };

export default class EventTalentBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Event talent failed to load; the event page remains available.", error, info);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.canManage ? (
        <section role="status" className="mt-5 rounded-2xl border border-orange-300/30 bg-orange-50 p-4 text-sm text-zinc-900">
          The event lineup is temporarily unavailable. Event details and ticketing remain accessible.
        </section>
      ) : null;
    }
    return <EventTalent eventId={this.props.eventId} canManage={this.props.canManage} />;
  }
}
