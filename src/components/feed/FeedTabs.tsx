"use client";
// The feed's tabs. Clicking one remembers it in a cookie, so the feed opens
// on it next time (unless it's empty then; see chooseFeedView in
// src/lib/feed.ts). The cookie holds only the tab's name.
import Link from "next/link";
import { FEED_VIEW_COOKIE, FEED_VIEW_COOKIE_MAX_AGE, type FeedView } from "@/lib/feed";
import { chip } from "@/components/ui/buttons";

export type FeedTab = { view: FeedView; label: string; href: string };

function remember(view: FeedView) {
  document.cookie = `${FEED_VIEW_COOKIE}=${view}; Path=/feed; Max-Age=${FEED_VIEW_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function FeedTabs({ tabs, current }: { tabs: readonly FeedTab[]; current: FeedView }) {
  return (
    <nav aria-label="Feed views" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          href={tab.href}
          onClick={() => remember(tab.view)}
          className={chip(tab.view === current)}
          aria-current={tab.view === current ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
