import type { ReactNode } from "react";

export default function ToolPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-violet-700">
        {title}
      </p>
      {children}
    </section>
  );
}
