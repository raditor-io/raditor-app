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
    "Raditor is an agentic CMS. Editor agents watch your sources for signals and propose content updates you review and ship.",
  robots: { index: false },
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
