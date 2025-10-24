import type { Metadata } from "next";
import "./globals.css";
import ShellLayout from "@/components/ShellLayout";

// 👇 New: client-side provider wrapper
import Providers from "../components/Providers";

export const metadata: Metadata = {
  title: "Penny Effect",
  description: "Micro-donations that add up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {/* Wrap your whole app in <SessionProvider> */}
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
