import type { Metadata } from "next";
import { Poppins, Lora } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "IntakeEngine — client onboarding that runs itself",
  description:
    "A conditional-logic client onboarding flow with e-signature and automatic account provisioning. Manual onboarding delays cash and drops clients — IntakeEngine doesn't.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${lora.variable}`}>
      <body className="font-body min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
