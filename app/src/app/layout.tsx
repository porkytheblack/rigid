import type { Metadata } from "next";
import { AppShell } from "@/components/layout";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Rigid - Build Rigid Systems",
  description: "Explore, document and deliver apps you did not write",
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
