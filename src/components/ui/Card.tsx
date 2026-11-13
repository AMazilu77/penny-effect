// The one panel component. Surfaces stack page -> card -> inset, each a
// visibly different shade with a 3:1 border, so sections separate clearly.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children?: ReactNode;
  className?: string;
  /** "card" sits on the page; "inset" sits inside a card (tiles, nested lists). */
  level?: "card" | "inset";
  as?: "section" | "div" | "article" | "li";
  /** For in-page links, e.g. /dashboard#give. */
  id?: string;
};

export function Card({ children, className, level = "card", as: Tag = "section", id }: CardProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "border",
        level === "card" ? "rounded-card bg-card p-(--space-card) shadow-sm" : "rounded-control bg-inset p-4",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <Heading className="text-lg font-semibold">{title}</Heading>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
