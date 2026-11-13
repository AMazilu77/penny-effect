"use client";
// The admin area's tabs, with the current one marked.
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/organizations", label: "Organizations", exact: false },
  { href: "/admin/organizations/import", label: "Import from Every.org", exact: true },
  { href: "/admin/news", label: "News", exact: false },
  { href: "/admin/guide/verify", label: "How to verify", exact: true },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : (pathname === href || pathname.startsWith(`${href}/`)) && pathname !== "/admin/organizations/import";
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {NAV.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-control border px-3 py-1.5 text-sm font-semibold ${
              active ? "border-primary bg-primary text-on-primary" : "bg-card text-fg hover:bg-inset"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
