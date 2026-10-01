import { auth, currentUser } from "@clerk/nextjs/server";

const OPERATIONS_EMAIL = "operations@functionhour.com";

export async function hasFunctionHourAdminAccess() {
  const session = await auth();
  if (!session.userId) return false;

  const user = await currentUser();
  return user?.id === session.userId && user.emailAddresses.some(
    (email) => email.verification?.status === "verified" &&
      email.emailAddress.trim().toLowerCase() === OPERATIONS_EMAIL,
  );
}
