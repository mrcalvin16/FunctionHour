import { notFound } from "next/navigation";
import OrganizerVerificationRequests from "@/components/admin/OrganizerVerificationRequests";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export default async function OrganizerVerificationPage() {
  if (!(await hasFunctionHourAdminAccess())) {
    notFound();
  }

  return <OrganizerVerificationRequests />;
}
