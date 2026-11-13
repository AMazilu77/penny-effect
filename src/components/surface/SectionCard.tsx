// Deprecated: use Card + CardHeader from @/components/ui/Card. Kept until
// every page is moved over (UI pass, PR 2).
import React from "react";
import { Card, CardHeader } from "@/components/ui/Card";

export function SectionCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} as="h3" />
      <div>{children}</div>
    </Card>
  );
}
