import { redirect } from "next/navigation";

export default function LegacyOrdersPage() {
  redirect("/my-tickets?view=history");
}
