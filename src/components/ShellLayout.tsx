// components/ShellLayout.tsx
// The page frame: top bar, content, and the mobile bottom bar.
import React from "react";
import { TopNav } from "@/components/nav/TopNav";
import { BottomNav } from "@/components/nav/BottomNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page text-fg">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
