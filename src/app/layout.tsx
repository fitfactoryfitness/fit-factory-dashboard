import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit Factory Downtown — Performance Dashboard",
  description: "Internal office performance dashboard. Not for public distribution.",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-slate-100 antialiased">{children}</body>
    </html>
  );
}
