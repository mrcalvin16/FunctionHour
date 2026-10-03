import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  ticket_manager: "Ticket Manager",
  check_in_staff: "Check-In Staff",
  marketing: "Marketing",
  viewer: "Viewer",
};

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!user || !email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const memberId = body?.memberId;
    const requestId = body?.requestId;
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (
      typeof memberId !== "string" ||
      typeof requestId !== "string" ||
      !/^[a-z0-9-]{16,80}$/i.test(requestId) ||
      !serverSecret
    ) {
      return NextResponse.json(
        { error: "Invitation email is not configured." },
        { status: 400 },
      );
    }

    const invitation = await getConvexClient().query(
      api.eventAccess.getInvitationEmailDetails,
      {
        serverSecret,
        clerkId: user.id,
        email,
        memberId: memberId as Id<"eventTeamMembers">,
      },
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const workspaceUrl = new URL(`/host/events/${invitation.eventId}`, appUrl).toString();
    const roleLabel = roleLabels[invitation.role] || "Event Staff";
    const recipientName = escapeEmailHtml(invitation.recipientName);
    const inviterName = escapeEmailHtml(invitation.inviterName);
    const eventName = escapeEmailHtml(invitation.eventName);
    const safeRole = escapeEmailHtml(roleLabel);

    await sendTransactionalEmail({
      to: invitation.recipientEmail,
      subject: `You’re invited to join ${invitation.eventName.replace(/[\\r\\n]/g, " ")} on Function Hour`,
      idempotencyKey: `event-team-invite-${invitation.memberId}-${requestId}`,
      text: `Hi ${invitation.recipientName},\\n\\n${invitation.inviterName} invited you to help with ${invitation.eventName} as ${roleLabel}.\\n\\nOpen the event workspace: ${workspaceUrl}\\n\\nSign in to Function Hour with ${invitation.recipientEmail} to access your assigned role.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;color:#7c3aed">FUNCTION HOUR</p><h1 style="font-size:28px;line-height:1.2">You’re invited to join the event team</h1><p>Hi ${recipientName},</p><p>${inviterName} invited you to help with <strong>${eventName}</strong>.</p><p>Your role: <strong>${safeRole}</strong></p><p style="margin:28px 0"><a href="${escapeEmailHtml(workspaceUrl)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">Open event workspace</a></p><p style="font-size:13px;color:#52525b">Sign in to Function Hour with ${escapeEmailHtml(invitation.recipientEmail)} to access your assigned role. If you weren’t expecting this invitation, you can ignore this email.</p></div>`,
    });

    return NextResponse.json({ delivered: true });
  } catch (error) {
    console.error("Event team invitation email error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Transactional email is not configured."
            ? error.message
            : "Unable to deliver the invitation email.",
      },
      { status: 500 },
    );
  }
}
