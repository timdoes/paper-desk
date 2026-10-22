import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  DESK_OWNER,
  OPD_DESK_NAME,
  OPD_HOST,
  OPD_PAPER_DISCLAIMER,
} from "@/lib/constants";

const description = `${DESK_OWNER} · ${OPD_DESK_NAME}. ${OPD_PAPER_DISCLAIMER}`;

export const metadata: Metadata = {
  metadataBase: new URL(`https://${OPD_HOST}`),
  title: OPD_DESK_NAME,
  description,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function OptionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
