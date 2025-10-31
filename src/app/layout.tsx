// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import ShellLayout from "@/components/ShellLayout";

export const metadata: Metadata = {
  title: "Penny Effect",
  description: "Micro-donations that add up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
