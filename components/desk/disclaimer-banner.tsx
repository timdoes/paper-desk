import { PAPER_DISCLAIMER } from "@/lib/constants";

/** Site-persistent Legal copy. Document flow — not viewport-sticky and not dismissible. */
export function DisclaimerBanner() {
  return (
    <aside
      role="note"
      aria-label="Paper trading disclaimer"
      className="border-b border-emerald-400/30 bg-[#06140e] text-emerald-100"
    >
      <p className="mx-auto max-w-[1400px] px-4 py-1.5 text-center font-mono text-[11px] leading-4 tracking-[0.01em] text-emerald-100/90 sm:px-6 sm:py-2.5 sm:text-xs sm:leading-5">
        {PAPER_DISCLAIMER}
      </p>
    </aside>
  );
}
