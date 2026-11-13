// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import ShellLayout from "@/components/ShellLayout";
import { BRAND_NAME } from "@/lib/brand";

// Icons: src/app/favicon.ico, icon.png and apple-icon.png are picked up by
// Next automatically. Regenerate them with `pnpm icons` (README → "Logo and icons").
export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Micro-donations that add up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
