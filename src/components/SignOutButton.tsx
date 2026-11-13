"use client";
import { signOut } from "next-auth/react";
import { buttonSecondary } from "@/components/ui/buttons";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={buttonSecondary}
    >
      Sign out
    </button>
  );
}