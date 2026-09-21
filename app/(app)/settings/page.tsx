"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { DisplayNameForm } from "@/components/auth/display-name-form";
import { LocalePicker } from "@/components/i18n/locale-picker";
import { useT } from "@/components/i18n/locale-provider";
import { ThemePicker } from "@/components/theme/theme-picker";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const displayName = session?.user?.displayName ?? "";
  const t = useT();

  return (
    <div className="w-full md:mx-auto md:max-w-lg">
      <div className="space-y-8 md:rounded-2xl md:border md:border-border md:bg-surface/80 md:p-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("settings.signedInAs", {
              email: session?.user?.email ?? "…",
            })}
          </p>
        </div>

        <LocalePicker />

        <ThemePicker />

        {status === "loading" ? (
          <p className="text-sm text-muted">{t("settings.loading")}</p>
        ) : (
          <DisplayNameForm
            key={displayName || "empty"}
            initialName={displayName}
            title={t("settings.displayNameTitle")}
            subtitle={t("settings.displayNameSubtitle")}
            submitLabel={t("settings.save")}
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
              {t("settings.hostAdmin")}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            {t("settings.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
