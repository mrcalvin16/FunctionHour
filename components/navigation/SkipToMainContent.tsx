"use client";

import type { MouseEvent } from "react";

export default function SkipToMainContent() {
  function skipNavigation(event: MouseEvent<HTMLAnchorElement>) {
    const content = document.getElementById("main-content");
    const target =
      content?.querySelector<HTMLElement>("[data-main-content]") ??
      content?.querySelector<HTMLElement>("main h1, [role='main'] h1") ??
      content?.querySelector<HTMLElement>("main h2, [role='main'] h2") ??
      content?.querySelector<HTMLElement>("main, [role='main']") ??
      content;

    if (!target) return;
    event.preventDefault();

    // Headings can receive programmatic focus without adding a Tab stop.
    // Restore an existing tabindex unchanged when focus leaves the target.
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: "auto" });
  }

  return (
    <a className="skip-link" href="#main-content" onClick={skipNavigation}>
      Skip to main content
    </a>
  );
}
