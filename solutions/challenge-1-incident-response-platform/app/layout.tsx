import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Room | Incident Command Center",
  description: "Operational incident response and root cause analysis workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
