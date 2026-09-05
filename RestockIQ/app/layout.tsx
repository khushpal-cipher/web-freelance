import type { Metadata } from "next";
import { Poppins, Lora } from "next/font/google";
import "./globals.css";

const heading = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const body = Lora({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "RestockIQ — Reorder point dashboard",
  description:
    "D2C inventory dashboard that computes reorder points from sales velocity so brands avoid stockouts and dead stock.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
