"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function HostProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  const profile = useQuery(
    api.organizers.getMyOrganizerProfile,
    isLoaded && isSignedIn ? {} : "skip"
  );

  const generateUploadUrl = useMutation(
    api.organizers.generateOrganizerUploadUrl
  );

  const updateProfile = useMutation(api.organizers.updateMyOrganizerProfile);

  const requestVerification = useMutation(
    api.organizers.requestOrganizerVerification
  );

  const [organizerName, setOrganizerName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile) return;

    setOrganizerName(profile.organizerName ?? profile.name ?? "");
    setBio(profile.bio ?? "");
    setWebsite(profile.website ?? "");
    setInstagram(profile.instagram ?? "");
  }, [profile]);

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl();

    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!result.ok) {
      throw new Error("Upload failed.");
    }

    const json = await result.json();

    return json.storageId as Id<"_storage">;
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      let avatarStorageId: Id<"_storage"> | undefined;
      let bannerStorageId: Id<"_storage"> | undefined;

      if (avatarFile) {
        avatarStorageId = await uploadFile(avatarFile);
      }

      if (bannerFile) {
        bannerStorageId = await uploadFile(bannerFile);
      }

      await updateProfile({
        organizerName,
        bio,
        website,
        instagram,
        ...(avatarStorageId ? { avatarStorageId } : {}),
        ...(bannerStorageId ? { bannerStorageId } : {}),
      });

      setAvatarFile(null);
      setBannerFile(null);
      setMessage("Organizer profile saved.");
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerificationRequest() {
    try {
      await requestVerification({});
      const organizerNameForEmail =
        profile?.organizerName ?? profile?.name ?? organizerName ?? "Organizer";
      const profileUrl = profile?.userId
        ? "https://functionhour.com/organizers/" + profile.userId
        : "Please include the link to your public organizer profile.";
      const emailBody = [
        "Hello Function Hour Operations,",
        "",
        "I would like to request verification for my host profile and review for the blue verified check.",
        "",
        "Organizer name: " + organizerNameForEmail,
        "Account email: " + (user?.primaryEmailAddress?.emailAddress ?? "Please add the email for this account"),
        "Profile: " + profileUrl,
        "Website: " + (profile?.website || website || "Not provided"),
        "Instagram: " + (profile?.instagram || instagram || "Not provided"),
        "",
        "I understand the badge is added only after Operations reviews and approves the request.",
      ].join("\n");
      const subject = encodeURIComponent("Host verification request — " + organizerNameForEmail);
      window.location.href = "mailto:operations@functionhour.com?subject=" + subject + "&body=" + encodeURIComponent(emailBody);
      setMessage("Your request is recorded. Send the prepared email to Operations to complete the review request.");
    } catch (error) {
      console.error(error);
      setMessage("We couldn't record the request. Please email operations@functionhour.com with your organizer profile link.");
    }
  }
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 sm:px-6 sm:py-10 text-white">
        Loading...
        <div className="h-10 sm:hidden" />
    </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 sm:px-6 sm:py-10 text-white">
        Please sign in to edit your organizer profile.
        <div className="h-10 sm:hidden" />
    </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-18%] top-[-10%] h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute right-[-18%] top-[18%] h-[420px] w-[420px] rounded-full bg-violet-500/15 blur-[120px]" />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">
            Organizer Settings
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
              <p className="mt-2 max-w-2xl text-white/60">
                Add your organizer photo, banner, bio, and social links.
              </p>
            </div>

            <Link
              href="/events"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Events
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] sm:rounded-3xl border border-white/10 bg-white/[0.03]">
          <div
            className="h-48 bg-cover bg-center bg-white/10"
            style={{
              backgroundImage: profile?.bannerUrl
                ? `url(${profile.bannerUrl})`
                : "linear-gradient(135deg, #18181b, #3f3f46)",
            }}
          />

          <div className="px-6 pb-8">
            <div className="-mt-12 flex flex-col gap-4 sm:p-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-3xl border border-white/20 bg-zinc-900 text-2xl sm:text-3xl font-bold">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Organizer avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    organizerName?.charAt(0)?.toUpperCase() || "O"
                  )}
                </div>

                <div className="pb-2">
                  <h2 className="text-2xl font-bold">
                    {organizerName || "Organizer Name"}
                  </h2>
                  <p className="text-sm text-white/50">
                    Public organizer profile preview
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>

                {!profile?.isVerifiedOrganizer && (
                  <button
                    onClick={() => void handleVerificationRequest()}
                    className="rounded-xl border border-orange-500 px-5 py-3 font-semibold text-orange-400 hover:bg-orange-500/10"
                  >
                    {profile?.verificationRequested
                      ? "Email Operations — request pending"
                      : "Request blue check"}
                  </button>
                )}
              </div>
            </div>

            {message && <p className="mt-5 text-sm text-white/70">{message}</p>}
            {!profile?.isVerifiedOrganizer && (
              <p className="mt-4 text-sm leading-6 text-white/60">
                Request a blue verified check by emailing Operations. Your badge appears on your public profile only after approval.
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:p-6 md:grid-cols-1 lg:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-white/70">
                  Avatar / Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  Banner Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white/70">
                  Organizer Name
                </label>
                <input
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="Function Hour Events"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white/70">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about your events, crowd, or brand..."
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  Website
                </label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  Instagram
                </label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@functionhour"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-10 sm:hidden" />
    </main>
  );
}