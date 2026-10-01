import faq from "../content/support-faq.json" with { type: "json" };

export type SupportCategory = "ticket_help" | "refund" | "report_event" | "payment" | "merch" | "account" | "other";

export const supportCategories: { value: SupportCategory; label: string }[] = [
  { value: "ticket_help", label: "Ticket help" },
  { value: "refund", label: "Refund or cancellation" },
  { value: "report_event", label: "Report an event or organizer" },
  { value: "payment", label: "Payment or charge" },
  { value: "merch", label: "Merchandise" },
  { value: "account", label: "Account access" },
  { value: "other", label: "Something else" },
];

type Answer = { text: string; links: { label: string; href: string }[]; requestHelp: boolean };

export function answerSupportQuestion(question: string): Answer {
  const text = question.toLowerCase();
  if (/refund|cancel|return/.test(text)) return faq.refund;
  if (/report|unsafe|fraud|scam|organizer|venue/.test(text)) return faq.report;
  if (/merch|shipping|pickup|shirt/.test(text)) return faq.merch;
  if (/pay|charge|card|billing/.test(text)) return faq.payment;
  if (/ticket|qr|pass|entry|receipt|order/.test(text)) return faq.ticket;
  if (/sign|account|log in|password/.test(text)) return faq.account;
  if (/event|concert|show|party|tonight|weekend|near|map/.test(text)) return faq.discovery;
  return faq.general;
}
