import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldDispatch — Travel-Aware Job Scheduling",
  description:
    "Job scheduler for field-service teams that checks travel time between jobs, not just the clock.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
