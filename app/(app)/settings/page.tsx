"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { DisplayNameForm } from "@/components/auth/display-name-form";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {session?.user?.email ?? "…"}
        </p>
      </div>

      <DisplayNameForm
        initialName={session?.user?.displayName ?? ""}
        title="Display name"
        subtitle="Shown on the leaderboard and in the pool."
        submitLabel="Save"
        redirectTo="/settings"
      />

      {isAdmin ? (
        <Link
          href="/admin"
          className="flex h-12 w-full max-w-sm items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          Host admin
        </Link>
      ) : null}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex h-12 w-full max-w-sm items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface"
      >
        Sign out
      </button>
    </div>
  );
}
