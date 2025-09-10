// components/ShellLayout.tsx
"use client";

import React, { useState } from "react";
import { ActionSheet } from "@/components/actions/ActionSheet";
import { TopNav } from "@/components/nav/TopNav";
import { BottomNav } from "@/components/nav/BottomNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    // Use design tokens from globals.css so the light theme drives colors
    <div className="min-h-screen bg-background text-foreground">
      <TopNav onOpenActions={() => setActionsOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10">
        {children}
      </main>

      <BottomNav onOpenActions={() => setActionsOpen(true)} />
      <ActionSheet open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
