import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Function Hour",
  description: "How Function Hour collects, uses, and protects information.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains what information Function Hour collects, why we use it, and the choices available to attendees and organizers."
      sections={[
        {
          title: "Information we collect",
          content: (
            <>
              <p>
                We may collect account and contact information, event and ticket
                details, purchase and payout records, check-in activity, messages,
                uploaded content, device information, and product usage data.
              </p>
              <p>
                Payment-card information is processed by our payment provider. We
                receive transaction details but do not intentionally store complete
                card numbers.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <p>
              We use information to operate accounts, process ticket transactions
              and organizer payouts, deliver tickets, support check-in, communicate
              service updates, prevent fraud, troubleshoot problems, improve the
              platform, and meet legal obligations.
            </p>
          ),
        },
        {
          title: "Organizers and event operations",
          content: (
            <p>
              When you register for an event, the organizer receives information
              needed to manage that event, such as your name, ticket type, and
              check-in status. Organizers are responsible for how they use
              information outside Function Hour.
            </p>
          ),
        },
        {
          title: "AI-powered features",
          content: (
            <p>
              When an authorized organizer uses AI Organizer or Flyer Studio,
              prompts and relevant event information may be sent to external AI
              service providers to generate the requested result. Authorized event
              questions may include relevant guest information, including VIP guest
              names. Do not submit sensitive information that is unnecessary for the
              request.
            </p>
          ),
        },
        {
          title: "Service providers",
          content: (
            <p>
              We use providers that support identity, hosting, databases, payments,
              analytics, communications, and AI features. These may include Clerk,
              Convex, Stripe, Vercel, OpenAI, and an external image-generation
              provider. They process information under their applicable terms and
              privacy commitments.
            </p>
          ),
        },
        {
          title: "Retention and security",
          content: (
            <p>
              We retain information for as long as reasonably necessary to provide
              the service, maintain transaction records, resolve disputes, enforce
              agreements, and meet legal requirements. We use reasonable safeguards,
              but no internet service can guarantee absolute security.
            </p>
          ),
        },
        {
          title: "Your choices",
          content: (
            <>
              <p>
                Use Manage Cookie Preferences in the site footer to turn off
                optional event-view analytics, or choose Do Not Sell or Share My
                Personal Information. The choice is saved in this browser and stops
                future event-view analytics from this browser. It does not remove
                activity already recorded or change essential account, ticketing,
                payment, fraud-prevention, or security processing.
              </p>
              <p>
                You may also request access to, correction of, or deletion of
                applicable personal information by contacting us. We may need to
                verify your identity, and some records may be retained where legally
                or operationally required.
              </p>
            </>
          ),
        },
        {
          title: "Children and policy updates",
          content: (
            <p>
              Function Hour is not directed to children under 13. We may update this
              policy as the platform changes and will post the revised effective
              date on this page.
            </p>
          ),
        },
      ]}
    />
  );
}
