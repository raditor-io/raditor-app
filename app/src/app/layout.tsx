import type { Metadata } from "next";
import { Shrikhand, Sora } from "next/font/google";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sora",
});

const shrikhand = Shrikhand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shrikhand",
});

export const metadata: Metadata = {
  title: "Raditor",
  description:
    "Raditor is an agentic CMS. Editor agents watch for signals and propose content updates you review and ship.",
  robots: { index: false },
  // Declared here rather than via app/icon.* file conventions: the exported
  // favicon set ships fixed sizes plus a manifest whose icon srcs are
  // root-relative, so every file lives at the public root and is linked
  // explicitly (same approach as the landing site).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${shrikhand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
