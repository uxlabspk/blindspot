import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blindspot — find local businesses with no website | lead finder",
  description:
    "Blindspot is a free lead finder for web agencies: enter a niche and a location to get every local business without a website, with phone, WhatsApp and email, saved searches, CSV export and AI outreach drafts.",
  keywords: [
    "lead finder",
    "businesses without websites",
    "web design leads",
    "local business leads",
    "cold outreach list",
    "OpenStreetMap leads",
  ],
  openGraph: {
    title: "Blindspot — find local businesses with no website",
    description:
      "Search any niche and location, get every business without a website plus their contact details, and draft the outreach in one click.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
