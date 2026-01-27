import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Taka - Testing Companion",
  description: "Your testing companion for vibe-coded apps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
