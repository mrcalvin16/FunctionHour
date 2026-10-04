import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

const roleNames: Record<string, string> = {
  admin: "Admin",
  ticket_manager: "Ticket Manager",
  check_in_staff: "Check-In Staff",
  marketing: "Marketing",
  viewer: "Viewer",
};

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) return NextResponse.json({ error: "Invitation email is not configured." }, { status: 500 });

    const body = await request.json() as { eventId?: string; memberId?: string };
    if (!body.eventId || !body.memberId)
      return NextResponse.json({ error: "Event and invitation are required." }, { status: 400 });

    const invitation = await getConvexClient().query(api.eventAccess.getInvitationEmailDetails, {
      serverSecret,
      eventId: body.eventId as Id<"events">,
      memberId: body.memberId as Id<"eventTeamMembers">,
      clerkId: user.id,
    });
    if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const workspaceUrl = new URL(`/host/events/${invitation.eventId}`, appUrl).toString();
    const name = invitation.name ? `Hi ${invitation.name},` : "Hello,";
    const role = roleNames[invitation.role] || "Event team member";
    const eventName = escapeEmailHtml(invitation.eventName);
    const safeName = escapeEmailHtml(name);
    const safeRole = escapeEmailHtml(role);

    await sendTransactionalEmail({
      to: invitation.email,
      subject: `You’re invited to help with ${invitation.eventName}`,
      idempotencyKey: `event-team-invite-${invitation.memberId}-${invitation.updatedAt}`,
      text: `${name}\n\nYou’ve been invited as ${role} for ${invitation.eventName} on Function Hour. Open the event workspace: ${workspaceUrl}\n\nSign in using ${invitation.email}. Access is tied to this exact email address. If you weren’t expecting this invitation, you can ignore this message.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;color:#7c3aed">FUNCTION HOUR</p><h1 style="font-size:28px;line-height:1.2">You’re invited to an event team</h1><p>${safeName}</p><p>You’ve been invited as <strong>${safeRole}</strong> for <strong>${eventName}</strong>.</p><p style="margin:28px 0"><a href="${workspaceUrl}" style="background:#7c3aed;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">Open event workspace</a></p><p style="font-size:13px;color:#555">Sign in using <strong>${escapeEmailHtml(invitation.email)}</strong>. Access is tied to this exact email address. If you weren’t expecting this invitation, you can ignore this message.</p></div>`,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Event team invitation email error:", error);
    return NextResponse.json({
      error: error instanceof Error && error.message === "Transactional email is not configured."
        ? error.message
        : "Unable to deliver the invitation email.",
    }, { status: 500 });
  }
}
