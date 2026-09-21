"use client";

import { DisplayNameForm } from "@/components/auth/display-name-form";
import { useT } from "@/components/i18n/locale-provider";
import type { CoupleOption } from "@/lib/couple";

export function OnboardingClient({ couples }: { couples: CoupleOption[] }) {
  const t = useT();

  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-12">
      <DisplayNameForm
        className="mx-auto w-full max-w-sm"
        title={t("auth.onboardingTitle")}
        subtitle={t("auth.onboardingSubtitle")}
        submitLabel={t("auth.continue")}
        redirectTo="/"
        couples={couples}
      />
    </div>
  );
}
