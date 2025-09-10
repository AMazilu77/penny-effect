"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, PlusCircle, Search } from "lucide-react";
import { signOut } from "next-auth/react"; // 👈 import
import styles from "./TopNav.module.css";

export function TopNav({ onOpenActions }: { onOpenActions: () => void }) {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/feed" className={styles.brand}>
          Penny Effect
        </Link>

        {/* Desktop center search */}
        <div className={styles.center}>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search causes, orgs, posts…"
            />
          </div>
        </div>

        {/* Desktop right actions */}
        <div className={styles.actions}>
          <button
            onClick={onOpenActions}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <PlusCircle className="h-4 w-4" />
            Donate / Action
          </button>

          <Link
            href="/inbox"
            className={`${styles.iconBtn} ${isActive("/inbox") ? styles.active : ""}`}
            aria-label="Inbox"
          >
            <Bell className="h-5 w-5" />
          </Link>

          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnOutline} ${isActive("/dashboard") ? styles.active : ""}`}
          >
            Dashboard
          </Link>

          {/* 👇 New logout button */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`${styles.btn} ${styles.btnOutline}`}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className={styles.mobile}>
        <div className={styles.mobileRow}>
          <Search className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search causes, orgs, posts…"
          />
        </div>
      </div>
    </header>
  );
}
