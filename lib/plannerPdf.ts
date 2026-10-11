export function downloadBudgetPdf(input: {
  event: string; ticketPrice: number; expectedTickets: number;
  items: Array<{ name: string; type: string; amount: number; notes?: string }>;
}) {
  const currency = (amount: number) => "$" + amount.toFixed(2);
  const projectedTickets = input.ticketPrice * input.expectedTickets;
  const otherIncome = input.items.filter(i => i.type === "income").reduce((n, i) => n + i.amount, 0);
  const expenses = input.items.filter(i => i.type === "expense").reduce((n, i) => n + i.amount, 0);
  const lines = [
    "FUNCTION HOUR  /  EVENT BUDGET",
    input.event,
    "Prepared " + new Date().toLocaleString("en-US"),
    "",
    "Ticket projection",
    "Average ticket price: " + currency(input.ticketPrice),
    "Expected tickets: " + input.expectedTickets,
    "Projected ticket income: " + currency(projectedTickets),
    "Other income: " + currency(otherIncome),
    "Planned expenses: " + currency(expenses),
    "Estimated balance: " + currency(projectedTickets + otherIncome - expenses),
    "",
    "Budget items",
    ...input.items.map(i => (i.type === "income" ? "+ " : "- ") + i.name +
      (i.notes ? " (" + i.notes + ")" : "") + "  " + currency(i.amount)),
    "",
    "Planning estimates only. Excludes payment fees, taxes, refunds and adjustments.",
    "This is not a payout balance or a tax statement.",
  ];
  // A small text PDF, with pages split before text runs past the page edge.
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objects: string[] = [];
  function add(body: string) { objects.push(body); return objects.length; }
  const catalog = add("");
  const pageTree = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const commands = ["BT", "/F1 11 Tf", "50 748 Td", "15 TL"];
    for (const line of pageLines) {
      const ascii = line.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?")
        .slice(0, 98).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
      commands.push("(" + ascii + ") Tj", "T*");
    }
    commands.push("ET");
    const stream = commands.join("\n") + "\n";
    const content = add("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
    pageIds.push(add("<< /Type /Page /Parent " + pageTree + " 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 " + font + " 0 R >> >> /Contents " + content + " 0 R >>"));
  }
  objects[catalog - 1] = "<< /Type /Catalog /Pages " + pageTree + " 0 R >>";
  objects[pageTree - 1] = "<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + body + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "functionhour-budget-" + new Date().toISOString().slice(0,10) + ".pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
