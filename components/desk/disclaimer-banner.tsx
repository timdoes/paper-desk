import { PAPER_DISCLAIMER } from "@/lib/constants";

export function DisclaimerBanner() {
  return (
    <aside
      role="note"
      aria-label="Paper trading disclaimer"
      className="sticky top-0 z-50 border-b border-emerald-400/30 bg-[#06140e]/95 text-emerald-100 shadow-[0_12px_40px_-20px_rgba(16,185,129,0.55)] backdrop-blur-md"
    >
      <p className="mx-auto max-w-[1400px] px-5 py-2.5 text-center font-mono text-[11px] leading-5 tracking-[0.01em] text-emerald-100/90 sm:px-6 sm:text-xs">
        {PAPER_DISCLAIMER}
      </p>
    </aside>
  );
}
