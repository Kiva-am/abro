import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Debal | Verified Ethiopian Housing & Roommates",
  description: "Find verified rooms, homes, and compatible roommates across Ethiopia.",
  icons: { icon: "/Debal-logo.jpg", shortcut: "/Debal-logo.jpg" },
  openGraph: {
    title: "Debal | Find a place. Find your people.",
    description: "Verified rooms, homes, and compatible roommates across Ethiopia.",
    images: ["https://abro-homes.teshomeabebe224.chatgpt.site/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Debal | Find a place. Find your people.",
    description: "Verified rooms, homes, and compatible roommates across Ethiopia.",
    images: ["https://abro-homes.teshomeabebe224.chatgpt.site/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${manrope.variable} ${newsreader.variable}`}>{children}</body></html>;
}
