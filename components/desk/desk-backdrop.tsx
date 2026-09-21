import type { ReactNode } from "react";

export function DeskBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="desk-shell relative isolate min-h-screen overflow-hidden">
      <div aria-hidden className="desk-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="desk-glow pointer-events-none absolute inset-0" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
