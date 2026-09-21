"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { DisplayNameForm } from "@/components/auth/display-name-form";
import { ThemePicker } from "@/components/theme/theme-picker";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const displayName = session?.user?.displayName ?? "";

  return (
    <div className="w-full md:mx-auto md:max-w-lg">
      <div className="space-y-8 md:rounded-2xl md:border md:border-border md:bg-surface/80 md:p-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {session?.user?.email ?? "…"}
          </p>
        </div>

        <ThemePicker />

        {status === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <DisplayNameForm
            key={displayName || "empty"}
            initialName={displayName}
            title="Display name"
            subtitle="Shown on the leaderboard and in the pool."
            submitLabel="Save"
            redirectTo="/settings"
            className="w-full"
            headingLevel={2}
            hideFieldLabel
          />
        )}

        <div className="space-y-3 border-t border-border pt-6">
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Host admin
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
