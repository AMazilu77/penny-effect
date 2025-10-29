"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, PlusCircle, Search } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "./TopNav.module.css";

export function TopNav({ onOpenActions }: { onOpenActions: () => void }) {
  const pathname = usePathname();
  const { status } = useSession(); // 'loading' | 'authenticated' | 'unauthenticated'
  const isActive = (p: string) => pathname === p;

  const handleAuthClick = () => {
    if (status === "authenticated") signOut({ callbackUrl: "/" });
    else signIn();
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Brand / Home link */}
        <Link href="/feed" className={styles.brand}>
          Penny Effect
        </Link>


        {/* Brand / Home link */}
        <Link href="/about" className={styles.brand}>
          About
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
          {/* Show Donate only when logged in */}
          {status === "authenticated" && (
            <button
              onClick={onOpenActions}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <PlusCircle className="h-4 w-4" />
              Donate / Action
            </button>
          )}

          {/* Show notifications only when logged in */}
          {status === "authenticated" && (
            <Link
              href="/inbox"
              className={`${styles.iconBtn} ${
                isActive("/inbox") ? styles.active : ""
              }`}
              aria-label="Inbox"
            >
              <Bell className="h-5 w-5" />
            </Link>
          )}

          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnOutline} ${
              isActive("/dashboard") ? styles.active : ""
            }`}
          >
            Dashboard
          </Link>

          {/* Login / Logout toggle */}
          <button
            onClick={handleAuthClick}
            className={`${styles.btn} ${styles.btnOutline}`}
          >
            {status === "authenticated" ? "Logout" : "Login"}
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
