import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import OrganizerVerificationRequests from "@/components/admin/OrganizerVerificationRequests";

function getAllowedAdminIds() {
  return new Set(
    (process.env.SUPPORT_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export const dynamic = "force-dynamic";

export default async function OrganizerVerificationPage() {
  const session = await auth();
  if (!session.userId || !getAllowedAdminIds().has(session.userId)) {
    notFound();
  }

  return <OrganizerVerificationRequests />;
}
