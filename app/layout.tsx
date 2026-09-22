import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DESK_NAME, DESK_OWNER } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = `${DESK_OWNER} · $10,000 / 30-day Alpaca Paper maximize-ROI desk. Paper trading only.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://botmarket.timdoes.com"),
  title: DESK_NAME,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: DESK_NAME,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: DESK_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: DESK_NAME,
    description,
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
