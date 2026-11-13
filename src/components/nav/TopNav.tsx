"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Search, Shield } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "./TopNav.module.css";

export function TopNav({ onOpenActions }: { onOpenActions: () => void }) {
  const pathname = usePathname();
  const { data: session, status } = useSession(); // status: 'loading' | 'authenticated' | 'unauthenticated'
  // Only a convenience link: /admin itself checks the role in the database.
  const isAdmin = session?.user?.role === "ADMIN";
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
          {/* Searches the verified directory on /discover. */}
          <form action="/discover" method="get" role="search" className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <input
              name="q"
              aria-label="Search organizations"
              className={styles.searchInput}
              placeholder="Search organizations…"
              maxLength={100}
            />
          </form>
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

          {/* Inbox is hidden until real partner receipts exist (Milestone 3). */}

          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnOutline} ${
              isActive("/dashboard") ? styles.active : ""
            }`}
          >
            Dashboard
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={`${styles.btn} ${styles.btnOutline} ${pathname.startsWith("/admin") ? styles.active : ""}`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}

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
        <form action="/discover" method="get" role="search" className={styles.mobileRow}>
          <Search className={styles.searchIcon} />
          <input
            name="q"
            aria-label="Search organizations"
            className={styles.searchInput}
            placeholder="Search organizations…"
            maxLength={100}
          />
        </form>
      </div>
    </header>
  );
}
