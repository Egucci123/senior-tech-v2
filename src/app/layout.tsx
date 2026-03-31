import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Senior Tech - HVAC Diagnostic Assistant",
  description:
    "AI-powered HVAC diagnostic assistant for field technicians. Fault code lookup, PT charts, and real-time system diagnostics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <body className="bg-[#0e0e0e] dot-grid font-body text-on-surface antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
