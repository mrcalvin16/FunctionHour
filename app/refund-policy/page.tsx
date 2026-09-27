import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How ticket refund requests are handled on Function Hour.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Purchases"
      title="Refund Policy"
      summary="Event organizers set the refund terms for their events. Review the policy shown on the event page and during checkout before purchasing."
      sections={[
        {
          title: "Organizer-specific policies",
          content: (
            <p>
              Tickets are subject to the refund terms presented for the specific
              event at the time of purchase. Unless required by law or stated
              otherwise at checkout, a purchase is not automatically refundable
              because a purchaser can no longer attend.
            </p>
          ),
        },
        {
          title: "Requesting a refund",
          content: (
            <p>
              Use the contact method provided for the event or contact Function Hour
              support with your order information. We may route the request to the
              organizer for a decision. Submitting a request does not guarantee
              approval.
            </p>
          ),
        },
        {
          title: "Canceled, postponed, or changed events",
          content: (
            <p>
              If an event is canceled, postponed, or materially changed, the
              organizer is responsible for communicating the available options.
              Refund eligibility depends on the event policy, the circumstances, and
              applicable law.
            </p>
          ),
        },
        {
          title: "Fees and processing",
          content: (
            <p>
              Any approved amount, treatment of platform or payment-processing fees,
              and processing timing will be disclosed with the refund decision.
              Banks and card issuers may require additional time to post an approved
              refund.
            </p>
          ),
        },
        {
          title: "Special purchase types",
          content: (
            <p>
              Complimentary tickets have no cash refund value. Merchandise,
              add-ons, transferred tickets, manual orders, and promotional purchases
              may have separate terms displayed at purchase or supplied by the
              organizer.
            </p>
          ),
        },
        {
          title: "Chargebacks",
          content: (
            <p>
              Contact support before disputing a charge so we can investigate the
              purchase and event status. We may provide transaction and admission
              records to the payment provider when responding to a dispute.
            </p>
          ),
        },
      ]}
    />
  );
}
