import { auth, currentUser } from "@clerk/nextjs/server";

const OPERATIONS_EMAIL = "operations@functionhour.com";

function getAllowedAdminIds() {
  return new Set(
    (process.env.SUPPORT_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function hasFunctionHourAdminAccess() {
  const session = await auth();
  if (!session.userId) return false;
  if (getAllowedAdminIds().has(session.userId)) return true;

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;
  return user?.id === session.userId &&
    primaryEmail?.verification?.status === "verified" &&
    primaryEmail.emailAddress.trim().toLowerCase() === OPERATIONS_EMAIL;
}
