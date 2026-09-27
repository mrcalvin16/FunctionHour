import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Function Hour platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern your use of Function Hour as an attendee, purchaser, organizer, or event staff member."
      sections={[
        {
          title: "Using Function Hour",
          content: (
            <p>
              By accessing or using the platform, you agree to these terms. You must
              provide accurate information, protect your account, and use the
              platform only for lawful purposes. A person completing a transaction
              must be able to enter a binding agreement or act with permission from
              a parent or legal guardian.
            </p>
          ),
        },
        {
          title: "Our marketplace role",
          content: (
            <p>
              Function Hour provides technology that helps organizers publish and
              manage events and helps attendees discover and purchase tickets.
              Organizers control their event content, admission rules, scheduling,
              fulfillment, and organizer-specific policies. Unless expressly stated,
              Function Hour is not the event organizer or venue operator.
            </p>
          ),
        },
        {
          title: "Tickets, fees, and payments",
          content: (
            <p>
              Prices, fees, ticket limits, and material purchase terms are displayed
              during checkout. Payments and eligible payouts are handled through our
              payment provider. Tickets may not be copied, fraudulently transferred,
              resold unlawfully, or used to gain unauthorized admission.
            </p>
          ),
        },
        {
          title: "Organizer responsibilities",
          content: (
            <p>
              Organizers must have authority to offer their events and content,
              describe events accurately, honor valid tickets, comply with applicable
              laws, communicate material changes, and manage attendee requests under
              the policy presented for their event.
            </p>
          ),
        },
        {
          title: "Content and acceptable use",
          content: (
            <p>
              You retain ownership of content you submit and grant Function Hour the
              permission needed to host, display, format, and distribute it to operate
              and promote the service. You may not submit unlawful, deceptive,
              infringing, harmful, or unauthorized content or interfere with platform
              security or availability.
            </p>
          ),
        },
        {
          title: "Account and event enforcement",
          content: (
            <p>
              We may restrict content, events, transactions, or accounts when
              reasonably necessary to protect users, investigate suspected fraud,
              respond to legal requirements, or enforce these terms. Contact support
              if you believe an action was taken in error.
            </p>
          ),
        },
        {
          title: "Service availability and liability",
          content: (
            <p>
              The platform is provided on an “as available” basis. To the maximum
              extent permitted by law, Function Hour is not responsible for an
              organizer&apos;s event performance, venue conditions, attendee conduct,
              or indirect or consequential losses. Nothing in these terms limits a
              right or remedy that cannot legally be limited.
            </p>
          ),
        },
        {
          title: "Changes and contact",
          content: (
            <p>
              We may update these terms as the service changes. The effective date
              above identifies the current version. Continued use after an update
              means you accept the revised terms to the extent permitted by law.
            </p>
          ),
        },
      ]}
    />
  );
}
