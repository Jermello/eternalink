import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const frank = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EternaLink — Digital memorials with Psalm 119",
  description:
    "A respectful digital memorial linked to a physical QR plaque. Each page reads the verses of Psalm 119 that match the deceased's Hebrew name.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${frank.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[color:var(--color-bg)] text-[color:var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}
