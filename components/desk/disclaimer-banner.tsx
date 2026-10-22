import { headers } from "next/headers";
import {
  OPD_PAPER_DISCLAIMER,
  OPD_REQUEST_DESK_HEADER,
  PAPER_DISCLAIMER,
} from "@/lib/constants";

/** Site-persistent Legal copy. Document flow — not viewport-sticky and not dismissible. */
export async function DisclaimerBanner() {
  const headerList = await headers();
  const isOpd = headerList.get(OPD_REQUEST_DESK_HEADER) === "1";
  const copy = isOpd ? OPD_PAPER_DISCLAIMER : PAPER_DISCLAIMER;

  return (
    <aside
      role="note"
      aria-label="Paper trading disclaimer"
      className="border-b border-emerald-400/30 bg-[#06140e] text-emerald-100"
    >
      <p className="mx-auto max-w-[1400px] px-4 py-1.5 text-center font-mono text-[11px] leading-4 tracking-[0.01em] text-emerald-100/90 sm:px-6 sm:py-2.5 sm:text-xs sm:leading-5">
        {copy}
      </p>
    </aside>
  );
}
